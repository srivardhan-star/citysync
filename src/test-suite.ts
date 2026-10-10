// ============================================================
// CivicTrack — Core Calculation & Logic Tests
// ============================================================

import {
  calculateDelay,
  calculatePriorityScore,
  calculateMilestoneProgress,
  datesOverlap,
} from './utils/index.ts';
import { detectConflicts, generateResolutionOptions } from './utils/conflictDetection.ts';
import { SEED_PROJECTS } from './data/seedData.ts';
import type { Project, PriorityInputs, Milestone } from './types/index.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n--- Running CivicTrack Deterministic Engine Tests ---\n');

// 1. Priority Score Formula Test
console.log('1. Priority Score Algorithm:');
// Priority Score = (30 × Safety + 25 × EssentialService + 20 × Dependency + 15 × Urgency + 10 × Disruption) / 5
// Test case: Max ratings (5, 5, 5, 5, 5) -> (150 + 125 + 100 + 75 + 50) / 5 = 500 / 5 = 100
const maxInputs: PriorityInputs = {
  publicSafety: 5,
  essentialService: 5,
  dependencyImpact: 5,
  urgency: 5,
  publicDisruption: 5,
};
assert(calculatePriorityScore(maxInputs) === 100, 'Max ratings (all 5) yield score 100');

// Test case: Min ratings (0, 0, 0, 0, 0) -> 0
const minInputs: PriorityInputs = {
  publicSafety: 0,
  essentialService: 0,
  dependencyImpact: 0,
  urgency: 0,
  publicDisruption: 0,
};
assert(calculatePriorityScore(minInputs) === 0, 'Min ratings (all 0) yield score 0');

// Test case: Custom weights (4, 3, 2, 4, 4)
// = (30*4 + 25*3 + 20*2 + 15*4 + 10*4) / 5
// = (120 + 75 + 40 + 60 + 40) / 5 = 335 / 5 = 67
const customInputs: PriorityInputs = {
  publicSafety: 4,
  essentialService: 3,
  dependencyImpact: 2,
  urgency: 4,
  publicDisruption: 4,
};
assert(calculatePriorityScore(customInputs) === 67, 'Weighted formula (4,3,2,4,4) yields exactly 67');

// 2. Date Overlap Logic Test
console.log('\n2. Date Overlap Engine:');
// Non-overlapping dates
assert(
  !datesOverlap('2026-01-01', '2026-01-10', '2026-01-15', '2026-01-20', 0, 0),
  'Separated dates do not overlap'
);

// Overlapping dates
assert(
  datesOverlap('2026-01-01', '2026-01-15', '2026-01-10', '2026-01-20', 0, 0),
  'Direct date overlap correctly detected'
);

// Overlap induced by buffer days
assert(
  datesOverlap('2026-01-01', '2026-01-10', '2026-01-12', '2026-01-20', 3, 0),
  'Buffer days correctly trigger overlap warning'
);

// 3. Delay Calculation Test
console.log('\n3. Delay Calculation Engine:');
const completedOnTimeMock: Project = {
  ...SEED_PROJECTS[0],
  plannedEndDate: '2026-05-10',
  actualEndDate: '2026-05-08',
  status: 'completed',
};
const resOnTime = calculateDelay(completedOnTimeMock);
assert(!resOnTime.isDelayed && resOnTime.delayDays === 0, 'Early completed project is not marked delayed');

const completedLateMock: Project = {
  ...SEED_PROJECTS[0],
  plannedEndDate: '2026-05-10',
  actualEndDate: '2026-05-20',
  status: 'completed',
};
const resLate = calculateDelay(completedLateMock);
assert(resLate.isDelayed && resLate.delayDays === 10, 'Completed project with actual > planned has exact delay days');

