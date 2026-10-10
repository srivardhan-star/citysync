// ============================================================
// CitySync — Explainable Coordination Priority Algorithm
// ============================================================
// Heuristic priority scoring engine that ranks active infrastructure
// conflicts based on verifiable evidence:
//   1. Incompatible excavation types (25 pts)
//   2. Dig-Once policy violation risk on recently resurfaced roads (25 pts)
//   3. Schedule overlap duration (20 pts)
//   4. Mobilization urgency / lead time to start (20 pts)
//   5. Corridor impact & project safety priority (10 pts)
//
// Documented scale: 0 to 100
// Categories: High (>= 70), Medium (40-69), Low (< 40)
// ============================================================

import type {
  Project,
  Conflict,
  ConflictPriorityAssessment,
  CoordinationPriorityLevel,
  PriorityFactor,
} from '../types';
import { formatDate } from './index';
import { daysBetweenDateStr } from './conflictDetection';

// Pairs of work types that cannot share trenching and cause repeated road excavation
const INCOMPATIBLE_WORK_PAIRS: [string, string][] = [
  ['road_repair', 'drainage'],
  ['road_repair', 'water_pipeline'],
  ['drainage', 'water_pipeline'],
  ['road_repair', 'electrical'],
];

export function isIncompatibleCategoryPair(catA: string, catB: string): boolean {
  return INCOMPATIBLE_WORK_PAIRS.some(
    ([x, y]) => (x === catA && y === catB) || (x === catB && y === catA)
  );
}

export interface DigOnceCheckResult {
  hasRisk: boolean;
  resurfacedProject?: Project;
  completionDate?: string;
  daysSinceResurfacing?: number;
}

/**
 * Checks if an excavation project targets a road segment that was
 * resurfaced within the threshold period (default: 90 days).
 */
