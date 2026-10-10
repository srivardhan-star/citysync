// ============================================================
// CivicTrack — Projects Listing Page
// ============================================================

import { useState, useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  SortAsc,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Building2,
  TrendingUp,
  X,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import type { Project, ProjectCategory, ProjectStatus, ProjectPriority, PriorityInputs } from '../types';
import {
  calculateDelay,
  calculatePriorityScore,
  generateId,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  DEPARTMENT_LIST,
  PRIORITY_COLORS,
} from '../utils';

// ── Types ─────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'priority_desc' | 'progress_desc' | 'deadline_asc';

interface FormState {
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  description: string;
  reason: string;
  department: string;
  contractorName: string;
  contractorContact: string;
  segmentId: string;
  location: string;
  neighborhood: string;
  startDate: string;
  plannedEndDate: string;
  progress: number;
  priority: ProjectPriority;
  publicSafety: number;
  essentialService: number;
  dependencyImpact: number;
  urgency: number;
  publicDisruption: number;
  inconvenienceDescription: string;
  alternativeRoute: string;
  bufferDays: number;
}

const DEFAULT_FORM: FormState = {
  title: '',
  category: 'road_repair',
  status: 'planned',
  description: '',
  reason: '',
  department: DEPARTMENT_LIST[0],
  contractorName: '',
  contractorContact: '',
  segmentId: '',
  location: '',
  neighborhood: '',
  startDate: '',
  plannedEndDate: '',
  progress: 0,
  priority: 'medium',
  publicSafety: 0,
  essentialService: 0,
  dependencyImpact: 0,
  urgency: 0,
  publicDisruption: 0,
  inconvenienceDescription: '',
  alternativeRoute: '',
  bufferDays: 7,
};

// ── Sub-components ────────────────────────────────────────────

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct === 100
      ? 'bg-green-500'
      : pct >= 60
      ? 'bg-blue-500'
      : pct >= 30
      ? 'bg-amber-500'
      : 'bg-red-400';

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PrioritySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-100">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const delay = calculateDelay(project);
  const completedMilestones = project.milestones.filter((m) => m.completed).length;
  const totalMilestones = project.milestones.length;

  return (
    <NavLink
      to={`/projects/${project.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group"
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Badge className={STATUS_COLORS[project.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
            <Badge className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {CATEGORY_LABELS[project.category] ?? project.category}
            </Badge>
            <Badge className={PRIORITY_COLORS[project.priority] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}>
              {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </Badge>
          </div>
          <ChevronRight
            size={16}
            className="text-gray-400 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors"
          />
        </div>

        <h3 className="mt-2.5 text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {project.title}
        </h3>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Building2 size={11} />
            {project.department}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {project.location}
            {project.neighborhood ? `, ${project.neighborhood}` : ''}
          </span>
          {project.contractorName && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {project.contractorName}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span className="flex items-center gap-1">
            <TrendingUp size={11} />
            Progress
          </span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      {/* Dates + Delay */}
      <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700/80 pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            Start: {formatDate(project.startDate)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            End: {formatDate(project.plannedEndDate)}
          </span>
          {project.revisedEndDate && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock size={11} />
              Revised: {formatDate(project.revisedEndDate)}
            </span>
          )}
        </div>

        {delay.isDelayed && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle size={12} />
            {delay.comparisonLabel}
          </div>
        )}
      </div>

      {/* Milestones */}
      {totalMilestones > 0 && (
        <div className="px-4 pb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Milestones:{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {completedMilestones}/{totalMilestones}
            </span>{' '}
            completed
          </span>
        </div>
      )}

      {/* Priority score */}
      <div className="px-4 pb-4">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Priority score:{' '}
          <span className="font-semibold text-gray-600 dark:text-gray-300">{project.priorityScore}</span>
        </span>
      </div>
    </NavLink>
  );
}

// ── Add Project Modal ─────────────────────────────────────────

interface AddProjectModalProps {
  onClose: () => void;
  onSubmit: (project: Project) => void;
}

function AddProjectModal({ onClose, onSubmit }: AddProjectModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [step, setStep] = useState<1 | 2>(1);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required.';
    if (!form.segmentId.trim()) newErrors.segmentId = 'Segment ID is required.';
    if (!form.startDate) newErrors.startDate = 'Start date is required.';
    if (!form.plannedEndDate) newErrors.plannedEndDate = 'Planned end date is required.';
    if (form.startDate && form.plannedEndDate && form.plannedEndDate < form.startDate) {
      newErrors.plannedEndDate = 'End date must be after start date.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setStep(1);
      return;
    }

    const priorityInputs: PriorityInputs = {
      publicSafety: form.publicSafety,
      essentialService: form.essentialService,
      dependencyImpact: form.dependencyImpact,
      urgency: form.urgency,
      publicDisruption: form.publicDisruption,
    };

    const now = new Date().toISOString();
    const project: Project = {
      id: generateId('PRJ'),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      reason: form.reason.trim(),
      department: form.department,
      contractorName: form.contractorName.trim(),
      contractorContact: form.contractorContact.trim(),
      segmentId: form.segmentId.trim(),
      location: form.location.trim(),
      neighborhood: form.neighborhood.trim(),
      startDate: form.startDate,
      plannedEndDate: form.plannedEndDate,
      status: form.status,
      progress: Math.min(100, Math.max(0, form.progress)),
      inconvenienceDescription: form.inconvenienceDescription.trim(),
      alternativeRoute: form.alternativeRoute.trim() || undefined,
      priority: form.priority,
      priorityInputs,
      priorityScore: calculatePriorityScore(priorityInputs),
      isCriticalSafetyOverride: false,
      milestones: [],
      delayRecords: [],
      activityHistory: [
        {
          id: generateId('ACT'),
          timestamp: now,
          type: 'created',
          description: 'Project created.',
        },
      ],
      bufferDays: form.bufferDays,
      createdAt: now,
      updatedAt: now,
    };

    onSubmit(project);
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const errorCls = 'text-xs text-red-600 dark:text-red-400 mt-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add New Project</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Step {step} of 2 — {step === 1 ? 'Basic Details' : 'Priority & Disruption'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 gap-4">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`py-2.5 text-sm font-medium border-b-2 transition ${
                step === s
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {s === 1 ? 'Basic Details' : 'Priority & Disruption'}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                {/* Title */}
                <div>
                  <label className={labelCls}>
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Main Street Resurfacing Phase 2"
                    className={inputCls}
                  />
                  {errors.title && <p className={errorCls}>{errors.title}</p>}
                </div>

                {/* Category + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value as ProjectCategory)}
                      className={inputCls}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value as ProjectStatus)}
                      className={inputCls}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={3}
                    placeholder="Brief description of the project scope..."
                    className={inputCls}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className={labelCls}>Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setField('reason', e.target.value)}
                    rows={2}
                    placeholder="Why is this project needed?"
                    className={inputCls}
                  />
                </div>

                {/* Department */}
                <div>
                  <label className={labelCls}>Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setField('department', e.target.value)}
                    className={inputCls}
                  >
                    {DEPARTMENT_LIST.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Contractor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Contractor Name</label>
                    <input
                      type="text"
                      value={form.contractorName}
                      onChange={(e) => setField('contractorName', e.target.value)}
                      placeholder="Company or individual name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Contractor Contact</label>
                    <input
                      type="text"
                      value={form.contractorContact}
                      onChange={(e) => setField('contractorContact', e.target.value)}
                      placeholder="Phone or email"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Segment ID */}
                <div>
                  <label className={labelCls}>
                    Segment ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.segmentId}
                    onChange={(e) => setField('segmentId', e.target.value)}
                    placeholder="e.g. SEG-0042 (used for conflict detection)"
                    className={inputCls}
                  />
                  {errors.segmentId && <p className={errorCls}>{errors.segmentId}</p>}
                </div>

                {/* Location + Neighborhood */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setField('location', e.target.value)}
                      placeholder="Street address or area"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Neighborhood</label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={(e) => setField('neighborhood', e.target.value)}
                      placeholder="District / ward"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setField('startDate', e.target.value)}
                      className={inputCls}
                    />
                    {errors.startDate && <p className={errorCls}>{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>
                      Planned End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.plannedEndDate}
                      onChange={(e) => setField('plannedEndDate', e.target.value)}
                      className={inputCls}
                    />
                    {errors.plannedEndDate && <p className={errorCls}>{errors.plannedEndDate}</p>}
                  </div>
                </div>

                {/* Progress + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Progress (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.progress}
                      onChange={(e) => setField('progress', Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Priority Level</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setField('priority', e.target.value as ProjectPriority)}
                      className={inputCls}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                {/* Priority Inputs */}
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Priority Score Inputs</h3>
                    <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                      Calculated score:{' '}
                      <strong>
                        {calculatePriorityScore({
                          publicSafety: form.publicSafety,
                          essentialService: form.essentialService,
                          dependencyImpact: form.dependencyImpact,
                          urgency: form.urgency,
                          publicDisruption: form.publicDisruption,
                        })}
                      </strong>
                      /100
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Rate each factor 0–5. Weights: Safety 30%, Essential 25%, Dependency 20%, Urgency 15%, Disruption 10%.
                  </p>
                  <PrioritySlider
                    label="Public Safety (30%)"
                    value={form.publicSafety}
                    onChange={(v) => setField('publicSafety', v)}
                  />
                  <PrioritySlider
                    label="Essential Service (25%)"
                    value={form.essentialService}
                    onChange={(v) => setField('essentialService', v)}
                  />
                  <PrioritySlider
                    label="Dependency Impact (20%)"
                    value={form.dependencyImpact}
                    onChange={(v) => setField('dependencyImpact', v)}
                  />
                  <PrioritySlider
                    label="Urgency (15%)"
                    value={form.urgency}
                    onChange={(v) => setField('urgency', v)}
                  />
                  <PrioritySlider
                    label="Public Disruption (10%)"
                    value={form.publicDisruption}
                    onChange={(v) => setField('publicDisruption', v)}
                  />
                </div>

                {/* Inconvenience */}
                <div>
                  <label className={labelCls}>Inconvenience Description</label>
                  <textarea
                    value={form.inconvenienceDescription}
                    onChange={(e) => setField('inconvenienceDescription', e.target.value)}
                    rows={3}
                    placeholder="Describe the impact to residents and traffic..."
                    className={inputCls}
                  />
                </div>

                {/* Alternative Route */}
                <div>
                  <label className={labelCls}>Alternative Route</label>
                  <input
                    type="text"
                    value={form.alternativeRoute}
                    onChange={(e) => setField('alternativeRoute', e.target.value)}
                    placeholder="e.g. Detour via Oak Avenue and 5th Street"
                    className={inputCls}
                  />
                </div>

                {/* Buffer Days */}
                <div>
                  <label className={labelCls}>
                    Buffer Days (0–30){' '}
                    <span className="text-gray-400 font-normal">
                      — extra safety window after project end for conflict detection
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={form.bufferDays}
                    onChange={(e) =>
                      setField('bufferDays', Math.min(30, Math.max(0, Number(e.target.value))))
                    }
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Back
                </button>
              )}
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    // validate required fields before moving to step 2
                    const newErrors: Partial<Record<keyof FormState, string>> = {};
                    if (!form.title.trim()) newErrors.title = 'Title is required.';
                    if (!form.segmentId.trim()) newErrors.segmentId = 'Segment ID is required.';
                    if (!form.startDate) newErrors.startDate = 'Start date is required.';
                    if (!form.plannedEndDate) newErrors.plannedEndDate = 'Planned end date is required.';
                    if (
                      form.startDate &&
                      form.plannedEndDate &&
                      form.plannedEndDate < form.startDate
                    ) {
                      newErrors.plannedEndDate = 'End date must be after start date.';
                    }
                    setErrors(newErrors);
                    if (Object.keys(newErrors).length === 0) setStep(2);
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  Add Project
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority_desc', label: 'Priority Score ↓' },
  { value: 'progress_desc', label: 'Progress ↓' },
  { value: 'deadline_asc', label: 'Deadline ↑' },
];

