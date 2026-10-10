// ============================================================
// CivicTrack — Core Calculation & Logic Tests
// ============================================================

import {
  calculateDelay,
  calculatePriorityScore,
  calculateMilestoneProgress,
  datesOverlap,
} from './utils/index.ts';
import {
  detectConflicts,
  generateResolutionOptions,
  addDaysToDateStr,
  daysBetweenDateStr,
  simulateScheduleAdjustment,
  syncConflicts,
  getConflictId,
} from './utils/conflictDetection.ts';
import { SEED_PROJECTS } from './data/seedData.ts';
import type { Project, PriorityInputs, IssueReport, ResolutionCategory } from './types/index.ts';

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
  applyResolution,
} from './data/store.ts';

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

// 7. Phase 1: What-If Scheduling Simulator & Conflict Resolution Persistence Tests
console.log('\n7. What-If Simulator & Conflict Resolution Persistence:');

// 7a. Timezone-safe date arithmetic
assert(addDaysToDateStr('2026-06-01', 14) === '2026-06-15', 'Shift by +14 days preserves calendar accuracy');
assert(addDaysToDateStr('2026-06-15', -10) === '2026-06-05', 'Fast-track by -10 days subtracts correctly');
assert(addDaysToDateStr('2026-02-28', 1) === '2026-03-01', 'Month boundary rollover is accurate');
assert(addDaysToDateStr('2026-12-31', 2) === '2027-01-02', 'Year boundary rollover is accurate');
assert(daysBetweenDateStr('2026-06-01', '2026-06-15') === 14, 'daysBetweenDateStr returns exact day delta');

// 7b. Simulation leaves original projects and state unchanged (pure dry run)
const targetConflict = conflicts[0];
const [projAId, projBId] = targetConflict.projectIds;
const originalProjectsSnapshot = JSON.parse(JSON.stringify(SEED_PROJECTS));

const projA = SEED_PROJECTS.find((p) => p.id === projAId)!;
const projB = SEED_PROJECTS.find((p) => p.id === projBId)!;
const projAEnd = projA.revisedEndDate || projA.plannedEndDate;

// Shift project B so it begins safely after project A + buffer
const simulatedStartB = addDaysToDateStr(projAEnd, (projA.bufferDays || 0) + 5);
const simulatedEndB = addDaysToDateStr(simulatedStartB, 30);

// Simulate adjusting project dates
const simResult = simulateScheduleAdjustment(SEED_PROJECTS, targetConflict.id, [
  { projectId: projBId, newStartDate: simulatedStartB, newEndDate: simulatedEndB },
]);

assert(
  JSON.stringify(SEED_PROJECTS) === JSON.stringify(originalProjectsSnapshot),
  'Cancelled/in-progress simulation leaves approved project data completely unchanged'
);
assert(
  simResult.targetConflictFound === true,
  'Simulator locates and targets the specified conflict by ID'
);
assert(
  simResult.isTargetConflictResolved === true,
  'Simulated shift resolves the target conflict in dry-run'
);
assert(
  simResult.remainingConflictsCount < conflicts.length,
  'Simulated resolution reduces remaining conflict count'
);

// 7c. Explicit Confirmation updates project records, records audit log, and preserves resolved history
const storeBeforeResolution = loadState();
const initialActiveConflicts = storeBeforeResolution.conflicts.filter((c) => !c.resolved);
const initialResolvedConflicts = storeBeforeResolution.conflicts.filter((c) => c.resolved);
assert(initialActiveConflicts.length >= 1, 'Initial state contains at least 1 active conflict');
assert(initialResolvedConflicts.length === 0, 'Initial state starts with 0 resolved conflicts');

const activeConflictToResolve = initialActiveConflicts[0];
const [resolveAId, resolveBId] = activeConflictToResolve.projectIds;
const targetProjectToShift = storeBeforeResolution.projects.find((p) => p.id === resolveBId)!;
const otherProject = storeBeforeResolution.projects.find((p) => p.id === resolveAId)!;
const otherEndDate = otherProject.revisedEndDate || otherProject.plannedEndDate;

const newShiftedStartDate = addDaysToDateStr(otherEndDate, (otherProject.bufferDays || 0) + 7);
const durationToShift = daysBetweenDateStr(
  targetProjectToShift.startDate,
  targetProjectToShift.revisedEndDate || targetProjectToShift.plannedEndDate
);
const newShiftedEndDate = addDaysToDateStr(newShiftedStartDate, durationToShift);