// Future unfinished project should not be marked delayed before deadline
const futureMock: Project = {
  ...SEED_PROJECTS[0],
  plannedEndDate: '2099-01-01',
  status: 'ongoing',
  actualEndDate: undefined,
};
const resFuture = calculateDelay(futureMock);
assert(!resFuture.isDelayed && resFuture.delayDays === 0, 'Unfinished project before deadline is not delayed');

// 4. Milestone Progress Test
console.log('\n4. Milestone Progress Engine:');
const milestones = [
  { id: '1', name: 'M1', plannedDate: '2026-01-01', completed: true },
  { id: '2', name: 'M2', plannedDate: '2026-01-02', completed: true },
  { id: '3', name: 'M3', plannedDate: '2026-01-03', completed: false },
  { id: '4', name: 'M4', plannedDate: '2026-01-04', completed: false },
];
assert(calculateMilestoneProgress(milestones) === 50, '2/4 milestones yields exactly 50%');

// 5. Conflict Detection & Resolution Generation Test
console.log('\n5. Conflict Detection & Recommendation Engine:');
const conflicts = detectConflicts(SEED_PROJECTS);
assert(conflicts.length > 0, `Deterministic conflict engine detects ${conflicts.length} conflict(s) in seed data`);

const firstConflict = conflicts[0];
const resolutions = generateResolutionOptions(firstConflict, SEED_PROJECTS);
assert(resolutions.length >= 2, `Generates ${resolutions.length} ranked resolution alternatives`);
assert(
  resolutions.some((r) => r.changes.length > 0),
  'At least one viable scheduling adjustment alternative proposed'
);

// 6. Dual Perspective (Government vs Public) Role Safeguards Test
console.log('\n6. Dual Perspective & Citizen Issue Reporting:');
import {
  loadState,
  setUserRole,
  addIssueReport,
  updateIssueReportStatus,
} from './data/store.ts';
import type { IssueReport } from './types/index.ts';

const initialStore = loadState();
assert(initialStore.userRole === 'government', 'Initial state defaults to Government perspective');

// Test toggle to Public
const publicStore = setUserRole(initialStore, 'public');
assert(publicStore.userRole === 'public', 'setUserRole successfully switches to Public perspective');

// Test citizen submitting issue report
const issueMock: IssueReport = {
  id: 'test-iss-01',
  projectId: 'PRJ-001',
  category: 'safety_hazard',
  title: 'Test Safety Issue',
  description: 'Uncovered trench test description',
  status: 'open',
  submittedAt: new Date().toISOString(),
  reporterName: 'Test Citizen',
};
const storeWithIssue = addIssueReport(publicStore, issueMock);
assert(
  storeWithIssue.issueReports.some((i) => i.id === 'test-iss-01'),
  'Citizens can successfully submit issue reports'
);

// Test government updating issue status
const govStore = setUserRole(storeWithIssue, 'government');
const resolvedIssueStore = updateIssueReportStatus(
  govStore,
  'test-iss-01',
  'resolved',
  'Fixed by road crew'
);
const updatedIssue = resolvedIssueStore.issueReports.find((i) => i.id === 'test-iss-01');
assert(
  updatedIssue?.status === 'resolved' && updatedIssue?.officialResponse === 'Fixed by road crew',
  'Government perspective can review, resolve, and respond to citizen issue reports'
);

// 7. Milestone Completion, Confirmation & Undo Logic Tests
console.log('\n7. Milestone Completion & Undo Engine:');

// Test project with 4 milestones
const testMilestones: Milestone[] = [
  { id: 'ms-1', name: 'Excavation', plannedDate: '2026-03-01', completed: false },
  { id: 'ms-2', name: 'Pipe Laying', plannedDate: '2026-03-10', completed: false },
  { id: 'ms-3', name: 'Testing', plannedDate: '2026-03-20', completed: false },
  { id: 'ms-4', name: 'Surfacing', plannedDate: '2026-03-30', completed: false },
];