export function checkDigOnceRisk(
  segmentId: string,
  targetStartDate: string | undefined,
  allProjects: Project[],
  thresholdDays = 90,
  referenceDateStr?: string
): DigOnceCheckResult {
  if (!segmentId || !segmentId.trim()) return { hasRisk: false };

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const cleanSeg = segmentId.toLowerCase().trim();

  for (const other of allProjects) {
    if (other.status !== 'completed' || other.category !== 'road_repair') continue;
    if (other.segmentId.toLowerCase().trim() !== cleanSeg) continue;

    const compDate = other.actualEndDate || other.revisedEndDate || other.plannedEndDate;
    if (!compDate) continue;

    const compD = new Date(compDate);
    if (isNaN(compD.getTime())) continue;

    // Check against target start date if available, otherwise against reference date
    let diffDays = 0;
    if (targetStartDate) {
      const startD = new Date(targetStartDate);
      if (!isNaN(startD.getTime())) {
        diffDays = Math.round((startD.getTime() - compD.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        diffDays = Math.round((refDate.getTime() - compD.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      diffDays = Math.round((refDate.getTime() - compD.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (diffDays >= 0 && diffDays <= thresholdDays) {
      return {
        hasRisk: true,
        resurfacedProject: other,
        completionDate: compDate,
        daysSinceResurfacing: diffDays,
      };
    }
  }

  return { hasRisk: false };
}

/**
 * Calculates the exact overlapping day count between two project date ranges.
 */
export function calculateOverlapDuration(
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string
): number {
  if (!startA || !endA || !startB || !endB) return 0;

  // Overlap window is [max(startA, startB), min(endA, endB)]
  const overlapStart = startA > startB ? startA : startB;
  const overlapEnd = endA < endB ? endA : endB;

  const diff = daysBetweenDateStr(overlapStart, overlapEnd);
  // Inclusive overlap count when overlapStart <= overlapEnd
  return diff >= 0 ? diff + 1 : 0;
}

/**
 * Computes an explainable Coordination Priority Assessment for a conflict.
 * All factors are derived directly from verifiable project fields.
 */
export function calculateConflictPriority(
  conflict: Conflict,
  projects: Project[],
  options?: {
    referenceDateStr?: string;
    digOnceThresholdDays?: number;
  }
): ConflictPriorityAssessment {
  const refDateStr = options?.referenceDateStr || new Date().toISOString().split('T')[0];
  const thresholdDays = options?.digOnceThresholdDays ?? 90;

  const [idA, idB] = conflict.projectIds;
  const projectA = projects.find((p) => p.id === idA);
  const projectB = projects.find((p) => p.id === idB);

  // If projects are missing, return a safe fallback without crashing
  if (!projectA || !projectB) {
    return {
      conflictId: conflict.id,
      score: 0,
      level: 'Low',
      factors: [],
      explanation: 'Insufficient project data to compute priority score.',
      disclaimer: 'CitySync Demonstration Prioritization — Heuristic prototype; not an official government risk assessment.',
      overlapDays: 0,
      hasDigOnceRisk: false,
    };
  }

  const factors: PriorityFactor[] = [];
  const endA = projectA.revisedEndDate || projectA.plannedEndDate;
  const endB = projectB.revisedEndDate || projectB.plannedEndDate;

  // ── Factor 1: Incompatible Work Types (max 25 pts) ──────────
  const isIncompatible =
    conflict.reason === 'incompatible_work_types' ||
    isIncompatibleCategoryPair(projectA.category, projectB.category);

  if (isIncompatible) {
    factors.push({
      id: 'incompatible_types',
      label: 'Incompatible Excavation Types',
      score: 25,
      maxScore: 25,
      description: `"${projectA.category.replace('_', ' ')}" and "${projectB.category.replace(
        '_',
        ' '
      )}" both require disruptive excavation on the same corridor, preventing joint utility sharing.`,
    });
  } else {
    factors.push({
      id: 'same_segment_excavation',
      label: 'Concurrent Corridor Work',
      score: 10,
      maxScore: 25,
      description: `Both projects share segment "${conflict.segmentId || projectA.segmentId}", requiring traffic coordination.`,
    });
  }

  // ── Factor 2: Dig-Once Policy Violation Risk (max 25 pts) ───
  const segmentId = conflict.segmentId || projectA.segmentId;
  const earliestStart = projectA.startDate < projectB.startDate ? projectA.startDate : projectB.startDate;
  const digOnceCheck = checkDigOnceRisk(segmentId, earliestStart, projects, thresholdDays, refDateStr);

  if (digOnceCheck.hasRisk && digOnceCheck.resurfacedProject) {
    factors.push({
      id: 'dig_once_risk',
      label: 'Dig-Once Policy Violation Risk',
      score: 25,
      maxScore: 25,
      description: `Segment was repaved within 90 days by "${digOnceCheck.resurfacedProject.title}" (completed ${formatDate(
        digOnceCheck.completionDate
      )}). Re-excavating destroys recently laid asphalt.`,
    });
  }

  // ── Factor 3: Schedule Overlap Duration (max 20 pts) ────────
  const overlapDays = calculateOverlapDuration(projectA.startDate, endA, projectB.startDate, endB);

  if (overlapDays >= 30) {
    factors.push({
      id: 'overlap_severe',
      label: 'Severe Schedule Overlap (30+ Days)',
      score: 20,
      maxScore: 20,
      description: `Projects overlap concurrently for ${overlapDays} days, causing extended corridor blockade.`,
    });
  } else if (overlapDays >= 14) {
    factors.push({
      id: 'overlap_moderate',
      label: 'Moderate Schedule Overlap (14–29 Days)',
      score: 14,
      maxScore: 20,
      description: `Projects overlap concurrently for ${overlapDays} days on the same infrastructure segment.`,
    });
  } else if (overlapDays > 0) {
    factors.push({
      id: 'overlap_short',
      label: 'Short Schedule Overlap (< 14 Days)',
      score: 8,
      maxScore: 20,
      description: `Projects overlap concurrently for ${overlapDays} days, creating a short-term traffic bottleneck.`,
    });
  }

  // ── Factor 4: Mobilization Urgency / Lead Time (max 20 pts) ──
  let leadTimeDays: number | undefined = undefined;
  if (earliestStart) {
    leadTimeDays = daysBetweenDateStr(refDateStr, earliestStart);
    if (leadTimeDays <= 14) {
      factors.push({
        id: 'urgency_imminent',
        label: 'Imminent Mobilization (< 14 Days)',
        score: 20,
        maxScore: 20,
        description: `Earliest work begins in ${leadTimeDays <= 0 ? 'days or is already active' : `${leadTimeDays} days`}. Immediate municipal scheduling required.`,
      });
    } else if (leadTimeDays <= 30) {
      factors.push({
        id: 'urgency_near',
        label: 'Near-Term Mobilization (15–30 Days)',
        score: 14,
        maxScore: 20,
        description: `Earliest work begins in ${leadTimeDays} days. Equipment staging and contractor mobilization are imminent.`,
      });
    } else if (leadTimeDays <= 60) {
      factors.push({
        id: 'urgency_medium',
        label: 'Upcoming Mobilization (31–60 Days)',
        score: 8,
        maxScore: 20,
        description: `Earliest work begins in ${leadTimeDays} days, leaving a short coordination window.`,
      });
    } else {
      factors.push({
        id: 'urgency_far',
        label: 'Future Planned Work (> 60 Days)',
        score: 3,
        maxScore: 20,
        description: `Earliest work begins in ${leadTimeDays} days, allowing routine scheduling coordination.`,
      });
    }
  }

  // ── Factor 5: Corridor Impact & Safety Priority (max 10 pts) ─
  const hasSafetyOverride =
    projectA.isCriticalSafetyOverride ||
    projectB.isCriticalSafetyOverride ||
    projectA.status === 'emergency' ||
    projectB.status === 'emergency';

  const maxProjectPriority = Math.max(projectA.priorityScore ?? 0, projectB.priorityScore ?? 0);

  if (hasSafetyOverride) {
    factors.push({
      id: 'safety_override',
      label: 'Critical Safety / Emergency Corridor',
      score: 10,
      maxScore: 10,
      description: 'Involves an emergency or life-safety critical project that must not be disrupted.',
    });
  } else if (maxProjectPriority >= 75) {
    factors.push({
      id: 'high_priority_project',
      label: 'High Civic Priority Project',
      score: 7,
      maxScore: 10,
      description: `Involves a project with priority score ${maxProjectPriority}/100, serving vital public needs.`,
    });
  } else {
    factors.push({
      id: 'standard_impact',
      label: 'Standard Infrastructure Corridor',
      score: 4,
      maxScore: 10,
      description: 'Standard civic infrastructure maintenance and utility works.',
    });
  }

  // Calculate final normalized score (0–100)
  const rawScore = factors.reduce((acc, f) => acc + f.score, 0);
  const score = Math.min(100, Math.max(0, rawScore));

  const level: CoordinationPriorityLevel =
    score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

  // ── Synthesize Plain-Language Explanation ────────────────────
  const topFactors = [...factors].sort((a, b) => b.score - a.score);
  const topFactorNames = topFactors.slice(0, 2).map((f) => f.label.toLowerCase()).join(' and ');

  let explanation = '';
  if (level === 'High') {
    explanation = `Prioritized as HIGH urgency (${score}/100) primarily driven by ${topFactorNames}. Immediate coordinator intervention recommended to prevent conflicting excavation.`;
  } else if (level === 'Medium') {
    explanation = `Assessed as MEDIUM urgency (${score}/100) due to ${topFactorNames}. Scheduling alignment recommended before physical work commences.`;
  } else {
    explanation = `Assessed as LOW urgency (${score}/100). Works can be addressed during routine municipal coordination cycles.`;
  }

  return {
    conflictId: conflict.id,
    score,
    level,
    factors,
    explanation,
    disclaimer: 'CitySync Demonstration Prioritization — Generated by heuristic civic rules; not an official GCC/CMDA government risk assessment.',
    overlapDays,
    leadTimeDays,
    hasDigOnceRisk: digOnceCheck.hasRisk,
  };
}

/**
 * Sorts conflicts by Coordination Priority score in descending order.
 * Active conflicts can be ranked first, followed by resolved ones.
 */
export function rankConflictsByPriority(
  conflicts: Conflict[],
  projects: Project[],
  options?: { referenceDateStr?: string; excludeResolved?: boolean }
): { conflict: Conflict; assessment: ConflictPriorityAssessment }[] {
  const targetConflicts = options?.excludeResolved
    ? conflicts.filter((c) => !c.resolved)
    : conflicts;

  const assessed = targetConflicts.map((conflict) => ({
    conflict,
    assessment: calculateConflictPriority(conflict, projects, options),
  }));

  return assessed.sort((a, b) => {
    // Active conflicts rank ahead of resolved conflicts if mixed
    if (!a.conflict.resolved && b.conflict.resolved) return -1;
    if (a.conflict.resolved && !b.conflict.resolved) return 1;

    // Highest score first
    if (b.assessment.score !== a.assessment.score) {
      return b.assessment.score - a.assessment.score;
    }

    // Tie-breaker: longer overlap days first
    if (b.assessment.overlapDays !== a.assessment.overlapDays) {
      return b.assessment.overlapDays - a.assessment.overlapDays;
    }

    return a.conflict.id.localeCompare(b.conflict.id);
  });
}

/**
 * Attaches priority score and assessment to an array of conflicts.
 */
export function attachPriorityAssessments(
  conflicts: Conflict[],
  projects: Project[],
  options?: { referenceDateStr?: string }
): Conflict[] {
  return conflicts.map((conflict) => {
    const assessment = calculateConflictPriority(conflict, projects, options);
    return {
      ...conflict,
      priorityScore: assessment.score,
      priorityLevel: assessment.level,
      priorityAssessment: assessment,
    };
  });
}