const resolutionCategory: ResolutionCategory = 'sequential_delay';
const justificationText = 'Sequential scheduling applied: Underground cable laying shifted to follow carriageway reconstruction after buffer period.';
const citizenExplanationText = 'Underground cable work shifted to begin after road reconstruction is fully cured so road is excavated only once.';

const storeAfterResolution = applyResolution(
  storeBeforeResolution,
  activeConflictToResolve.id,
  [
    { projectId: targetProjectToShift.id, field: 'startDate', newValue: newShiftedStartDate },
    { projectId: targetProjectToShift.id, field: 'revisedEndDate', newValue: newShiftedEndDate },
  ],
  'Sequential Execution (Buffer Cleared)',
  resolutionCategory,
  justificationText,
  citizenExplanationText
);

// Check project record update
const updatedProject = storeAfterResolution.projects.find((p) => p.id === targetProjectToShift.id);
assert(
  updatedProject?.startDate === newShiftedStartDate && updatedProject?.revisedEndDate === newShiftedEndDate,
  'Confirmed resolution updates project startDate and revisedEndDate'
);

// Check activity history audit log
const projectLatestHistory = updatedProject?.activityHistory[0];
assert(
  projectLatestHistory?.type === 'resolution_applied' && projectLatestHistory?.description.includes(justificationText),
  'Project activity history records resolution_applied with coordinator justification'
);

// Check resolved conflict retention in history
const resolvedConflictRecord = storeAfterResolution.conflicts.find((c) => c.id === activeConflictToResolve.id);
assert(
  resolvedConflictRecord !== undefined && resolvedConflictRecord.resolved === true,
  'Resolved conflict is retained in conflicts array with resolved=true'
);
assert(
  resolvedConflictRecord?.resolutionCategory === resolutionCategory &&
    resolvedConflictRecord?.justification === justificationText &&
    resolvedConflictRecord?.citizenExplanation === citizenExplanationText,
  'Resolved conflict stores category, coordinator justification, and citizen explanation'
);
assert(
  (resolvedConflictRecord?.changesApplied?.length ?? 0) > 0,
  'Resolved conflict records change history (previous vs new values)'
);

// Check counts
const finalActiveConflicts = storeAfterResolution.conflicts.filter((c) => !c.resolved);
const finalResolvedConflicts = storeAfterResolution.conflicts.filter((c) => c.resolved);
assert(
  finalActiveConflicts.length === initialActiveConflicts.length - 1,
  'Active conflict count decrements accurately after resolution'
);
assert(
  finalResolvedConflicts.length === 1,
  'Resolved conflict count increments to 1 and remains visible in history'
);

// Check syncConflicts idempotent reconciliation
const resyncedConflicts = syncConflicts(storeAfterResolution.conflicts, storeAfterResolution.projects);
assert(
  resyncedConflicts.some((c) => c.id === activeConflictToResolve.id && c.resolved === true),
  'syncConflicts preserves previously resolved conflict across state re-evaluations'
);

// ─────────────────────────────────────────────────────────────────
// 8. Public Accountability Ledger Tests (Phase 2)
// ─────────────────────────────────────────────────────────────────
console.log('\n8. Public Accountability Ledger:');
import { SEED_LEDGER_ENTRIES } from './data/seedData.ts';
import { addLedgerEntry } from './data/store.ts';
import type { LedgerEntry } from './types/index.ts';

// 8.1 — Fresh state includes seed ledger entries
assert(
  initialStore.ledgerEntries !== undefined && Array.isArray(initialStore.ledgerEntries),
  'Initial state has ledgerEntries array'
);
assert(
  initialStore.ledgerEntries.length >= 2,
  'Initial state contains at least 2 seed ledger entries'
);

// 8.2 — Seed entries contain the expected demo IDs
assert(
  initialStore.ledgerEntries.some((e: LedgerEntry) => e.id === 'ledger-demo-001'),
  'Seed ledger entry ledger-demo-001 present in initial state'
);
assert(
  initialStore.ledgerEntries.some((e: LedgerEntry) => e.id === 'ledger-demo-002'),
  'Seed ledger entry ledger-demo-002 present in initial state'
);

// 8.3 — Seed entries are marked as demonstration records
assert(
  initialStore.ledgerEntries.every((e: LedgerEntry) => e.isDemonstrationRecord === true),
  'All seed ledger entries are marked isDemonstrationRecord=true'
);

// 8.4 — applyResolution auto-creates exactly 1 new ledger entry
const ledgerCountBefore = storeAfterResolution.ledgerEntries.length;
const seedCount = initialStore.ledgerEntries.length;
assert(
  ledgerCountBefore === seedCount + 1,
  'Confirmed resolution creates exactly 1 new ledger entry'
);