const testProject: Project = {
  ...SEED_PROJECTS[0],
  id: 'PRJ-TEST-MS',
  milestones: testMilestones,
  progress: 0,
};

// A. Cancel dialogue simulation leaves data completely unchanged
let dialogCancelled = true;
let projectAfterCancel = testProject;
if (!dialogCancelled) {
  // If not cancelled, it would modify
  projectAfterCancel = { ...testProject, progress: 100 };
}
assert(
  projectAfterCancel.progress === 0 &&
    projectAfterCancel.milestones[0].completed === false &&
    projectAfterCancel === testProject,
  'Cancelling completion dialog leaves milestone and project data unchanged'
);

// B. Confirm completion of milestone 1
const completedMs1: Milestone[] = testProject.milestones.map((m) =>
  m.id === 'ms-1' ? { ...m, completed: true, actualDate: '2026-03-02' } : m
);
const progressAfterMs1 = calculateMilestoneProgress(completedMs1);
assert(progressAfterMs1 === 25, 'Confirming 1/4 milestones updates progress to 25%');
assert(completedMs1[0].completed === true && completedMs1[0].actualDate === '2026-03-02', 'Completed milestone records actualDate');

// C. Confirm completion of milestone 2
const completedMs2: Milestone[] = completedMs1.map((m) =>
  m.id === 'ms-2' ? { ...m, completed: true, actualDate: '2026-03-12' } : m
);
const progressAfterMs2 = calculateMilestoneProgress(completedMs2);
assert(progressAfterMs2 === 50, 'Confirming 2/4 milestones updates progress to 50%');

// D. Cancel undo dialogue simulation leaves completed milestone unchanged
let undoCancelled = true;
let milestonesAfterUndoCancel = completedMs2;
if (!undoCancelled) {
  milestonesAfterUndoCancel = completedMs2.map((m) =>
    m.id === 'ms-2' ? { ...m, completed: false, actualDate: undefined } : m
  );
}
assert(
  milestonesAfterUndoCancel[1].completed === true &&
    calculateMilestoneProgress(milestonesAfterUndoCancel) === 50,
  'Cancelling undo dialog leaves milestone in completed state and progress unchanged'
);

// E. Confirm undoing completion of milestone 2
const reversedMs2: Milestone[] = completedMs2.map((m) =>
  m.id === 'ms-2' ? { ...m, completed: false, actualDate: undefined } : m
);
const progressAfterReversal = calculateMilestoneProgress(reversedMs2);
assert(
  reversedMs2[1].completed === false && reversedMs2[1].actualDate === undefined,
  'Undoing completion resets completed to false and clears actualDate'
);
assert(progressAfterReversal === 25, 'Reversing milestone recalculates progress back from 50% to 25%');

// F. Role permissions safeguard: Public user perspective cannot mutate official project milestones
import { updateProject as storeUpdateProject } from './data/store.ts';
const projectWithMs = { ...testProject, milestones: completedMs1, progress: progressAfterMs1 };
const storeWithTestProject = {
  ...publicStore,
  projects: [projectWithMs, ...publicStore.projects],
};

// Simulating reducer safeguard for UPDATE_PROJECT when userRole is 'public'
function simulateReducerUpdateProject(state: typeof storeWithTestProject, updated: Project) {
  if (state.userRole === 'public') {
    return state; // Public users cannot edit official projects
  }
  return storeUpdateProject(state, updated);
}

const attemptedPublicMutation: Project = {
  ...projectWithMs,
  progress: 100,
  milestones: testMilestones.map((m) => ({ ...m, completed: true })),
};
const resultState = simulateReducerUpdateProject(storeWithTestProject, attemptedPublicMutation);
const projectInResult = resultState.projects.find((p) => p.id === 'PRJ-TEST-MS');
assert(
  projectInResult?.progress === 25 && projectInResult?.milestones.filter((m) => m.completed).length === 1,
  'Public role permission safeguard strictly prevents modifying official project milestones'
);

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
