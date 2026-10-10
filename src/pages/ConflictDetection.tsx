// ============================================================
// CitySync — Conflict Detection & Coordination Page
// ============================================================

import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
  ArrowRight,
  MapPin,
  Building2,
  Calendar,
  Zap,
  Info,
  CheckCheck,
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  X,
  FileText,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import {
  generateResolutionOptions,
  simulateScheduleAdjustment,
  addDaysToDateStr,
  daysBetweenDateStr,
} from '../utils/conflictDetection';
import {
  formatDate,
  formatDateTime,
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
} from '../utils';
import type { Conflict, ConflictResolutionOption, Project, ResolutionCategory } from '../types';

export const RESOLUTION_CATEGORIES: { id: ResolutionCategory; label: string }[] = [
  { id: 'sequential_delay', label: 'Sequential Delay (Finish First Project Prior to Next)' },
  { id: 'joint_excavation', label: 'Joint Coordination (Simultaneous Shared Trenching)' },
  { id: 'fast_track', label: 'Fast-Track Acceleration (Compress Timeline)' },
  { id: 'emergency_reschedule', label: 'Emergency Priority Override' },
  { id: 'route_diversion', label: 'Phased Work & Traffic Diversion' },
  { id: 'other', label: 'Administrative Schedule Adjustment' },
];

export const RESOLUTION_CATEGORY_LABELS: Record<ResolutionCategory, string> = {
  sequential_delay: 'Sequential Delay',
  joint_excavation: 'Joint Coordination',
  fast_track: 'Fast-Track',
  emergency_reschedule: 'Emergency Override',
  route_diversion: 'Traffic Diversion',
  other: 'Administrative Adjustment',
};

// ── What-If Interactive Scheduling Simulator Panel ────────────

