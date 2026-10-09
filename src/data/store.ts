// ============================================================
// CivicTrack — Data Store (LocalStorage-backed)
// ============================================================

import type { AppState, Project, Review, AppNotification, Conflict, UserRole, IssueReport, IssueReportStatus } from '../types';
import { SEED_PROJECTS, SEED_REVIEWS, SEED_NOTIFICATIONS, SEED_ISSUE_REPORTS } from './seedData';
import { detectConflicts } from '../utils/conflictDetection';
import { generateId } from '../utils';

const STORAGE_KEY = 'civictrack_v3';
const DATA_VERSION = 3;

function createInitialState(): AppState {
  const conflicts = detectConflicts(SEED_PROJECTS);
  return {
    projects: SEED_PROJECTS,
    conflicts,
    notifications: SEED_NOTIFICATIONS,
    reviews: SEED_REVIEWS,
    issueReports: SEED_ISSUE_REPORTS,
    userRole: 'government',
    dataVersion: DATA_VERSION,
    lastSeeded: new Date().toISOString(),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    // Version migration: if data version doesn't match, re-seed
    if (!parsed.dataVersion || parsed.dataVersion < DATA_VERSION) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }
    if (!parsed.issueReports) parsed.issueReports = SEED_ISSUE_REPORTS;
    if (!parsed.userRole) parsed.userRole = 'government';
    return parsed;
  } catch {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded or unavailable — continue without persistence
    console.warn('CivicTrack: Unable to persist state to localStorage.');
  }
}

export function resetToSeedData(): AppState {
  const initial = createInitialState();
  saveState(initial);
  return initial;
}

// ── Project operations ────────────────────────────────────────

export function addProject(state: AppState, project: Project): AppState {
  const newProjects = [...state.projects, project];
  const conflicts = detectConflicts(newProjects);
  const notification: AppNotification = {
    id: generateId('notif'),
    type: 'new_project',
    message: `New project announced: "${project.title}" in ${project.neighborhood}.`,
    projectId: project.id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const emergencyNotif: AppNotification | null =
    project.status === 'emergency'
      ? {
          id: generateId('notif'),
          type: 'emergency',
          message: `EMERGENCY: "${project.title}" — immediate action required.`,
          projectId: project.id,
          read: false,
          createdAt: new Date().toISOString(),
        }
      : null;

  const newConflictNotifs = conflicts
    .filter((c) => !state.conflicts.some((existing) => existing.id === c.id))
    .map((c): AppNotification => ({
      id: generateId('notif'),
      type: 'conflict_detected',
      message: `Scheduling conflict detected involving "${project.title}".`,
      projectId: project.id,
      read: false,
      createdAt: new Date().toISOString(),
    }));

  const nextState: AppState = {
    ...state,
    projects: newProjects,
    conflicts,
    notifications: [
      notification,
      ...(emergencyNotif ? [emergencyNotif] : []),
      ...newConflictNotifs,
      ...state.notifications,
    ],
  };
  saveState(nextState);
  return nextState;
}

export function updateProject(state: AppState, updated: Project): AppState {
  const newProjects = state.projects.map((p) => (p.id === updated.id ? updated : p));
  const conflicts = detectConflicts(newProjects);

  // Detect new conflicts for notifications
  const existingConflictIds = new Set(state.conflicts.map((c) => c.id));
  const newConflicts = conflicts.filter((c) => !existingConflictIds.has(c.id));
  const resolvedConflictIds = state.conflicts
    .filter((c) => !conflicts.some((nc) => nc.id === c.id))
    .map((c) => c.id);

  const conflictNotifs: AppNotification[] = [
    ...newConflicts.map((c): AppNotification => ({
      id: generateId('notif'),
      type: 'conflict_detected',
      message: `Scheduling conflict detected: "${updated.title}" overlaps with another project.`,
      projectId: updated.id,
      read: false,
      createdAt: new Date().toISOString(),
    })),
    ...resolvedConflictIds.map((): AppNotification => ({
      id: generateId('notif'),
      type: 'conflict_resolved',
      message: `A scheduling conflict involving "${updated.title}" has been resolved.`,
      projectId: updated.id,
      read: false,
      createdAt: new Date().toISOString(),
    })),
  ];

  const nextState: AppState = {
    ...state,
    projects: newProjects,
    conflicts,
    notifications: [...conflictNotifs, ...state.notifications],
  };
  saveState(nextState);
  return nextState;
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const newProjects = state.projects.filter((p) => p.id !== projectId);
  const conflicts = detectConflicts(newProjects);
  const nextState: AppState = {
    ...state,
    projects: newProjects,
    conflicts,
  };
  saveState(nextState);
  return nextState;
}

// ── Review operations ─────────────────────────────────────────

export function addReview(state: AppState, review: Review): AppState {
  const nextState: AppState = {
    ...state,
    reviews: [...state.reviews, review],
  };
  saveState(nextState);
  return nextState;
}

// ── Notification operations ────────────────────────────────────

export function markNotificationRead(state: AppState, notifId: string): AppState {
  const nextState: AppState = {
    ...state,
    notifications: state.notifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    ),
  };
  saveState(nextState);
  return nextState;
}

