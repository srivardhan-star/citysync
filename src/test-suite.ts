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
import type { Project, PriorityInputs } from './types/index.ts';

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

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