export default function ProjectsPage() {
  const { state, addProject, isGovernment } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter / Sort state (persisted in URL) ─────────────────
  const query = searchParams.get('q') ?? '';
  const filterStatus = searchParams.get('status') ?? 'all';
  const filterCategory = searchParams.get('category') ?? 'all';
  const filterDepartment = searchParams.get('department') ?? 'all';
  const filterPriority = searchParams.get('priority') ?? 'all';
  const sortKey = (searchParams.get('sort') ?? 'newest') as SortKey;

  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }

  // ── Filtered + sorted projects ─────────────────────────────
  const displayedProjects = useMemo(() => {
    const q = query.toLowerCase().trim();

    let list = state.projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterDepartment !== 'all' && p.department !== filterDepartment) return false;
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
      if (q) {
        const searchable = [
          p.title,
          p.description,
          p.location,
          p.neighborhood,
          p.contractorName,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt);
        case 'priority_desc':
          return b.priorityScore - a.priorityScore;
        case 'progress_desc':
          return b.progress - a.progress;
        case 'deadline_asc':
          return (a.plannedEndDate ?? '').localeCompare(b.plannedEndDate ?? '');
        case 'newest':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [state.projects, query, filterStatus, filterCategory, filterDepartment, filterPriority, sortKey]);

  const activeFilterCount = [
    filterStatus !== 'all',
    filterCategory !== 'all',
    filterDepartment !== 'all',
    filterPriority !== 'all',
  ].filter(Boolean).length;

  function clearAllFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ['status', 'category', 'department', 'priority'].forEach((k) => next.delete(k));
      return next;
    });
  }

  function handleAddProject(project: Project) {
    addProject(project);
    setShowModal(false);
    navigate(`/projects/${project.id}`);
  }

  // ── Filter select class ────────────────────────────────────
  const selectCls =
    'px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title row */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isGovernment ? t('projects.title') : t('projects.titlePublic')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {displayedProjects.length === state.projects.length
                  ? `${state.projects.length} project${state.projects.length !== 1 ? 's' : ''}`
                  : `${displayedProjects.length} of ${state.projects.length} projects`}
              </p>
            </div>
            {isGovernment ? (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{t('projects.addNew')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold">
                <Users size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t('nav.publicResidentBadge')}</span>
              </div>
            )}
          </div>

          {/* Search + Controls row */}
          <div className="flex items-center gap-3 pb-4">
            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder={t('projects.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
              />
              {query && (
                <button
                  onClick={() => setParam('q', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 shrink-0">
              <SortAsc size={15} className="text-gray-400 dark:text-gray-500" />
              <select
                value={sortKey}
                onChange={(e) => setParam('sort', e.target.value)}
                className={selectCls}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filter Bar */}
          {showFilters && (
            <div className="pb-4 flex flex-wrap gap-3 items-center">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setParam('status', e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Category</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setParam('category', e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Department</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setParam('department', e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  {DEPARTMENT_LIST.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Priority</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setParam('priority', e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition ml-1"
                >
                  <X size={12} />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {displayedProjects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Search size={28} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No projects found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              {query || activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'No projects have been created yet. Add the first one!'}
            </p>
            {(query || activeFilterCount > 0) && (
              <button
                onClick={() => {
                  setSearchParams({});
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition"
              >
                Clear all filters
              </button>
            )}
            {!query && activeFilterCount === 0 && isGovernment && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Add Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* ── Add Project Modal ──────────────────────────────── */}
      {showModal && (
        <AddProjectModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddProject}
        />
      )}
    </div>
  );
}