export function markAllNotificationsRead(state: AppState): AppState {
  const nextState: AppState = {
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  };
  saveState(nextState);
  return nextState;
}

// ── Conflict resolution ────────────────────────────────────────

export function applyResolution(
  state: AppState,
  conflictId: string,
  changes: { projectId: string; field: 'startDate' | 'revisedEndDate'; newValue: string }[],
  resolutionLabel: string
): AppState {
  let newProjects = [...state.projects];

  for (const change of changes) {
    newProjects = newProjects.map((p) => {
      if (p.id !== change.projectId) return p;
      const actEntry = {
        id: generateId('act'),
        timestamp: new Date().toISOString(),
        type: 'resolution_applied' as const,
        description: `Schedule updated via conflict resolution: "${resolutionLabel}". ${change.field === 'startDate' ? 'Start date' : 'Revised end date'} changed to ${change.newValue}.`,
        performedBy: 'Demo Coordinator',
      };
      return {
        ...p,
        [change.field]: change.newValue,
        activityHistory: [actEntry, ...p.activityHistory],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  const newConflicts = detectConflicts(newProjects);

  const resolvedNotif: AppNotification = {
    id: generateId('notif'),
    type: 'conflict_resolved',
    message: `Resolution applied: "${resolutionLabel}". Conflict schedule updated.`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const nextState: AppState = {
    ...state,
    projects: newProjects,
    conflicts: newConflicts,
    notifications: [resolvedNotif, ...state.notifications],
  };
  saveState(nextState);
  return nextState;
}

// ── Role operations ───────────────────────────────────────────

export function setUserRole(state: AppState, role: UserRole): AppState {
  const nextState: AppState = {
    ...state,
    userRole: role,
  };
  saveState(nextState);
  return nextState;
}

// ── Issue report operations ───────────────────────────────────

export function addIssueReport(state: AppState, report: IssueReport): AppState {
  const project = state.projects.find((p) => p.id === report.projectId);
  const notif: AppNotification = {
    id: generateId('notif'),
    type: 'general',
    message: `Citizen issue reported: "${report.title}" on project "${project ? project.title : report.projectId}".`,
    projectId: report.projectId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const nextState: AppState = {
    ...state,
    issueReports: [report, ...state.issueReports],
    notifications: [notif, ...state.notifications],
  };
  saveState(nextState);
  return nextState;
}

export function updateIssueReportStatus(
  state: AppState,
  reportId: string,
  status: IssueReportStatus,
  officialResponse?: string
): AppState {
  const nextReports = state.issueReports.map((r) =>
    r.id === reportId
      ? {
          ...r,
          status,
          officialResponse: officialResponse !== undefined ? officialResponse : r.officialResponse,
        }
      : r
  );

  const target = state.issueReports.find((r) => r.id === reportId);
  const statusLabels: Record<IssueReportStatus, string> = {
    open: 'Open',
    under_review: 'Under Municipal Review',
    resolved: 'Resolved',
  };

  const notif: AppNotification = {
    id: generateId('notif'),
    type: 'general',
    message: `Issue report "${target ? target.title : reportId}" updated to ${statusLabels[status]}.`,
    projectId: target?.projectId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const nextState: AppState = {
    ...state,
    issueReports: nextReports,
    notifications: [notif, ...state.notifications],
  };
  saveState(nextState);
  return nextState;
}