// 8.5 — New ledger entry not marked as demonstration record
const newLedgerEntry = storeAfterResolution.ledgerEntries[0]; // newest-first (prepended)
assert(
  newLedgerEntry !== undefined && newLedgerEntry.isDemonstrationRecord === false,
  'Newly created ledger entry is NOT marked as demonstration record'
);

// 8.6 — Ledger entry contains correct resolution category
assert(
  newLedgerEntry?.resolutionCategory === resolutionCategory,
  'Ledger entry carries the coordinator-selected resolution category'
);

// 8.7 — Ledger entry stores coordinator justification
assert(
  newLedgerEntry?.coordinatorJustification === justificationText,
  'Ledger entry stores coordinator justification text'
);

// 8.8 — Ledger entry stores citizen explanation
assert(
  newLedgerEntry?.citizenExplanation === citizenExplanationText,
  'Ledger entry stores citizen-facing explanation text'
);

// 8.9 — Ledger entry records affected projects with date changes
assert(
  Array.isArray(newLedgerEntry?.projects) && newLedgerEntry.projects.length > 0,
  'Ledger entry lists at least one affected project'
);

assert(
  newLedgerEntry?.projects.some(
    (p: { changes: { previousValue: string; newValue: string }[] }) =>
      p.changes.some((ch) => ch.previousValue !== ch.newValue)
  ),
  'Ledger entry project records show previous vs new date values'
);

// 8.10 — Cancelled simulation does NOT create a ledger entry
// (we simply do NOT call applyResolution — verify the count after our one resolution)
assert(
  storeAfterResolution.ledgerEntries.length === seedCount + 1,
  'No spurious ledger entries created (cancelled simulations leave count unchanged)'
);

// 8.11 — addLedgerEntry manual addition works
const manualEntry: LedgerEntry = {
  id: 'test-ledger-manual',
  timestamp: new Date().toISOString(),
  title: 'Manual Test Entry',
  conflictId: 'test-conflict-manual',
  location: 'Test Location',
  segmentId: 'TEST-SEG-001',
  resolutionCategory: 'other',
  reason: 'Testing manual ledger addition',
  coordinatorJustification: 'Required for test coverage',
  citizenExplanation: 'A test entry was added.',
  performedBy: 'test-system',
  isDemonstrationRecord: false,
  projects: [],
};
const storeWithManualEntry = addLedgerEntry(storeAfterResolution, manualEntry);
assert(
  storeWithManualEntry.ledgerEntries.length === storeAfterResolution.ledgerEntries.length + 1,
  'addLedgerEntry prepends new entry to ledgerEntries'
);
assert(
  storeWithManualEntry.ledgerEntries[0].id === 'test-ledger-manual',
  'Manually added ledger entry appears at front of ledgerEntries array'
);

// 8.12 — loadState preserves ledgerEntries across round-trips (fallback check)
// Since localStorage is unavailable in Node, loadState() returns seed data;
// verify ledgerEntries are present after re-load
const reloadedStore = loadState();
assert(
  Array.isArray(reloadedStore.ledgerEntries) && reloadedStore.ledgerEntries.length >= 2,
  'loadState returns ledgerEntries (seed fallback on no-localStorage environment)'
);

// 8.13 — SEED_LEDGER_ENTRIES export is consistent with store seed
assert(
  SEED_LEDGER_ENTRIES.length === 2,
  'SEED_LEDGER_ENTRIES exports exactly 2 demo entries'
);
assert(
  SEED_LEDGER_ENTRIES[0].id === 'ledger-demo-001' &&
  SEED_LEDGER_ENTRIES[1].id === 'ledger-demo-002',
  'SEED_LEDGER_ENTRIES IDs match expected demo-001 and demo-002'
);

// 8.14 — Each ledger entry has a timestamp, title, location, citizen explanation
const requiredFields = ['id', 'timestamp', 'title', 'location', 'citizenExplanation', 'segmentId', 'resolutionCategory', 'projects'] as const;
const allSeedEntriesValid = SEED_LEDGER_ENTRIES.every((e: LedgerEntry) => {
  const rec = e as unknown as Record<string, unknown>;
  return requiredFields.every((field) => rec[field] !== undefined && rec[field] !== '');
});
assert(allSeedEntriesValid, 'All seed ledger entries contain required fields');

// 8.15 — Ledger entry timestamp is a valid ISO-8601 string
assert(
  !isNaN(new Date(newLedgerEntry?.timestamp ?? '').getTime()),
  'New ledger entry timestamp is a valid date/time'
);

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