function WhatIfSimulatorPanel({
  conflict,
  projects,
  onApply,
  onCancel,
  isGovernment,
}: {
  conflict: Conflict;
  projects: Project[];
  onApply: (
    conflictId: string,
    changes: { projectId: string; field: 'startDate' | 'revisedEndDate'; newValue: string }[],
    label: string,
    category: ResolutionCategory,
    justification: string,
    citizenExplanation: string
  ) => void;
  onCancel: () => void;
  isGovernment: boolean;
}) {
  const [idA, idB] = conflict.projectIds;
  const projectA = projects.find((p) => p.id === idA);
  const projectB = projects.find((p) => p.id === idB);

  // Target project to adjust (defaults to project B)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(idB);
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [decisionCategory, setDecisionCategory] = useState<ResolutionCategory>('sequential_delay');
  const [justification, setJustification] = useState<string>('');
  const [citizenExplanation, setCitizenExplanation] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const targetProject = projects.find((p) => p.id === selectedProjectId);
  const otherProject = projects.find((p) => p.id === (selectedProjectId === idA ? idB : idA));

  // Baseline approved dates
  const baselineStart = targetProject?.startDate || '';
  const baselineEnd = targetProject?.revisedEndDate || targetProject?.plannedEndDate || '';
  const baselineDuration = Math.max(1, daysBetweenDateStr(baselineStart, baselineEnd));

  // Proposed dates computed safely
  const proposedStart = customStartDate ?? addDaysToDateStr(baselineStart, dayOffset);
  const proposedEnd = customEndDate ?? addDaysToDateStr(baselineEnd, dayOffset);

  // Recommended clearance offset
  const otherEnd = otherProject ? (otherProject.revisedEndDate || otherProject.plannedEndDate) : '';
  const minClearanceStart = otherEnd ? addDaysToDateStr(otherEnd, (otherProject?.bufferDays || 0) + 1) : '';
  const recommendedOffset = (baselineStart && minClearanceStart) ? daysBetweenDateStr(baselineStart, minClearanceStart) : 0;

  // Live simulation dry run
  const simResult = useMemo(() => {
    return simulateScheduleAdjustment(projects, conflict.id, [
      {
        projectId: selectedProjectId,
        newStartDate: proposedStart,
        newEndDate: proposedEnd,
      },
    ]);
  }, [projects, conflict.id, selectedProjectId, proposedStart, proposedEnd]);

  const handlePresetClick = (offset: number) => {
    setDayOffset(offset);
    setCustomStartDate(null);
    setCustomEndDate(null);
    setValidationError(null);
  };

  const handleSliderChange = (offset: number) => {
    setDayOffset(offset);
    setCustomStartDate(null);
    setCustomEndDate(null);
    setValidationError(null);
  };

  const handleStartDateChange = (val: string) => {
    setCustomStartDate(val);
    const offset = daysBetweenDateStr(baselineStart, val);
    setDayOffset(offset);
    setCustomEndDate(addDaysToDateStr(val, baselineDuration));
    setValidationError(null);
  };

  const handleEndDateChange = (val: string) => {
    setCustomEndDate(val);
    setValidationError(null);
  };

  const handleConfirm = () => {
    setValidationError(null);
    if (!isGovernment) {
      setValidationError('Government authorization required to commit schedule changes.');
      return;
    }
    if (!justification.trim() || justification.trim().length < 10) {
      setValidationError('Coordinator justification is mandatory (at least 10 characters).');
      return;
    }
    if (!citizenExplanation.trim() || citizenExplanation.trim().length < 10) {
      setValidationError('Citizen-facing explanation is mandatory (at least 10 characters).');
      return;
    }

    const offsetStr = dayOffset >= 0 ? `+${dayOffset}d` : `${dayOffset}d`;
    const label = `What-If: ${RESOLUTION_CATEGORY_LABELS[decisionCategory]} (${offsetStr})`;

    onApply(
      conflict.id,
      [
        { projectId: selectedProjectId, field: 'startDate', newValue: proposedStart },
        { projectId: selectedProjectId, field: 'revisedEndDate', newValue: proposedEnd },
      ],
      label,
      decisionCategory,
      justification.trim(),
      citizenExplanation.trim()
    );
  };

  return (
    <div className="bg-gradient-to-b from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border-2 border-blue-400/80 dark:border-blue-600/80 rounded-2xl p-5 space-y-5 animate-fade-in">
      {/* Sandbox Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 dark:border-blue-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                Interactive What-If Scheduling Simulator
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                Sandbox Mode · Not Committed
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Experiment with alternative project timelines. Live conflict recalculation runs in memory until explicitly confirmed.
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition"
          title="Close Simulator"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Project to Adjust Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
          <span>1. Select Project to Adjust Timeline:</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {projectA && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId(projectA.id);
                setDayOffset(0);
                setCustomStartDate(null);
                setCustomEndDate(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedProjectId === projectA.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300 dark:ring-blue-800'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="font-bold truncate">{projectA.title}</div>
              <div className={`text-[11px] mt-0.5 ${selectedProjectId === projectA.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {projectA.department} · {CATEGORY_LABELS[projectA.category]}
              </div>
              <div className={`mt-2 font-mono text-[11px] pt-1.5 border-t ${selectedProjectId === projectA.id ? 'border-blue-500/50 text-blue-100' : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                Baseline: {formatDate(projectA.startDate)} → {formatDate(projectA.revisedEndDate || projectA.plannedEndDate)}
              </div>
            </button>
          )}

          {projectB && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId(projectB.id);
                setDayOffset(0);
                setCustomStartDate(null);
                setCustomEndDate(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedProjectId === projectB.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300 dark:ring-blue-800'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold truncate">{projectB.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${selectedProjectId === projectB.id ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  Recommended Lever
                </span>
              </div>
              <div className={`text-[11px] mt-0.5 ${selectedProjectId === projectB.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {projectB.department} · {CATEGORY_LABELS[projectB.category]}
              </div>
              <div className={`mt-2 font-mono text-[11px] pt-1.5 border-t ${selectedProjectId === projectB.id ? 'border-blue-500/50 text-blue-100' : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                Baseline: {formatDate(projectB.startDate)} → {formatDate(projectB.revisedEndDate || projectB.plannedEndDate)}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            2. Quick Scheduling Presets:
          </label>
          <span className="text-[11px] text-gray-400 italic">Timezone-safe calendar offsets</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => handlePresetClick(0)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition ${
              dayOffset === 0 && customStartDate === null
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-400 font-bold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            🔄 Original Schedule (0d)
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick(14)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition ${
              dayOffset === 14 && customStartDate === null
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-400 font-bold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            ⏩ Shift by +14 Days
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick(26)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition ${
              dayOffset === 26 && customStartDate === null
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-400 font-bold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            ⏩ Shift by +26 Days
          </button>
          <button
            type="button"
            onClick={() => handlePresetClick(-10)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition ${
              dayOffset === -10 && customStartDate === null
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-400 font-bold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            ⚡ Fast-Track by -10 Days
          </button>
          {recommendedOffset > 0 && (
            <button
              type="button"
              onClick={() => handlePresetClick(recommendedOffset)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                dayOffset === recommendedOffset && customStartDate === null
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-400 font-bold'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              ✨ Optimal Clearance (+{recommendedOffset}d)
            </button>
          )}
        </div>
      </div>

      {/* Date Adjustment Slider & Date Inputs */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 text-xs">
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Interactive Date Offset Slider:
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
              {dayOffset >= 0 ? `+${dayOffset}` : dayOffset} Days Shift
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={90}
            step={1}
            value={dayOffset}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>-30d (Fast-Track)</span>
            <span>0d (Baseline)</span>
            <span>+45d</span>
            <span>+90d (Postpone)</span>
          </div>
        </div>

        {/* Date Input Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-750">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Proposed Start Date:
            </label>
            <input
              type="date"
              value={proposedStart}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-[10px] text-gray-400 mt-1">Baseline: {formatDate(baselineStart)}</div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Proposed Completion Date:
            </label>
            <input
              type="date"
              value={proposedEnd}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-[10px] text-gray-400 mt-1">Baseline: {formatDate(baselineEnd)}</div>
          </div>
        </div>
      </div>

      {/* Live Conflict Recalculation Results */}
      <div className={`p-4 rounded-xl border transition-all ${
        simResult.isTargetConflictResolved
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {simResult.isTargetConflictResolved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div>
              <span className="font-extrabold text-sm">
                {simResult.isTargetConflictResolved
                  ? 'SIMULATION RESULT: CONFLICT RESOLVED'
                  : 'SIMULATION RESULT: CONFLICT REMAINS ACTIVE'}
              </span>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">
                {simResult.explanation}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right text-xs">
            <span className="font-bold">
              {simResult.isTargetConflictResolved ? '0 Active' : '1 Active'}
            </span>
            <div className="text-[10px] opacity-75">on this segment</div>
          </div>
        </div>

        {simResult.newConflictsIntroduced.length > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Warning: This date shift introduces {simResult.newConflictsIntroduced.length} secondary conflict(s) with other road segments!</span>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between text-xs gap-2">
          <span>
            Added Schedule Delay: <strong>+{simResult.delayDays} days</strong>
          </span>
          <span>
            City-Wide Conflicts Remaining: <strong>{simResult.remainingConflictsCount}</strong>
          </span>
        </div>
      </div>

      {/* Confirmation & Justification Inputs */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 text-xs">
        <div className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-[11px]">
          3. Coordinator Decision Record & Justification (Required to Commit):
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Decision Category:
          </label>
          <select
            value={decisionCategory}
            onChange={(e) => setDecisionCategory(e.target.value as ResolutionCategory)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
          >
            {RESOLUTION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Coordinator Technical Justification <span className="text-red-500">*</span>:
          </label>
          <textarea
            rows={2}
            value={justification}
            onChange={(e) => {
              setJustification(e.target.value);
              setValidationError(null);
            }}
            placeholder="e.g., Postponed cable laying start date to follow carriageway base completion, ensuring underground works are sequenced prior to surface asphalt laying."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Plain-Language Public Explanation <span className="text-red-500">*</span>:
          </label>
          <textarea
            rows={2}
            value={citizenExplanation}
            onChange={(e) => {
              setCitizenExplanation(e.target.value);
              setValidationError(null);
            }}
            placeholder="e.g., Rescheduled street work to prevent digging up the road twice. Power cables will be installed before the road surface is repaved."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {validationError && (
          <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs">
            {validationError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-750">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-xs py-1.5 px-4"
          >
            Cancel Simulation
          </button>

          {isGovernment ? (
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Apply Schedule
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              Demonstration Mode (Government Perspective Required to Commit)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────

export default function ConflictDetection() {
  const { state, applyResolution, isGovernment, isPublic } = useApp();
  const { t } = useTranslation();
  const { projects, conflicts } = state;

  // Simulator toggle per conflict ID
  const [simulatingConflictId, setSimulatingConflictId] = useState<string | null>(null);

  // Selected resolution modal state
  const [confirmModal, setConfirmModal] = useState<{
    conflict: Conflict;
    option: ConflictResolutionOption;
    category: ResolutionCategory;
    justification: string;
    citizenExplanation: string;
  } | null>(null);

  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'resolved'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Counts
  const stats = useMemo(() => {
    const total = conflicts.length;
    const active = conflicts.filter((c) => !c.resolved).length;
    const resolved = conflicts.filter((c) => c.resolved).length;
    return { total, active, resolved };
  }, [conflicts]);

  const displayedConflicts = useMemo(() => {
    if (filterMode === 'active') return conflicts.filter((c) => !c.resolved);
    if (filterMode === 'resolved') return conflicts.filter((c) => c.resolved);
    return conflicts;
  }, [conflicts, filterMode]);

  // Priority ranking list
  const rankedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      // Critical safety override takes highest precedence
      if (a.isCriticalSafetyOverride && !b.isCriticalSafetyOverride) return -1;
      if (!a.isCriticalSafetyOverride && b.isCriticalSafetyOverride) return 1;
      return b.priorityScore - a.priorityScore;
    });
  }, [projects]);

  const handleApplyResolution = () => {
    if (!confirmModal) return;
    const { conflict, option, category, justification, citizenExplanation } = confirmModal;

    applyResolution(
      conflict.id,
      option.changes,
      option.label,
      category,
      justification,
      citizenExplanation
    );
    setSuccessToast(`Resolution successfully applied: "${option.label}"`);
    setConfirmModal(null);

    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const handleApplyFromSimulator = (
    conflictId: string,
    changes: { projectId: string; field: 'startDate' | 'revisedEndDate'; newValue: string }[],
    label: string,
    category: ResolutionCategory,
    justification: string,
    citizenExplanation: string
  ) => {
    applyResolution(conflictId, changes, label, category, justification, citizenExplanation);
    setSuccessToast(`Schedule adjustment confirmed & applied: "${label}"`);
    setSimulatingConflictId(null);

    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-teal-700 animate-slide-up">
          <CheckCheck className="w-5 h-5 text-teal-300" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              Automated Coordination Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              {isGovernment ? t('conflicts.title') : t('conflicts.titlePublic')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
              {t('conflicts.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isGovernment ? (
              <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Government Mode · Actionable Sequencing
              </span>
            ) : (
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Public View · Advisory Conflict Viewer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-orange-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Conflicts</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.active}</div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-medium">Require schedule coordination</div>
          </div>
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/60 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-teal-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Resolved Conflicts</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.resolved}</div>
            <div className="text-xs text-teal-600 dark:text-teal-400 mt-0.5 font-medium">Schedules re-aligned</div>
          </div>
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-950/60 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Detected</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">Across active segments</div>
          </div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Priority Algorithm Explanation Card */}
      <div className="card p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-md border-0 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full pointer-events-none blur-2xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold">Transparent Priority Resolution Formula</h2>
            </div>
            <span className="text-xs bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full font-medium border border-amber-400/30">
              Prototype Assumptions · Not Official Standards
            </span>
          </div>

          <p className="text-sm text-blue-200/90 leading-relaxed max-w-4xl">
            When multiple departments contend for the same infrastructure segment, CivicTrack computes a weighted priority index to objectively recommend which project proceeds first or retains its window. Urgent life-safety emergencies invoke an override.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-300 text-xs font-semibold uppercase">Public Safety</div>
              <div className="text-xl font-black mt-1">30%</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Physical hazard mitigation</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-300 text-xs font-semibold uppercase">Essential Service</div>
              <div className="text-xl font-black mt-1">25%</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Water, power, hospitals</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-300 text-xs font-semibold uppercase">Dependency Impact</div>
              <div className="text-xl font-black mt-1">20%</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Downstream project blocks</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-300 text-xs font-semibold uppercase">Urgency</div>
              <div className="text-xl font-black mt-1">15%</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Deadline/monsoon pressure</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-300 text-xs font-semibold uppercase">Public Disruption</div>
              <div className="text-xl font-black mt-1">10%</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Commute detour impact</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-blue-200/80 pt-2 border-t border-white/10 gap-2">
            <div>
              <span className="font-mono bg-black/30 px-2 py-1 rounded text-blue-300">
                Score = (30×Safety + 25×Essential + 20×Dep + 15×Urg + 10×Disruption) / 5
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-300 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Critical Safety Override unconditionally ranks top priority
            </div>
          </div>
        </div>
      </div>

      {/* Conflicts List Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detected Scheduling Conflicts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Review spatial overlaps and apply mathematically-ranked resolution alternatives
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All ({conflicts.length})
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'active'
                  ? 'bg-white dark:bg-gray-700 text-orange-700 dark:text-orange-400 shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilterMode('resolved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterMode === 'resolved'
                  ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Resolved ({stats.resolved})
            </button>
          </div>
        </div>

        {displayedConflicts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No conflicts in this category</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              All infrastructure works are properly sequenced with adequate buffer periods.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedConflicts.map((conflict) => {
              const projectA = projects.find((p) => p.id === conflict.projectIds[0]);
              const projectB = projects.find((p) => p.id === conflict.projectIds[1]);
              const resolutions = generateResolutionOptions(conflict, projects);

              return (
                <div
                  key={conflict.id}
                  className={`card border overflow-hidden transition-all duration-200 ${
                    conflict.resolved
                      ? 'border-gray-200 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-850/50'
                      : 'border-orange-200 dark:border-orange-800/80 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-orange-500/10'
                  }`}
                >
                  {/* Conflict Card Header */}
                  <div
                    className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                      conflict.resolved
                        ? 'bg-gray-100/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-orange-50/70 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-2 rounded-lg ${
                          conflict.resolved
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                            : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {conflict.resolved ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            Conflict on Segment:{' '}
                            <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                              {projectA?.segmentId || 'SEG-ID'}
                            </span>
                          </span>
                          <span
                            className={`badge ${
                              conflict.resolved
                                ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                                : 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300'
                            }`}
                          >
                            {conflict.resolved ? 'Resolved' : 'Active Overlap'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Detected: {formatDateTime(conflict.detectedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Reason:{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {conflict.reason === 'incompatible_work_types'
                          ? 'Incompatible Simultaneous Works'
                          : 'Temporal Schedule Overlap'}
                      </span>
                    </div>
                  </div>

                  {/* Conflict Card Body */}
                  <div className="p-6 space-y-6">
                    {/* Projects Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Project A */}
                      {projectA && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-750/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                          <div className="flex items-center justify-between mb-2">
                            <span className="badge bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                              {CATEGORY_LABELS[projectA.category] || projectA.category}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Score: {projectA.priorityScore}/100
                            </span>
                          </div>
                          <NavLink
                            to={`/projects/${projectA.id}`}
                            className="font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1.5 group text-sm"
                          >
                            {projectA.title}
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                          </NavLink>
                          <div className="space-y-1 mt-3 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                              <span>{projectA.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                              <span>{projectA.location}</span>
                            </div>
                            <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 pt-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>
                                {formatDate(projectA.startDate)} →{' '}
                                {formatDate(projectA.revisedEndDate || projectA.plannedEndDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Project B */}
                      {projectB && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-750/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                          <div className="flex items-center justify-between mb-2">
                            <span className="badge bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                              {CATEGORY_LABELS[projectB.category] || projectB.category}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Score: {projectB.priorityScore}/100
                            </span>
                          </div>
                          <NavLink
                            to={`/projects/${projectB.id}`}
                            className="font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1.5 group text-sm"
                          >
                            {projectB.title}
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                          </NavLink>
                          <div className="space-y-1 mt-3 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                              <span>{projectB.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                              <span>{projectB.location}</span>
                            </div>
                            <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 pt-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>
                                {formatDate(projectB.startDate)} →{' '}
                                {formatDate(projectB.revisedEndDate || projectB.plannedEndDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Conflict Explanation & Impact */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="font-semibold">Conflict Analysis: </strong>
                          {conflict.description}
                        </div>
                      </div>
                      <div className="text-amber-800 dark:text-amber-300 pl-6">
                        <strong className="font-semibold">Likely Public Disruption: </strong>
                        {conflict.publicDisruption}
                      </div>
                    </div>

                    {/* Resolved Conflict Details View */}
                    {conflict.resolved && (
                      <div className="bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            <span>Conflict Resolved & Timeline Synchronized</span>
                          </div>
                          {conflict.resolvedAt && (
                            <span className="text-xs text-teal-700 dark:text-teal-300 font-mono">
                              Resolved: {formatDateTime(conflict.resolvedAt)}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg border border-teal-100 dark:border-teal-900/60">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Applied Decision:</span>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                              {conflict.resolutionApplied || 'Schedule Adjusted'}
                            </div>
                            {conflict.resolutionCategory && (
                              <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
                                Category: {RESOLUTION_CATEGORY_LABELS[conflict.resolutionCategory] || conflict.resolutionCategory}
                              </div>
                            )}
                          </div>

                          <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg border border-teal-100 dark:border-teal-900/60">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Coordinator Justification:</span>
                            <div className="text-gray-800 dark:text-gray-200 mt-0.5">
                              {conflict.justification || 'Schedule coordinated to eliminate simultaneous excavation.'}
                            </div>
                          </div>
                        </div>

                        {conflict.citizenExplanation && (
                          <div className="text-xs bg-white/70 dark:bg-gray-800/70 p-3 rounded-lg border border-teal-100 dark:border-teal-900/60">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Public Citizen Explanation:</span>
                            <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                              {conflict.citizenExplanation}
                            </p>
                          </div>
                        )}

                        {conflict.changesApplied && conflict.changesApplied.length > 0 && (
                          <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-xs">
                            <span className="font-semibold text-teal-900 dark:text-teal-200">Timeline Changes Recorded:</span>
                            <div className="mt-1 space-y-1">
                              {conflict.changesApplied.map((ch, idx) => {
                                const p = projects.find((proj) => proj.id === ch.projectId);
                                return (
                                  <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">{p?.title || ch.projectId}:</span>
                                    <span className="text-gray-400 line-through">{ch.previousValue}</span>
                                    <ArrowRight className="w-3 h-3 text-teal-600" />
                                    <span className="font-bold text-teal-700 dark:text-teal-300">{ch.newValue}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Conflict Coordination & What-If Simulator Section */}
                    {!conflict.resolved && (
                      <div className="space-y-4">
                        {/* Simulator Action Banner / Toggle Button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                              <SlidersHorizontal className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                What-If Scheduling Sandbox
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                Experiment with date offsets and preview live conflict recalculation prior to confirming
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSimulatingConflictId(
                                simulatingConflictId === conflict.id ? null : conflict.id
                              )
                            }
                            className={`text-xs py-1.5 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                              simulatingConflictId === conflict.id
                                ? 'bg-gray-200 dark:bg-gray-750 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                                : 'btn-primary shadow-sm'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {simulatingConflictId === conflict.id
                              ? 'Close Simulator'
                              : 'Open What-If Simulator'}
                          </button>
                        </div>

                        {/* Interactive What-If Simulator Panel */}
                        {simulatingConflictId === conflict.id && (
                          <WhatIfSimulatorPanel
                            conflict={conflict}
                            projects={projects}
                            onApply={handleApplyFromSimulator}
                            onCancel={() => setSimulatingConflictId(null)}
                            isGovernment={isGovernment}
                          />
                        )}

                        {/* Suggested Alternatives Grid */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              Calculated Alternative Options
                            </h4>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                              Click to simulate or directly review consequences
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {resolutions.map((opt, idx) => (
                              <div
                                key={opt.id}
                                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                  idx === 0 && opt.id !== 'opt-keep'
                                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 ring-1 ring-blue-400/40 dark:ring-blue-500/40'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs flex items-center gap-1.5">
                                      {idx === 0 && opt.id !== 'opt-keep' && (
                                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                          Best
                                        </span>
                                      )}
                                      {opt.label}
                                    </div>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                                        opt.addedDelayDays === 0
                                          ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                      }`}
                                    >
                                      +{opt.addedDelayDays}d delay
                                    </span>
                                  </div>

                                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {opt.description}
                                  </p>

                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <strong>Trade-off:</strong> {opt.explanation}
                                  </div>
                                </div>

                                <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Disruption index: <strong>{opt.disruptionScore}/10</strong>
                                  </div>

                                  {opt.changes.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      {/* Load Into Simulator button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSimulatingConflictId(conflict.id);
                                        }}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                      >
                                        Simulate
                                      </button>

                                      {isGovernment ? (
                                        <button
                                          onClick={() =>
                                            setConfirmModal({
                                              conflict,
                                              option: opt,
                                              category: 'sequential_delay',
                                              justification: opt.explanation,
                                              citizenExplanation: `Work rescheduled to prevent uncoordinated road disruption on this segment.`,
                                            })
                                          }
                                          className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                                        >
                                          Apply
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border">
                                          Advisory
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                      No changes
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Priority Ranking Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              City-Wide Project Priority Ranking
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Transparent priority rankings determine sequencing order during scheduling conflicts
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Formula scale: <strong>0 – 100 points</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Project Title</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-center">Safety (30%)</th>
                <th className="px-4 py-3 text-center">Essential (25%)</th>
                <th className="px-4 py-3 text-center">Dependency (20%)</th>
                <th className="px-4 py-3 text-center">Urgency (15%)</th>
                <th className="px-4 py-3 text-center">Disruption (10%)</th>
                <th className="px-4 py-3 text-right">Priority Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {rankedProjects.map((proj, idx) => (
                <tr
                  key={proj.id}
                  className={`hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition ${
                    proj.isCriticalSafetyOverride ? 'bg-rose-50/40 dark:bg-rose-950/30 font-medium' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-bold">#{idx + 1}</td>
                  <td className="px-4 py-3">
                    <NavLink
                      to={`/projects/${proj.id}`}
                      className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1.5"
                    >
                      {proj.title}
                      {proj.isCriticalSafetyOverride && (
                        <span className="badge bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px]">
                          Emergency Override
                        </span>
                      )}
                    </NavLink>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Segment: {proj.segmentId} · {proj.neighborhood}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{proj.department}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {proj.priorityInputs.publicSafety}/5
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {proj.priorityInputs.essentialService}/5
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {proj.priorityInputs.dependencyImpact}/5
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {proj.priorityInputs.urgency}/5
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {proj.priorityInputs.publicDisruption}/5
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                        {proj.priorityScore}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">/ 100</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Confirm Schedule Resolution</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Coordination & Recalculation</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to apply the recommendation{' '}
              <strong className="text-gray-900 dark:text-gray-100">"{confirmModal.option.label}"</strong>?
            </p>

            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="font-semibold text-gray-700 dark:text-gray-200">Proposed Timeline Updates:</div>
              {confirmModal.option.changes.map((ch, idx) => {
                const targetProj = projects.find((p) => p.id === ch.projectId);
                return (
                  <div key={idx} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <span className="truncate max-w-[200px] font-medium">
                      {targetProj?.title}
                    </span>
                    <span className="font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-750 text-blue-700 dark:text-blue-400">
                      {ch.field}: {ch.newValue}
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 italic">
                * This will recalculate conflicts across all projects and record an audit log in project history.
              </div>
            </div>

            {/* Coordinator Inputs in Confirmation Modal */}
            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Resolution Category
                </label>
                <select
                  value={confirmModal.category}
                  onChange={(e) =>
                    setConfirmModal({
                      ...confirmModal,
                      category: e.target.value as ResolutionCategory,
                    })
                  }
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {RESOLUTION_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Coordinator Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={confirmModal.justification}
                  onChange={(e) =>
                    setConfirmModal({
                      ...confirmModal,
                      justification: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Technical justification for this coordination action..."
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Citizen-Facing Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={confirmModal.citizenExplanation}
                  onChange={(e) =>
                    setConfirmModal({
                      ...confirmModal,
                      citizenExplanation: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Public explanation describing why this schedule change avoids disruption..."
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyResolution}
                disabled={!confirmModal.justification.trim() || !confirmModal.citizenExplanation.trim()}
                className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
