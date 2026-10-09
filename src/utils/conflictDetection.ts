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
        id: generateId('conf'),
        projectIds: [a.id, b.id],
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
  const aEnd = parseISO(endA);
  const bNewStart = addDays(aEnd, (a.bufferDays || 0) + 1);
  const bNewEnd = addDays(bNewStart, durationB);
  const delayB = differenceInDays(bNewStart, parseISO(b.startDate));

  if (delayB > 0) {
    options.push({
      id: 'opt-seq-ab',
      label: `Finish "${a.title}" First, Then Start "${b.title}"`,
      description: `Delay "${b.title}" to start after "${a.title}" completes${a.bufferDays > 0 ? ` (+${a.bufferDays} buffer days)` : ''}.`,
      changes: [
        { projectId: b.id, field: 'startDate', newValue: bNewStart.toISOString().split('T')[0] },
        { projectId: b.id, field: 'revisedEndDate', newValue: bNewEnd.toISOString().split('T')[0] },
      ],
      addedDelayDays: delayB,
      disruptionScore: 4 + Math.min(delayB / 10, 4),
      remainingConflicts: 0,
      explanation: `"${b.title}" is delayed by ${delayB} days. No overlap remains on segment ${a.segmentId}.`,
    });
  }

  // Option 3: Complete B before A starts
  const bEnd = parseISO(endB);
  const aNewStart = addDays(bEnd, (b.bufferDays || 0) + 1);
  const aNewEnd = addDays(aNewStart, durationA);
  const delayA = differenceInDays(aNewStart, parseISO(a.startDate));

  if (delayA > 0) {
    options.push({
      id: 'opt-seq-ba',
      label: `Finish "${b.title}" First, Then Start "${a.title}"`,
      description: `Delay "${a.title}" to start after "${b.title}" completes.`,
      changes: [
        { projectId: a.id, field: 'startDate', newValue: aNewStart.toISOString().split('T')[0] },
        { projectId: a.id, field: 'revisedEndDate', newValue: aNewEnd.toISOString().split('T')[0] },
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
