// ============================================================
// CivicTrack — Utility Functions
// ============================================================

import { differenceInDays, isAfter, isBefore, parseISO, isValid, format } from 'date-fns';
import type { Project, PriorityInputs, Milestone } from '../types';

// ── Date helpers ─────────────────────────────────────────────

export function safeParseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? d : null;
}

export function formatDate(dateStr: string | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  const d = safeParseDate(dateStr);
  if (!d) return '—';
  return format(d, fmt);
}

export function formatDateTime(dateStr: string | undefined): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm');
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Delay calculation ────────────────────────────────────────

export interface DelayResult {
  isDelayed: boolean;
  delayDays: number;
  isCompleted: boolean;
  comparisonLabel: string;
  explanation: string;
}

/**
 * Calculate delay for a project using deterministic rules.
 * - Completed: actual vs original planned
 * - Ongoing/Delayed: today vs original planned (only if past deadline)
 * - Never counts as delayed before original deadline
 */
export function calculateDelay(project: Project): DelayResult {
  const planned = safeParseDate(project.plannedEndDate);
  if (!planned) {
    return {
      isDelayed: false,
      delayDays: 0,
      isCompleted: project.status === 'completed',
      comparisonLabel: 'No planned date',
      explanation: 'No planned completion date recorded.',
    };
  }

  if (project.status === 'completed' && project.actualEndDate) {
    const actual = safeParseDate(project.actualEndDate);
    if (!actual) {
      return {
        isDelayed: false,
        delayDays: 0,
        isCompleted: true,
        comparisonLabel: 'Completed',
        explanation: 'Project completed. Actual date not parseable.',
      };
    }
    const days = differenceInDays(actual, planned);
    return {
      isDelayed: days > 0,
      delayDays: Math.max(0, days),
      isCompleted: true,
      comparisonLabel: days > 0 ? `${days} days late` : days < 0 ? `${Math.abs(days)} days early` : 'On time',
      explanation:
        days > 0
          ? `Completed ${days} days after the original planned date (${formatDate(project.plannedEndDate)}).`
          : days < 0
          ? `Completed ${Math.abs(days)} days ahead of the planned date.`
          : 'Completed exactly on the planned date.',
    };
  }

  // For unfinished projects — only delayed if past original deadline
  const refDate = new Date();
  if (isBefore(refDate, planned)) {
    return {
      isDelayed: false,
      delayDays: 0,
      isCompleted: false,
      comparisonLabel: `${differenceInDays(planned, refDate)} days remaining`,
      explanation: `Still within the planned timeline. Deadline: ${formatDate(project.plannedEndDate)}.`,
    };
  }

  const days = differenceInDays(refDate, planned);
  return {
    isDelayed: true,
    delayDays: days,
    isCompleted: false,
    comparisonLabel: `${days} days overdue`,
    explanation: `Project has exceeded its original planned completion date (${formatDate(project.plannedEndDate)}) by ${days} days.`,
  };
}

// ── Priority score ───────────────────────────────────────────

/**
 * Transparent priority score calculation.
 * Weights: Safety 30%, Essential 25%, Dependency 20%, Urgency 15%, Disruption 10%
 * Each input rated 0–5. Score = weighted sum / 5 * 100 (normalised to 0–100)
 */
export function calculatePriorityScore(inputs: PriorityInputs): number {
  const weighted =
    inputs.publicSafety * 30 +
    inputs.essentialService * 25 +
    inputs.dependencyImpact * 20 +
    inputs.urgency * 15 +
    inputs.publicDisruption * 10;
  return Math.round(weighted / 5);
}

// ── Milestone progress ───────────────────────────────────────

export function calculateMilestoneProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.completed).length;
  return Math.round((done / milestones.length) * 100);
}

// ── Conflict date overlap ────────────────────────────────────

/**
 * Returns true if two projects have overlapping work dates
 * (inclusive), considering buffer days.
 */
export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
  bufferA = 0,
  bufferB = 0
): boolean {
  const sA = safeParseDate(startA);
  const eA = safeParseDate(endA);
  const sB = safeParseDate(startB);
  const eB = safeParseDate(endB);
  if (!sA || !eA || !sB || !eB) return false;

  // Extend end dates by buffer
  const eABuf = new Date(eA);
  eABuf.setDate(eABuf.getDate() + bufferA);
  const eBBuf = new Date(eB);
  eBBuf.setDate(eBBuf.getDate() + bufferB);

  // A starts before or when B ends, AND A ends after or when B starts
  return !isAfter(sA, eBBuf) && !isBefore(eABuf, sB);
}

// ── ID generation ─────────────────────────────────────────────

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Status helpers ────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  delayed: 'Delayed',
  completed: 'Completed',
  emergency: 'Emergency',
};

export const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-amber-100 text-amber-800',
  delayed: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  emergency: 'bg-rose-100 text-rose-900 font-semibold',
};

export const CATEGORY_LABELS: Record<string, string> = {
  road_repair: 'Road Repair',
  drainage: 'Drainage',
  water_pipeline: 'Water Pipeline',
  electrical: 'Electrical',
  other: 'Other',
};

export const DEPARTMENT_LIST = [
  'Roads & Infrastructure',
  'Water & Sewerage',
  'Electrical & Power',
  'Urban Planning',
  'Drainage Authority',
  'Emergency Services',
  'Public Works',
];

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800 font-semibold',
};

// ── CSV Export ─────────────────────────────────────────────────

export function exportProjectsToCSV(projects: Project[]): void {
  const headers = [
    'ID', 'Title', 'Category', 'Status', 'Department', 'Location',
    'Start Date', 'Planned End', 'Revised End', 'Actual End',
    'Progress %', 'Contractor', 'Priority Score',
  ];
  const rows = projects.map((p) => [
    p.id, p.title, CATEGORY_LABELS[p.category] ?? p.category,
    STATUS_LABELS[p.status] ?? p.status, p.department,
    `${p.location}, ${p.neighborhood}`,
    p.startDate, p.plannedEndDate, p.revisedEndDate ?? '', p.actualEndDate ?? '',
    p.progress, p.contractorName, p.priorityScore,
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `civictrack-projects-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Pluralise ─────────────────────────────────────────────────

export function pluralise(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`;
}

// ── Clamp ─────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
