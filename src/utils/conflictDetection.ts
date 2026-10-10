// ============================================================
// CivicTrack — Conflict Detection Algorithm
// ============================================================

import type { Project, Conflict, ConflictResolutionOption, ConflictReason } from '../types';
import { datesOverlap, generateId, formatDate } from '../utils';
import { addDays, differenceInDays, parseISO } from 'date-fns';

// Incompatible work type pairs (both must excavate the same segment)
const INCOMPATIBLE_PAIRS: [string, string][] = [
  ['road_repair', 'drainage'],
  ['road_repair', 'water_pipeline'],
  ['drainage', 'water_pipeline'],
  ['road_repair', 'electrical'],
];

function isIncompatiblePair(catA: string, catB: string): boolean {
  return INCOMPATIBLE_PAIRS.some(
    ([x, y]) => (x === catA && y === catB) || (x === catB && y === catA)
  );
}

// ── Stable Conflict Identifier ──────────────────────────────
export function getConflictId(projectAId: string, projectBId: string, segmentId: string): string {
  const sortedIds = [projectAId, projectBId].sort().join('-');
  const cleanSegment = segmentId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return `conf-${sortedIds}-${cleanSegment}`;
}

// ── Timezone-Safe Calendar Arithmetic ────────────────────────
export function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2] + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetweenDateStr(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const p1 = startStr.split('T')[0].split('-').map(Number);
  const p2 = endStr.split('T')[0].split('-').map(Number);
  if (p1.length < 3 || p2.length < 3) return 0;
  const utc1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
  const utc2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function getProjectEndDate(p: Project): string {
  return p.revisedEndDate ?? p.plannedEndDate;
}

function conflictReason(a: Project, b: Project): ConflictReason {
  if (isIncompatiblePair(a.category, b.category)) return 'incompatible_work_types';
  return 'same_segment_overlap';
}

function conflictDescription(a: Project, b: Project, reason: ConflictReason): string {
  if (reason === 'incompatible_work_types') {
    return `"${a.title}" (${a.category.replace('_', ' ')}) and "${b.title}" (${b.category.replace('_', ' ')}) are scheduled on segment ${a.segmentId} simultaneously. These work types require the same excavation, causing repeated digging.`;
  }
  return `"${a.title}" and "${b.title}" are both scheduled on infrastructure segment ${a.segmentId} with overlapping dates, causing repeated disruption to the same area.`;
}

/**
 * Detect all scheduling conflicts across projects.
 * Two projects conflict when:
 *  1. They share the same segmentId, AND
 *  2. Their work date windows (+ buffer days) overlap.
 *
 * We also flag incompatible work types on the same segment.
 */
export function detectConflicts(projects: Project[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const active = projects.filter(
    (p) => p.status !== 'completed' && p.segmentId.trim() !== ''
  );

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      // Must be on the same infrastructure segment
      if (a.segmentId.toLowerCase().trim() !== b.segmentId.toLowerCase().trim()) continue;

      const endA = getProjectEndDate(a);
      const endB = getProjectEndDate(b);

      const overlaps = datesOverlap(
        a.startDate, endA,
        b.startDate, endB,
        a.bufferDays, b.bufferDays
      );

      if (!overlaps) continue;

      const reason = conflictReason(a, b);
      const description = conflictDescription(a, b, reason);

      conflicts.push({
        id: getConflictId(a.id, b.id, a.segmentId),
        projectIds: [a.id, b.id],
        segmentId: a.segmentId,
        reason,
        description,
        publicDisruption:
          `Residents in ${a.neighborhood} will experience prolonged road closures and access disruptions due to overlapping construction work.`,
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  }

  return conflicts;
}

/**
 * Synchronize current active conflicts with historical resolved conflicts.
 * Retains resolved conflicts unless a new collision is detected between the same projects.
 */
export function syncConflicts(
  existingConflicts: Conflict[],
  newProjects: Project[]
): Conflict[] {
  const newlyDetected = detectConflicts(newProjects);
  const activeIds = new Set(newlyDetected.map((c) => c.id));

  // 1. Newly detected active conflicts
  const updatedActive: Conflict[] = newlyDetected.map((detected) => {
    const prev = existingConflicts.find((c) => c.id === detected.id);
    return {
      ...detected,
      detectedAt: prev?.detectedAt || detected.detectedAt,
      resolved: false,
    };
  });

  // 2. Retain resolved conflicts that are not actively colliding
  const projectIds = new Set(newProjects.map((p) => p.id));
  const retainedResolved = existingConflicts.filter(
    (c) =>
      c.resolved &&
      !activeIds.has(c.id) &&
      projectIds.has(c.projectIds[0]) &&
      projectIds.has(c.projectIds[1])
  );

  return [...updatedActive, ...retainedResolved];
}

// ── What-If Live Simulation Engine ───────────────────────────

export interface SimulationResult {
  simulatedProjects: Project[];
  simulatedConflicts: Conflict[];
  targetConflictFound: boolean;
  isTargetConflictResolved: boolean;
  remainingConflictsCount: number;
  newConflictsIntroduced: Conflict[];
  delayDays: number;
  explanation: string;
}

export function simulateScheduleAdjustment(
  projects: Project[],
  targetConflictId: string,
  adjustments: { projectId: string; newStartDate?: string; newEndDate?: string }[]
): SimulationResult {
  const baselineConflicts = detectConflicts(projects);
  const targetConflict = baselineConflicts.find((c) => c.id === targetConflictId);
  const targetConflictFound = !!targetConflict;

  const adjMap = new Map(adjustments.map((a) => [a.projectId, a]));

  const simulatedProjects = projects.map((p) => {
    const adj = adjMap.get(p.id);
    if (!adj) return p;
    return {
      ...p,
      startDate: adj.newStartDate ?? p.startDate,
      revisedEndDate: adj.newEndDate ?? (p.revisedEndDate ?? p.plannedEndDate),
    };
  });

  const simulatedConflicts = detectConflicts(simulatedProjects);
  const isTargetConflictResolved = !simulatedConflicts.some((c) => c.id === targetConflictId);

  const baselineIds = new Set(baselineConflicts.map((c) => c.id));
  const newConflictsIntroduced = simulatedConflicts.filter((c) => !baselineIds.has(c.id));

  // Compute total delay days across adjustments compared to baseline
  let totalDelay = 0;
  for (const adj of adjustments) {
    const orig = projects.find((p) => p.id === adj.projectId);
    if (orig && adj.newEndDate) {
      const origEnd = orig.revisedEndDate ?? orig.plannedEndDate;
      const diff = daysBetweenDateStr(origEnd, adj.newEndDate);
      if (diff > 0) totalDelay = Math.max(totalDelay, diff);
    }
  }

  let explanation = '';
  if (isTargetConflictResolved) {
    if (newConflictsIntroduced.length > 0) {
      explanation = `Target conflict resolved! However, this schedule shift introduces ${newConflictsIntroduced.length} new conflict(s) with other projects.`;
    } else {
      explanation = `Proposed schedule successfully eliminates spatial and temporal overlap on segment ${
        targetConflict?.segmentId || ''
      }. Zero concurrent road excavations remain.`;
    }
  } else {
    explanation = `Proposed schedule adjustment is insufficient. Works still overlap on segment ${
      targetConflict?.segmentId || ''
    }. Further date adjustments are required.`;
  }

  return {
    simulatedProjects,
    simulatedConflicts,
    targetConflictFound,
    isTargetConflictResolved,
    remainingConflictsCount: simulatedConflicts.length,
    newConflictsIntroduced,
    delayDays: totalDelay,
    explanation,
  };
}

/**
 * Generate resolution alternatives for a conflict.
 * Returns up to 4 ranked options.
 */
export function generateResolutionOptions(
  conflict: Conflict,
  projects: Project[]
): ConflictResolutionOption[] {
  const [idA, idB] = conflict.projectIds;
  const a = projects.find((p) => p.id === idA);
  const b = projects.find((p) => p.id === idB);
  if (!a || !b) return [];

  const endA = getProjectEndDate(a);
  const endB = getProjectEndDate(b);
  const durationA = differenceInDays(parseISO(endA), parseISO(a.startDate));
  const durationB = differenceInDays(parseISO(endB), parseISO(b.startDate));
  const options: ConflictResolutionOption[] = [];

  // Option 1: Keep current (no change — show it for reference)
  options.push({
    id: 'opt-keep',
    label: 'Keep Current Schedule',
    description: 'No changes to either project. Conflict remains.',
    changes: [],
    addedDelayDays: 0,
    disruptionScore: 10,
    remainingConflicts: 1,
    explanation: 'This option preserves both schedules but allows the conflict to continue.',
  });

  // Option 2: Complete A before B starts
  const bNewStart = addDaysToDateStr(endA, (a.bufferDays || 0) + 1);
  const bNewEnd = addDaysToDateStr(bNewStart, durationB);
  const delayB = daysBetweenDateStr(b.startDate, bNewStart);

  if (delayB > 0) {
    options.push({
      id: 'opt-seq-ab',
      label: `Finish "${a.title}" First, Then Start "${b.title}"`,
      description: `Delay "${b.title}" to start after "${a.title}" completes${a.bufferDays > 0 ? ` (+${a.bufferDays} buffer days)` : ''}.`,
      changes: [
        { projectId: b.id, field: 'startDate', newValue: bNewStart },
        { projectId: b.id, field: 'revisedEndDate', newValue: bNewEnd },
      ],
      addedDelayDays: delayB,
      disruptionScore: 4 + Math.min(delayB / 10, 4),
      remainingConflicts: 0,
      explanation: `"${b.title}" is delayed by ${delayB} days. No overlap remains on segment ${a.segmentId}.`,
    });
  }

  // Option 3: Complete B before A starts
  const aNewStart = addDaysToDateStr(endB, (b.bufferDays || 0) + 1);
  const aNewEnd = addDaysToDateStr(aNewStart, durationA);
  const delayA = daysBetweenDateStr(a.startDate, aNewStart);

  if (delayA > 0) {
    options.push({
      id: 'opt-seq-ba',
      label: `Finish "${b.title}" First, Then Start "${a.title}"`,
      description: `Delay "${a.title}" to start after "${b.title}" completes.`,
      changes: [
        { projectId: a.id, field: 'startDate', newValue: aNewStart },
        { projectId: a.id, field: 'revisedEndDate', newValue: aNewEnd },
      ],
      addedDelayDays: delayA,
      disruptionScore: 4 + Math.min(delayA / 10, 4),
      remainingConflicts: 0,
      explanation: `"${a.title}" is delayed by ${delayA} days. No overlap remains on segment ${a.segmentId}.`,
    });
  }

  // Option 4: Coordinate simultaneously (if compatible types)
  const incompatible = isIncompatiblePair(a.category, b.category);
  if (!incompatible) {
    options.push({
      id: 'opt-coordinate',
      label: 'Coordinate Simultaneous Work',
      description: 'Both projects proceed on the same timeline with a shared contractor coordination plan to minimise disruption.',
      changes: [],
      addedDelayDays: 0,
      disruptionScore: 6,
      remainingConflicts: 0,
      explanation: 'These work types can be coordinated simultaneously on the same segment if contractor schedules are aligned, reducing total disruption.',
    });
  }

  // Sort by disruptionScore (lower = better), keep 'Keep Current' last
  return options.sort((a, b) => {
    if (a.id === 'opt-keep') return 1;
    if (b.id === 'opt-keep') return -1;
    return a.disruptionScore - b.disruptionScore;
  });
}

export { formatDate };
