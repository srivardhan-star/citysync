// ============================================================
// CivicTrack — Core TypeScript Types
// ============================================================

export type ProjectCategory =
  | 'road_repair'
  | 'drainage'
  | 'water_pipeline'
  | 'electrical'
  | 'other';

export type ProjectStatus =
  | 'planned'
  | 'ongoing'
  | 'delayed'
  | 'completed'
  | 'emergency';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationType =
  | 'new_project'
  | 'emergency'
  | 'milestone_complete'
  | 'deadline_changed'
  | 'delay_reported'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'approaching_start'
  | 'general';

export type ConflictReason =
  | 'same_segment_overlap'
  | 'same_segment_adjacent'
  | 'incompatible_work_types'
  | 'dependency_violation';

// Priority scoring inputs (each rated 0–5)
export interface PriorityInputs {
  publicSafety: number;       // 30%
  essentialService: number;   // 25%
  dependencyImpact: number;   // 20%
  urgency: number;            // 15%
  publicDisruption: number;   // 10%
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  plannedDate: string; // ISO date string
  completed: boolean;
  actualDate?: string;
  notes?: string;
}

export interface DelayRecord {
  id: string;
  submittedAt: string;
  reason: string;
  notes?: string;
  originalDate: string;
  revisedDate: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  type:
    | 'created'
    | 'status_changed'
    | 'milestone_completed'
    | 'delay_recorded'
    | 'progress_updated'
    | 'conflict_noted'
    | 'resolution_applied'
    | 'deadline_changed'
    | 'general';
  description: string;
  performedBy?: string;
}

export interface Review {
  id: string;
  projectId: string;
  rating: number; // 1–5
  comment: string;
  submittedAt: string;
  reviewerName: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  reason: string;
  department: string;
  contractorName: string;
  contractorContact: string;
  segmentId: string;        // Road/infrastructure segment ID for conflict detection
  location: string;
  neighborhood: string;
  startDate: string;
  plannedEndDate: string;   // Original — never overwritten silently
  revisedEndDate?: string;  // Set only when delay is formally recorded
  actualEndDate?: string;   // Set when project is marked complete
  status: ProjectStatus;
  progress: number;         // 0–100
  inconvenienceDescription: string;
  alternativeRoute?: string;
  priority: ProjectPriority;
  priorityInputs: PriorityInputs;
  priorityScore: number;    // Calculated 0–100
  isCriticalSafetyOverride: boolean;
  milestones: Milestone[];
  delayRecords: DelayRecord[];
  activityHistory: ActivityEntry[];
  bufferDays: number;       // Days after end date for conflict buffer
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  id: string;
  projectIds: [string, string];
  reason: ConflictReason;
  description: string;
  publicDisruption: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolutionApplied?: string;
}

export interface ConflictResolutionOption {
  id: string;
  label: string;
  description: string;
  changes: {
    projectId: string;
    field: 'startDate' | 'revisedEndDate';
    newValue: string;
  }[];
  addedDelayDays: number;
  disruptionScore: number;  // lower is better
  remainingConflicts: number;
  explanation: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
}

export type UserRole = 'government' | 'public';

export type IssueCategory =
  | 'safety_hazard'
  | 'excessive_noise'
  | 'access_blocked'
  | 'prolonged_inactivity'
  | 'water_power_leak'
  | 'other';

export type IssueReportStatus = 'open' | 'under_review' | 'resolved';

export interface IssueReport {
  id: string;
  projectId: string;
  category: IssueCategory;
  title: string;
  description: string;
  locationDetails?: string;
  status: IssueReportStatus;
  submittedAt: string;
  reporterName?: string;
  officialResponse?: string;
}

export interface AppState {
  projects: Project[];
  conflicts: Conflict[];
  notifications: AppNotification[];
  reviews: Review[];
  issueReports: IssueReport[];
  userRole: UserRole;
  dataVersion: number;
  lastSeeded: string;
}

