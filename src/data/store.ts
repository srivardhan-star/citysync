// ============================================================
// CitySync — Data Store (LocalStorage-backed)
// ============================================================

import type { AppState, Project, Review, AppNotification, Conflict, UserRole, IssueReport, IssueReportStatus, ResolutionCategory, ConflictChangeRecord, LedgerEntry, LedgerProjectRecord } from '../types';
import { SEED_PROJECTS, SEED_REVIEWS, SEED_NOTIFICATIONS, SEED_ISSUE_REPORTS, SEED_LEDGER_ENTRIES } from './seedData';
import { detectConflicts, syncConflicts } from '../utils/conflictDetection';
import { generateId, generateComplaintReference } from '../utils';

const STORAGE_KEY = 'citysync_v4';
const DATA_VERSION = 4;

function createInitialState(): AppState {
  const conflicts = detectConflicts(SEED_PROJECTS);
  return {
    projects: SEED_PROJECTS,
    conflicts,
    notifications: SEED_NOTIFICATIONS,
    reviews: SEED_REVIEWS,
    issueReports: SEED_ISSUE_REPORTS,
    ledgerEntries: SEED_LEDGER_ENTRIES,
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
    if (!parsed.issueReports) {
      parsed.issueReports = SEED_ISSUE_REPORTS;
    } else {
      parsed.issueReports = parsed.issueReports.map((r, idx) => {
        if (!r.referenceNumber) {
          const suffix = (r.id.replace(/[^a-zA-Z0-9]/g, '') + String(idx)).slice(-6).toUpperCase().padStart(6, 'X');
          return {
            ...r,
            referenceNumber: `CS-2026-${suffix}`,
            updatedAt: r.updatedAt || r.submittedAt,
          };
        }
        return r;
      });
    }
    if (!parsed.ledgerEntries) parsed.ledgerEntries = SEED_LEDGER_ENTRIES;
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
  const conflicts = syncConflicts(state.conflicts, newProjects);
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
    .filter((c) => !c.resolved && !state.conflicts.some((existing) => existing.id === c.id))
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
  const conflicts = syncConflicts(state.conflicts, newProjects);

  // Detect new conflicts for notifications
  const existingActiveConflictIds = new Set(
    state.conflicts.filter((c) => !c.resolved).map((c) => c.id)
  );
  const newConflicts = conflicts.filter((c) => !c.resolved && !existingActiveConflictIds.has(c.id));
  const resolvedConflictIds = state.conflicts
    .filter((c) => !c.resolved && !conflicts.some((nc) => !nc.resolved && nc.id === c.id))
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
  const conflicts = syncConflicts(state.conflicts, newProjects);
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
  resolutionLabel: string,
  category: ResolutionCategory = 'sequential_delay',
  justification?: string,
  citizenExplanation?: string
): AppState {
  let newProjects = [...state.projects];
  const targetConflict = state.conflicts.find((c) => c.id === conflictId);
  const changesApplied: ConflictChangeRecord[] = [];

  for (const change of changes) {
    newProjects = newProjects.map((p) => {
      if (p.id !== change.projectId) return p;
      const prevVal = p[change.field] ?? p.plannedEndDate;
      changesApplied.push({
        projectId: p.id,
        field: change.field,
        previousValue: prevVal,
        newValue: change.newValue,
      });

      const fieldLabel = change.field === 'startDate' ? 'Start date' : 'Revised end date';
      const reasonPart = justification ? ` Justification: ${justification}` : '';
      const actEntry = {
        id: generateId('act'),
        timestamp: new Date().toISOString(),
        type: 'resolution_applied' as const,
        description: `Schedule updated via conflict resolution: "${resolutionLabel}". ${fieldLabel} changed from ${prevVal} to ${change.newValue}.${reasonPart}`,
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

  // Preserve the resolved conflict record with full metadata
  const resolvedConflict: Conflict = targetConflict
    ? {
        ...targetConflict,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionApplied: resolutionLabel,
        resolutionCategory: category,
        justification: justification || `Schedule adjusted to eliminate excavation overlap: "${resolutionLabel}".`,
        citizenExplanation: citizenExplanation || `Project dates rescheduled to prevent concurrent road disruption on this segment.`,
        changesApplied: changesApplied.length > 0 ? changesApplied : targetConflict.changesApplied,
      }
    : {
        id: conflictId,
        projectIds: (changes.length >= 2 ? [changes[0].projectId, changes[1].projectId] : ['PRJ-006', 'PRJ-007']) as [string, string],
        reason: 'same_segment_overlap',
        description: `Conflict resolved via "${resolutionLabel}".`,
        publicDisruption: 'Schedule coordinated to eliminate disruption.',
        detectedAt: new Date().toISOString(),
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionApplied: resolutionLabel,
        resolutionCategory: category,
        justification: justification || `Schedule adjusted to eliminate excavation overlap: "${resolutionLabel}".`,
        citizenExplanation: citizenExplanation || `Project dates rescheduled to prevent concurrent road disruption on this segment.`,
        changesApplied,
      };

  const conflictsWithResolved = state.conflicts.map((c) =>
    c.id === conflictId ? resolvedConflict : c
  );
  if (!conflictsWithResolved.some((c) => c.id === conflictId)) {
    conflictsWithResolved.push(resolvedConflict);
  }

  const nextConflicts = syncConflicts(conflictsWithResolved, newProjects);

  const resolvedNotif: AppNotification = {
    id: generateId('notif'),
    type: 'conflict_resolved',
    message: `Resolution applied: "${resolutionLabel}". Conflict on segment ${
      resolvedConflict.segmentId || 'the segment'
    } resolved.`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  // ── Record Confirmed Decision in Public Accountability Ledger ──
  const involvedProjectIds = Array.from(
    new Set([
      ...(targetConflict?.projectIds || []),
      ...changes.map((c) => c.projectId),
    ])
  );

  const ledgerProjectImpacts = involvedProjectIds
    .map((pId) => {
      const origProj = state.projects.find((p) => p.id === pId);
      const updatedProj = newProjects.find((p) => p.id === pId);
      if (!origProj) return null;

      const origEnd = origProj.revisedEndDate || origProj.plannedEndDate;
      const revEnd = updatedProj?.revisedEndDate || updatedProj?.plannedEndDate || origEnd;
      const projChanges = changesApplied.filter((ca) => ca.projectId === pId);

      return {
        projectId: origProj.id,
        projectTitle: origProj.title,
        department: origProj.department,
        segmentId: origProj.segmentId,
        location: origProj.location,
        originalStartDate: origProj.startDate,
        originalEndDate: origEnd,
        revisedStartDate: updatedProj?.startDate || origProj.startDate,
        revisedEndDate: revEnd,
        scheduleConfidence: 'confirmed' as const,
        changes: projChanges,
      };
    })
    .filter(Boolean) as LedgerProjectRecord[];

  const segmentId =
    resolvedConflict.segmentId ||
    ledgerProjectImpacts[0]?.segmentId ||
    'SEG-CHENNAI';

  const location =
    ledgerProjectImpacts[0]?.location ||
    'Chennai Infrastructure Corridor';

  const defaultJustification = `Schedule adjusted to eliminate excavation overlap: "${resolutionLabel}".`;
  const defaultCitizenExplanation = `Project dates rescheduled to prevent concurrent road disruption on this segment.`;

  const ledgerEntry: LedgerEntry = {
    id: generateId('ledger'),
    timestamp: new Date().toISOString(),
    conflictId,
    title: resolutionLabel,
    resolutionCategory: category,
    segmentId,
    location,
    projects: ledgerProjectImpacts,
    reason: resolutionLabel,
    coordinatorJustification: justification || defaultJustification,
    citizenExplanation: citizenExplanation || defaultCitizenExplanation,
    performedBy: 'Greater Chennai Municipal Coordination Cell (Demo)',
    isDemonstrationRecord: false,
  };

  const nextLedger = [ledgerEntry, ...(state.ledgerEntries || [])];

  const nextState: AppState = {
    ...state,
    projects: newProjects,
    conflicts: nextConflicts,
    notifications: [resolvedNotif, ...state.notifications],
    ledgerEntries: nextLedger,
  };
  saveState(nextState);
  return nextState;
}

export function addLedgerEntry(state: AppState, entry: LedgerEntry): AppState {
  const nextState: AppState = {
    ...state,
    ledgerEntries: [entry, ...(state.ledgerEntries || [])],
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
  const existingRefs = (state.issueReports || [])
    .map((r) => r.referenceNumber)
    .filter(Boolean) as string[];
  const referenceNumber = report.referenceNumber || generateComplaintReference(existingRefs);
  const now = new Date().toISOString();

  const finalReport: IssueReport = {
    ...report,
    referenceNumber,
    submittedAt: report.submittedAt || now,
    updatedAt: report.updatedAt || now,
  };

  const notif: AppNotification = {
    id: generateId('notif'),
    type: 'general',
    message: `Citizen issue reported [${referenceNumber}]: "${finalReport.title}" on project "${project ? project.title : finalReport.projectId}".`,
    projectId: finalReport.projectId,
    read: false,
    createdAt: now,
  };

  const nextState: AppState = {
    ...state,
    issueReports: [finalReport, ...state.issueReports],
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
  const now = new Date().toISOString();
  const nextReports = state.issueReports.map((r) =>
    r.id === reportId
      ? {
          ...r,
          status,
          officialResponse: officialResponse !== undefined ? officialResponse : r.officialResponse,
          updatedAt: now,
        }
      : r
  );

  const target = state.issueReports.find((r) => r.id === reportId);
  const statusLabels: Record<IssueReportStatus, string> = {
    open: 'Open',
    under_review: 'Under Municipal Review',
    resolved: 'Resolved',
  };

  const refTag = target?.referenceNumber ? `[${target.referenceNumber}] ` : '';
  const notif: AppNotification = {
    id: generateId('notif'),
    type: 'general',
    message: `Issue report ${refTag}"${target ? target.title : reportId}" updated to ${statusLabels[status]}.`,
    projectId: target?.projectId,
    read: false,
    createdAt: now,
  };

  const nextState: AppState = {
    ...state,
    issueReports: nextReports,
    notifications: [notif, ...state.notifications],
  };
  saveState(nextState);
  return nextState;
}

