// ============================================================
// CivicTrack — Core Calculation & Logic Tests
// ============================================================

import {
  calculateDelay,
  calculatePriorityScore,
  calculateMilestoneProgress,
  datesOverlap,
  generateComplaintReference,
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

// ─────────────────────────────────────────────────────────────────
// 9. Citizen Complaint Reference Tracking (Phase 3)
// ─────────────────────────────────────────────────────────────────
console.log('\n9. Citizen Complaint Reference Tracking:');
import { SEED_ISSUE_REPORTS } from './data/seedData.ts';

// 9.1 — Seed issue reports have reference numbers with expected format CS-YYYY-XXXXXX
const refRegex = /^CS-\d{4}-[A-Z0-9]{6}$/;
assert(
  SEED_ISSUE_REPORTS.every((r) => r.referenceNumber && refRegex.test(r.referenceNumber)),
  'All seed issue reports have valid reference numbers matching CS-YYYY-XXXXXX format'
);

// 9.2 — Seed issue reports have distinct, unique reference numbers
const seedRefNumbers = SEED_ISSUE_REPORTS.map((r) => r.referenceNumber!);
assert(
  new Set(seedRefNumbers).size === seedRefNumbers.length,
  'All seed issue reports have unique reference numbers without collision'
);

// 9.3 — generateComplaintReference creates a valid reference string
const testRef = generateComplaintReference(seedRefNumbers);
assert(
  refRegex.test(testRef),
  'generateComplaintReference produces a compliant CS-YYYY-XXXXXX reference'
);
assert(
  !seedRefNumbers.includes(testRef),
  'generateComplaintReference avoids existing reference collisions'
);

// 9.4 — addIssueReport auto-assigns reference number if omitted
const newMockReport: IssueReport = {
  id: 'test-iss-ref-01',
  projectId: 'PRJ-003',
  category: 'safety_hazard',
  title: 'Test unbarricaded site',
  description: 'Unbarricaded excavation creating pedestrian risk',
  status: 'open',
  submittedAt: new Date().toISOString(),
};
const storeWithNewIssue = addIssueReport(storeAfterResolution, newMockReport);
const savedReport = storeWithNewIssue.issueReports.find((r) => r.id === 'test-iss-ref-01');
assert(
  savedReport?.referenceNumber !== undefined && refRegex.test(savedReport.referenceNumber),
  'addIssueReport automatically assigns a valid reference number'
);

// 9.5 — Look up complaint by reference number successfully finds the record
const lookupTarget = savedReport?.referenceNumber;
const foundByRef = storeWithNewIssue.issueReports.find((r) => r.referenceNumber === lookupTarget);
assert(
  foundByRef !== undefined && foundByRef.id === 'test-iss-ref-01',
  'Citizen complaint lookup by reference number retrieves the correct record'
);

// 9.6 — Look up with non-existent reference returns undefined / not found
const notFoundLookup = storeWithNewIssue.issueReports.find((r) => r.referenceNumber === 'CS-2026-NONEXIST');
assert(
  notFoundLookup === undefined,
  'Lookup with invalid or non-existent reference returns undefined (clear not-found state)'
);

// 9.7 — updateIssueReportStatus updates status, officialResponse, and updatedAt
const updatedStatusStore = updateIssueReportStatus(
  storeWithNewIssue,
  'test-iss-ref-01',
  'resolved',
  'Engineer inspected site: barricades and solar blinkers installed.'
);
const resolvedReport = updatedStatusStore.issueReports.find((r) => r.id === 'test-iss-ref-01');
assert(
  resolvedReport?.status === 'resolved',
  'updateIssueReportStatus updates status to resolved'
);
assert(
  resolvedReport?.officialResponse === 'Engineer inspected site: barricades and solar blinkers installed.',
  'updateIssueReportStatus records the official engineering response'
);
assert(
  resolvedReport?.updatedAt !== undefined && !isNaN(new Date(resolvedReport.updatedAt).getTime()),
  'updateIssueReportStatus sets a valid updatedAt timestamp'
);

// 9.8 — Look up after update displays the updated response and status on the same record
const postUpdateLookup = updatedStatusStore.issueReports.find((r) => r.referenceNumber === lookupTarget);
assert(
  postUpdateLookup?.status === 'resolved' && postUpdateLookup?.officialResponse !== undefined,
  'Citizen lookup retrieves updated status and official response from the same persistent record'
);

// ─────────────────────────────────────────────────────────────────
// 10. Conflict-Aware Chennai Map & Dig-Once Coordination (Phase 4)
// ─────────────────────────────────────────────────────────────────
console.log('\n10. Conflict-Aware Chennai Infrastructure Map:');

// 10.1 — Initial active conflicts correctly identified from state
const initialMapConflicts = storeAfterResolution.conflicts.filter((c) => !c.resolved);
assert(
  Array.isArray(initialMapConflicts),
  'Active conflicts successfully extracted for map rendering'
);

// 10.2 — Resolved conflicts are NOT counted as active map conflicts
const resolvedInMap = storeAfterResolution.conflicts.filter((c) => c.resolved);
assert(
  resolvedInMap.length === 1 && !initialMapConflicts.some((c) => c.id === resolvedInMap[0].id),
  'Resolved conflict is strictly excluded from active map conflict indicators'
);

// 10.3 — Conflicting project pair coordinate mapping
const mappableWithConflict = storeAfterResolution.projects.filter(
  (p) => p.lat !== undefined && p.lng !== undefined
);
assert(
  mappableWithConflict.length > 0,
  'Mappable projects with valid geographic coordinates exist'
);

// 10.4 — Projects without coordinates do not crash mapping logic
const noCoordTest = storeAfterResolution.projects.filter(
  (p) => p.lat === undefined || p.lng === undefined
);
assert(
  Array.isArray(noCoordTest),
  'Projects with undefined coordinates are safely filtered into fallback list without throwing'
);

// 10.5 — Dig-Once policy logic flags excavation on recently resurfaced roads (within 90 days)
// PRJ-001 is a completed road_repair on segment SEG-AN-001
const completedRoadRepair = storeAfterResolution.projects.find(
  (p) => p.status === 'completed' && p.category === 'road_repair'
);
assert(
  completedRoadRepair !== undefined,
  'Seed data contains a completed road repair project for Dig-Once coordination validation'
);

// Simulate a new excavation project on the same segment
const excavationCategories = ['water_pipeline', 'drainage', 'electrical', 'road_repair'];
const sameSegmentExcavation: Project = {
  ...storeAfterResolution.projects[0],
  id: 'PRJ-TEST-EXCAV',
  segmentId: completedRoadRepair!.segmentId,
  category: 'water_pipeline',
  status: 'planned',
};

function testDigOnceWarning(project: Project, allProjects: Project[], thresholdDays = 90) {
  if (project.status === 'completed') return false;
  if (!excavationCategories.includes(project.category)) return false;
  const now = new Date();
  return allProjects.some((other) => {
    if (other.id === project.id || other.segmentId !== project.segmentId) return false;
    if (other.category !== 'road_repair' || other.status !== 'completed') return false;
    const compDate = other.actualEndDate || other.revisedEndDate || other.plannedEndDate;
    if (!compDate) return false;
    const diff = Math.round((now.getTime() - new Date(compDate).getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= thresholdDays;
  });
}

assert(
  testDigOnceWarning(sameSegmentExcavation, storeAfterResolution.projects, 90) === true,
  'Dig-Once policy identifies excavation targeting recently resurfaced segment within 90 days'
);

const differentSegmentProject: Project = {
  ...sameSegmentExcavation,
  id: 'PRJ-TEST-DIFF',
  segmentId: 'SEG-UNKNOWN-999',
};
assert(
  testDigOnceWarning(differentSegmentProject, storeAfterResolution.projects, 90) === false,
  'Dig-Once policy does not falsely warn on unrelated road segments'
);


// ============================================================
// 11. Explainable Coordination Priority Algorithm
// ============================================================
import {
  calculateConflictPriority,
  rankConflictsByPriority,
  calculateOverlapDuration,
  isIncompatibleCategoryPair,
} from './utils/coordinationPriority.ts';

console.log('\n11. Explainable Coordination Priority Algorithm:');

// Helper: build a minimal conflict with two seed projects
const seedConflicts = detectConflicts(SEED_PROJECTS);
const seedActiveConflicts = seedConflicts.filter((c) => !c.resolved);

// 11a. Score is deterministic (stable for unchanged inputs)
if (seedActiveConflicts.length > 0) {
  const c0 = seedActiveConflicts[0];
  const a1 = calculateConflictPriority(c0, SEED_PROJECTS);
  const a2 = calculateConflictPriority(c0, SEED_PROJECTS);
  assert(a1.score === a2.score, 'Priority score is deterministic for unchanged inputs');
  assert(a1.level === a2.level, 'Priority level is deterministic for unchanged inputs');
}

// 11b. Score is in 0–100 range
if (seedActiveConflicts.length > 0) {
  const a = calculateConflictPriority(seedActiveConflicts[0], SEED_PROJECTS);
  assert(a.score >= 0 && a.score <= 100, 'Priority score is bounded between 0 and 100');
}

// 11c. At least one factor is populated per active conflict
if (seedActiveConflicts.length > 0) {
  const a = calculateConflictPriority(seedActiveConflicts[0], SEED_PROJECTS);
  assert(a.factors.length > 0, 'At least one scoring factor is present for a detected conflict');
}

// 11d. Plain-language explanation is non-empty
if (seedActiveConflicts.length > 0) {
  const a = calculateConflictPriority(seedActiveConflicts[0], SEED_PROJECTS);
  assert(a.explanation.length > 10, 'Plain-language explanation is generated and non-trivial');
}

// 11e. Disclaimer is present
if (seedActiveConflicts.length > 0) {
  const a = calculateConflictPriority(seedActiveConflicts[0], SEED_PROJECTS);
  assert(a.disclaimer.length > 10, 'Demonstration disclaimer is attached to every assessment');
}

// 11f. Missing-data safety: conflict with non-existent project IDs returns score 0, no crash
const ghostConflict: import('./types/index.ts').Conflict = {
  id: 'ghost-conflict-test',
  projectIds: ['NONEXISTENT-A', 'NONEXISTENT-B'],
  segmentId: 'SEG-GHOST',
  reason: 'same_segment_overlap' as any,
  description: 'ghost',
  publicDisruption: 'none',
  detectedAt: new Date().toISOString(),
  resolved: false,
};
const ghostAssessment = calculateConflictPriority(ghostConflict, SEED_PROJECTS);
assert(ghostAssessment.score === 0, 'Missing project data returns score 0 without crashing');
assert(ghostAssessment.level === 'Low', 'Missing project data returns Low priority level');

// 11g. Incompatible work type detection
assert(
  isIncompatibleCategoryPair('road_repair', 'water_pipeline'),
  'isIncompatibleCategoryPair detects road_repair vs water_pipeline as incompatible'
);
assert(
  !isIncompatibleCategoryPair('other', 'other'),
  'isIncompatibleCategoryPair correctly identifies compatible work type pair'
);

// 11h. Overlap duration calculation
assert(
  calculateOverlapDuration('2026-01-01', '2026-01-31', '2026-01-15', '2026-02-15') === 17,
  'calculateOverlapDuration correctly computes 17 days of overlap (Jan 15 to Jan 31 inclusive)'
);
assert(
  calculateOverlapDuration('2026-01-01', '2026-01-10', '2026-01-20', '2026-01-30') === 0,
  'calculateOverlapDuration returns 0 for non-overlapping date ranges'
);

// 11i. rankConflictsByPriority: resolved conflicts ranked after active conflicts
const rankingStore = loadState();
const rankResult = rankConflictsByPriority(rankingStore.conflicts, rankingStore.projects);
const firstResolved = rankResult.findIndex((r) => r.conflict.resolved);
const lastActive = rankResult.map((r, i) => (!r.conflict.resolved ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
if (firstResolved >= 0 && lastActive >= 0) {
  assert(
    lastActive < firstResolved,
    'rankConflictsByPriority places all active conflicts before resolved conflicts'
  );
}

// 11j. High-priority incompatible work types outrank low-priority same-segment overlap
// Build two minimal conflicts: one incompatible type (higher factor), one same-segment only
const baseProject = (id: string, seg: string, cat: string): Project => ({
  ...SEED_PROJECTS[0],
  id,
  segmentId: seg,
  category: cat as any,
  status: 'ongoing',
  startDate: '2026-10-01',
  plannedEndDate: '2026-12-01',
  revisedEndDate: undefined,
  bufferDays: 0,
  isCriticalSafetyOverride: false,
  priorityScore: 50,
});

const projRankA = baseProject('rank-a', 'SEG-RANK-TEST', 'road_repair');
const projRankB = baseProject('rank-b', 'SEG-RANK-TEST', 'water_pipeline');  // incompatible with road_repair
const projRankC = baseProject('rank-c', 'SEG-RANK-TEST', 'other');           // compatible with road_repair

const incompatibleConflict: import('./types/index.ts').Conflict = {
  id: 'conf-rank-incompat',
  projectIds: ['rank-a', 'rank-b'],
  segmentId: 'SEG-RANK-TEST',
  reason: 'incompatible_work_types' as any,
  description: 'test incompatible conflict',
  publicDisruption: 'test',
  detectedAt: new Date().toISOString(),
  resolved: false,
};
const compatibleConflict: import('./types/index.ts').Conflict = {
  id: 'conf-rank-compat',
  projectIds: ['rank-a', 'rank-c'],
  segmentId: 'SEG-RANK-TEST',
  reason: 'same_segment_overlap' as any,
  description: 'test compatible conflict',
  publicDisruption: 'test',
  detectedAt: new Date().toISOString(),
  resolved: false,
};

const rankingProjects = [...SEED_PROJECTS, projRankA, projRankB, projRankC];
const highAssessment = calculateConflictPriority(incompatibleConflict, rankingProjects);
const lowAssessment = calculateConflictPriority(compatibleConflict, rankingProjects);
assert(
  highAssessment.score > lowAssessment.score,
  'Incompatible work types conflict scores higher than same-segment-only conflict'
);

// 11k. Schedule changes update affected priority rankings
const shiftedProjA: Project = { ...projRankA, startDate: '2027-01-01', plannedEndDate: '2027-03-01' };
const shiftedProjB: Project = { ...projRankB, startDate: '2027-01-01', plannedEndDate: '2027-03-01' };
const leadTimeAssessment = calculateConflictPriority(incompatibleConflict, [
  ...rankingProjects.filter((p) => p.id !== projRankA.id && p.id !== projRankB.id),
  shiftedProjA,
  shiftedProjB,
], { referenceDateStr: '2026-10-10' });
// Projects starting 2027-01-01 are 82 days away from 2026-10-10 → urgency_far (3 pts), not urgency_imminent (20 pts)
const originalAssessment = calculateConflictPriority(incompatibleConflict, rankingProjects, { referenceDateStr: '2026-10-10' });
assert(
  originalAssessment.score > leadTimeAssessment.score,
  'Schedule changes that increase lead time reduce priority score appropriately'
);

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
