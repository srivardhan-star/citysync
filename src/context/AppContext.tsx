// ============================================================
// CivicTrack — App Context with Dual Perspective (Gov / Public)
// ============================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { AppState, Project, Review, AppNotification, UserRole, IssueReport, IssueReportStatus, ResolutionCategory, LedgerEntry } from '../types';
import {
  loadState,
  resetToSeedData,
  addProject,
  updateProject,
  deleteProject,
  addReview,
  markNotificationRead,
  markAllNotificationsRead,
  applyResolution,
  addLedgerEntry as storeAddLedgerEntry,
  setUserRole as storeSetUserRole,
  addIssueReport as storeAddIssueReport,
  updateIssueReportStatus as storeUpdateIssueReportStatus,
} from '../data/store';

// ── Actions ───────────────────────────────────────────────────

type Action =
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; project: Project }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'ADD_REVIEW'; review: Review }
  | { type: 'MARK_NOTIFICATION_READ'; notifId: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | {
      type: 'APPLY_RESOLUTION';
      conflictId: string;
      changes: { projectId: string; field: 'startDate' | 'revisedEndDate'; newValue: string }[];
      label: string;
      category?: ResolutionCategory;
      justification?: string;
      citizenExplanation?: string;
    }
  | { type: 'ADD_LEDGER_ENTRY'; entry: LedgerEntry }
  | { type: 'SET_USER_ROLE'; role: UserRole }
  | { type: 'ADD_ISSUE_REPORT'; report: IssueReport }
  | { type: 'UPDATE_ISSUE_REPORT_STATUS'; reportId: string; status: IssueReportStatus; officialResponse?: string }
  | { type: 'RESET_DATA' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PROJECT':
      // Security safeguard: Public cannot add official projects
      if (state.userRole === 'public') {
        console.warn('Public users cannot create official projects.');
        return state;
      }
      return addProject(state, action.project);
    case 'UPDATE_PROJECT':
      // Security safeguard: Public cannot edit official projects
      if (state.userRole === 'public') {
        console.warn('Public users cannot edit official projects.');
        return state;
      }
      return updateProject(state, action.project);
    case 'DELETE_PROJECT':
      if (state.userRole === 'public') return state;
      return deleteProject(state, action.projectId);
    case 'ADD_REVIEW':
      return addReview(state, action.review);
    case 'MARK_NOTIFICATION_READ':
      return markNotificationRead(state, action.notifId);
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return markAllNotificationsRead(state);
    case 'APPLY_RESOLUTION':
      if (state.userRole === 'public') {
        console.warn('Public users cannot apply conflict resolutions.');
        return state;
      }
      return applyResolution(
        state,
        action.conflictId,
        action.changes,
        action.label,
        action.category,
        action.justification,
        action.citizenExplanation
      );
    case 'ADD_LEDGER_ENTRY':
      if (state.userRole === 'public') {
        console.warn('Public users cannot add ledger entries directly.');
        return state;
      }
      return storeAddLedgerEntry(state, action.entry);
    case 'SET_USER_ROLE':
      return storeSetUserRole(state, action.role);
    case 'ADD_ISSUE_REPORT':
      return storeAddIssueReport(state, action.report);
    case 'UPDATE_ISSUE_REPORT_STATUS':
      if (state.userRole === 'public') {
        console.warn('Public users cannot alter official issue report status.');
        return state;
      }
      return storeUpdateIssueReportStatus(state, action.reportId, action.status, action.officialResponse);
    case 'RESET_DATA':
      return resetToSeedData();
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  userRole: UserRole;
  isGovernment: boolean;
  isPublic: boolean;
  setUserRole: (role: UserRole) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addReview: (review: Review) => void;
  addIssueReport: (report: IssueReport) => void;
  addLedgerEntry: (entry: LedgerEntry) => void;
  updateIssueReportStatus: (reportId: string, status: IssueReportStatus, officialResponse?: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  applyResolution: (
    conflictId: string,
    changes: { projectId: string; field: 'startDate' | 'revisedEndDate'; newValue: string }[],
    label: string,
    category?: ResolutionCategory,
    justification?: string,
    citizenExplanation?: string
  ) => void;
  resetData: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const userRole = state.userRole || 'government';
  const isGovernment = userRole === 'government';
  const isPublic = userRole === 'public';

  const ctxValue: AppContextValue = {
    state,
    unreadCount,
    userRole,
    isGovernment,
    isPublic,
    setUserRole: useCallback((role: UserRole) => dispatch({ type: 'SET_USER_ROLE', role }), []),
    addProject: useCallback((project) => dispatch({ type: 'ADD_PROJECT', project }), []),
    updateProject: useCallback((project) => dispatch({ type: 'UPDATE_PROJECT', project }), []),
    deleteProject: useCallback((projectId) => dispatch({ type: 'DELETE_PROJECT', projectId }), []),
    addReview: useCallback((review) => dispatch({ type: 'ADD_REVIEW', review }), []),
    addIssueReport: useCallback((report) => dispatch({ type: 'ADD_ISSUE_REPORT', report }), []),
    addLedgerEntry: useCallback((entry) => dispatch({ type: 'ADD_LEDGER_ENTRY', entry }), []),
    updateIssueReportStatus: useCallback((reportId, status, officialResponse) =>
      dispatch({ type: 'UPDATE_ISSUE_REPORT_STATUS', reportId, status, officialResponse }), []),
    markNotificationRead: useCallback((notifId) => dispatch({ type: 'MARK_NOTIFICATION_READ', notifId }), []),
    markAllNotificationsRead: useCallback(() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' }), []),
    applyResolution: useCallback(
      (conflictId, changes, label, category, justification, citizenExplanation) =>
        dispatch({
          type: 'APPLY_RESOLUTION',
          conflictId,
          changes,
          label,
          category,
          justification,
          citizenExplanation,
        }),
      []
    ),
    resetData: useCallback(() => dispatch({ type: 'RESET_DATA' }), []),
  };

  return <AppContext.Provider value={ctxValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
