// ============================================================
// CivicTrack — Project Detail Page
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Calendar,
  MapPin,
  Building2,
  User,
  AlertTriangle,
  Clock,
  Activity,
  ChevronRight,
  Edit,
  Plus,
  Flag,
  TrendingUp,
  Shield,
  Phone,
  FileText,
  Layers,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  calculateDelay,
  calculatePriorityScore,
  calculateMilestoneProgress,
  formatDate,
  formatDateTime,
  generateId,
  today,
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  DEPARTMENT_LIST,
} from '../utils';
import type {
  Project,
  Milestone,
  DelayRecord,
  ActivityEntry,
  ProjectStatus,
  ProjectCategory,
  PriorityInputs,
  IssueReport,
  IssueCategory,
  IssueReportStatus,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────

const PRIORITY_SCORE_INPUTS: {
  key: keyof PriorityInputs;
  label: string;
  weight: number;
  icon: React.ReactNode;
}[] = [
  { key: 'publicSafety',      label: 'Public Safety',      weight: 30, icon: <Shield   size={14} /> },
  { key: 'essentialService',  label: 'Essential Service',  weight: 25, icon: <Flag     size={14} /> },
  { key: 'dependencyImpact',  label: 'Dependency Impact',  weight: 20, icon: <Layers   size={14} /> },
  { key: 'urgency',           label: 'Urgency',            weight: 15, icon: <Clock    size={14} /> },
  { key: 'publicDisruption',  label: 'Public Disruption',  weight: 10, icon: <AlertTriangle size={14} /> },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  created:              <Plus         size={14} />,
  status_changed:       <Activity     size={14} />,
  milestone_completed:  <CheckCircle2 size={14} />,
  delay_recorded:       <AlertTriangle size={14} />,
  progress_updated:     <TrendingUp   size={14} />,
  conflict_noted:       <AlertTriangle size={14} />,
  resolution_applied:   <CheckCircle2 size={14} />,
  deadline_changed:     <Calendar     size={14} />,
  general:              <FileText     size={14} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  created:              'bg-blue-100 text-blue-700',
  status_changed:       'bg-purple-100 text-purple-700',
  milestone_completed:  'bg-green-100 text-green-700',
  delay_recorded:       'bg-red-100 text-red-700',
  progress_updated:     'bg-amber-100 text-amber-700',
  conflict_noted:       'bg-orange-100 text-orange-700',
  resolution_applied:   'bg-teal-100 text-teal-700',
  deadline_changed:     'bg-indigo-100 text-indigo-700',
  general:              'bg-gray-100 text-gray-600',
};

// ── Inline section card ───────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm ${className}`}
      style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5 border-b"
        style={{ borderColor: 'var(--cs-border)' }}
      >
        {icon && <span style={{ color: 'var(--cs-muted)' }}>{icon}</span>}
        <h2
          className="font-semibold text-sm uppercase tracking-wide"
          style={{ color: 'var(--cs-text)' }}
        >
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Milestone Confirmation Dialog ─────────────────────────────

function MilestoneConfirmDialog({
  milestone,
  action,
  onConfirm,
  onCancel,
}: {
  milestone: Milestone;
  action: 'complete' | 'uncomplete';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isCompleting = action === 'complete';

  // Trap focus inside dialog (basic)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-dialog-title"
      onKeyDown={handleKeyDown}
    >
      <div className="modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isCompleting ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
        }`}>
          {isCompleting
            ? <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
            : <Circle size={24} className="text-amber-600 dark:text-amber-400" />
          }
        </div>

        {/* Title */}
        <h3
          id="milestone-dialog-title"
          className="text-center text-base font-semibold mb-1"
          style={{ color: 'var(--cs-text)' }}
        >
          {isCompleting ? 'Mark task as completed?' : 'Mark task as incomplete?'}
        </h3>

        {/* Task name */}
        <p
          className="text-center text-sm font-medium mb-3"
          style={{ color: 'var(--cs-accent)' }}
        >
          "{milestone.name}"
        </p>

        {/* Explanation */}
        <p
          className="text-center text-sm mb-6"
          style={{ color: 'var(--cs-muted)' }}
        >
          {isCompleting
            ? 'This will update the project\'s completion progress.'
            : 'The project\'s completion progress may decrease.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:scale-[1.01] active:scale-95"
            style={{
              backgroundColor: 'var(--cs-elevated)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text)',
            }}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-95 ${
              isCompleting ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Info row ─────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide sm:w-44 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">{value || '—'}</span>
    </div>
  );
}

// ── Edit form modal ──────────────────────────────────────────

interface EditFormState {
  title: string;
  description: string;
  category: ProjectCategory;
  reason: string;
  department: string;
  contractorName: string;
  contractorContact: string;
  segmentId: string;
  location: string;
  neighborhood: string;
  startDate: string;
  plannedEndDate: string;
  inconvenienceDescription: string;
  alternativeRoute: string;
  bufferDays: number;
  isCriticalSafetyOverride: boolean;
  publicSafety: number;
  essentialService: number;
  dependencyImpact: number;
  urgency: number;
  publicDisruption: number;
}

function EditModal({
  project,
  onSave,
  onClose,
}: {
  project: Project;
  onSave: (updated: Project) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    title: project.title,
    description: project.description,
    category: project.category,
    reason: project.reason,
    department: project.department,
    contractorName: project.contractorName,
    contractorContact: project.contractorContact,
    segmentId: project.segmentId,
    location: project.location,
    neighborhood: project.neighborhood,
    startDate: project.startDate,
    plannedEndDate: project.plannedEndDate,
    inconvenienceDescription: project.inconvenienceDescription,
    alternativeRoute: project.alternativeRoute ?? '',
    bufferDays: project.bufferDays,
    isCriticalSafetyOverride: project.isCriticalSafetyOverride,
    publicSafety: project.priorityInputs.publicSafety,
    essentialService: project.priorityInputs.essentialService,
    dependencyImpact: project.priorityInputs.dependencyImpact,
    urgency: project.priorityInputs.urgency,
    publicDisruption: project.priorityInputs.publicDisruption,
  });

  const [error, setError] = useState('');

  function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.startDate || !form.plannedEndDate) { setError('Start and planned end dates are required.'); return; }
    if (form.plannedEndDate < form.startDate) { setError('Planned end date must be after start date.'); return; }

    const priorityInputs: PriorityInputs = {
      publicSafety: form.publicSafety,
      essentialService: form.essentialService,
      dependencyImpact: form.dependencyImpact,
      urgency: form.urgency,
      publicDisruption: form.publicDisruption,
    };

    const entry: ActivityEntry = {
      id: generateId('act'),
      timestamp: new Date().toISOString(),
      type: 'general',
      description: 'Project details updated.',
    };

    const updated: Project = {
      ...project,
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
      inconvenienceDescription: form.inconvenienceDescription.trim(),
      alternativeRoute: form.alternativeRoute.trim() || undefined,
      bufferDays: form.bufferDays,
      isCriticalSafetyOverride: form.isCriticalSafetyOverride,
      priorityInputs,
      priorityScore: calculatePriorityScore(priorityInputs),
      activityHistory: [entry, ...project.activityHistory],
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  function ScoreInput({ field, label }: { field: keyof PriorityInputs & keyof EditFormState; label: string }) {
    return (
      <div>
        <label className={labelCls}>{label} <span className="text-blue-600 font-semibold">{form[field]}</span>/5</label>
        <input
          type="range" min={0} max={5} step={1}
          value={form[field] as number}
          onChange={(e) => set(field, Number(e.target.value) as EditFormState[typeof field])}
          className="w-full accent-blue-600"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Edit size={18} className="text-blue-600" /> Edit Project
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value as ProjectCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)}>
                {DEPARTMENT_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Date *</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Planned End Date *</label>
              <input type="date" className={inputCls} value={form.plannedEndDate} onChange={(e) => set('plannedEndDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contractor Name</label>
              <input className={inputCls} value={form.contractorName} onChange={(e) => set('contractorName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contractor Contact</label>
              <input className={inputCls} value={form.contractorContact} onChange={(e) => set('contractorContact', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Neighborhood</label>
              <input className={inputCls} value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Segment ID</label>
              <input className={inputCls} value={form.segmentId} onChange={(e) => set('segmentId', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Buffer Days</label>
              <input type="number" min={0} max={90} className={inputCls} value={form.bufferDays} onChange={(e) => set('bufferDays', Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Inconvenience Description</label>
            <textarea rows={2} className={inputCls} value={form.inconvenienceDescription} onChange={(e) => set('inconvenienceDescription', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Alternative Route</label>
            <input className={inputCls} value={form.alternativeRoute} onChange={(e) => set('alternativeRoute', e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Reason</label>
            <textarea rows={2} className={inputCls} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isCriticalSafetyOverride}
              onChange={(e) => set('isCriticalSafetyOverride', e.target.checked)}
              className="rounded accent-red-600" />
            Critical Safety Override
          </label>

          {/* Priority Inputs */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority Score Inputs (0–5)</p>
            <ScoreInput field="publicSafety"     label="Public Safety (30%)" />
            <ScoreInput field="essentialService" label="Essential Service (25%)" />
            <ScoreInput field="dependencyImpact" label="Dependency Impact (20%)" />
            <ScoreInput field="urgency"          label="Urgency (15%)" />
            <ScoreInput field="publicDisruption" label="Public Disruption (10%)" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delay Record Form ────────────────────────────────────────

function DelayForm({
  project,
  onSubmit,
  onClose,
}: {
  project: Project;
  onSubmit: (reason: string, notes: string, revisedDate: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [revisedDate, setRevisedDate] = useState(project.revisedEndDate ?? project.plannedEndDate);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('Reason is required.'); return; }
    if (!revisedDate) { setError('Revised end date is required.'); return; }
    if (revisedDate <= project.plannedEndDate) { setError('Revised date must be after original planned date.'); return; }
    onSubmit(reason.trim(), notes.trim(), revisedDate);
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Record Delay
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          <div>
            <label className={labelCls}>Reason *</label>
            <textarea rows={3} className={inputCls} placeholder="Describe why the project is being delayed…"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Additional Notes</label>
            <textarea rows={2} className={inputCls} placeholder="Optional context or mitigation details…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Revised End Date *</label>
            <input type="date" className={inputCls} value={revisedDate}
              onChange={(e) => setRevisedDate(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Original planned: {formatDate(project.plannedEndDate)}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">
              Submit Delay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Report Issue Modal (Citizen Voice) ─────────────────────────

function ReportIssueModal({
  project,
  onSubmit,
  onClose,
}: {
  project: Project;
  onSubmit: (report: IssueReport) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<IssueCategory>('safety_hazard');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [error, setError] = useState('');

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a short summary title for the issue.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide at least 10 characters describing the issue.');
      return;
    }

    const report: IssueReport = {
      id: generateId('iss'),
      projectId: project.id,
      category,
      title: title.trim(),
      description: description.trim(),
      locationDetails: locationDetails.trim() || undefined,
      status: 'open',
      submittedAt: new Date().toISOString(),
      reporterName: reporterName.trim() || 'Concerned Resident',
    };

    onSubmit(report);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50/60">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertCircle size={18} className="text-amber-600" />
            <h2 className="font-bold text-gray-900 text-base">Report an Issue on this Project</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-2 font-medium">{error}</div>
          )}

          <div>
            <label className={labelCls}>Issue Category *</label>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
            >
              <option value="safety_hazard">⚠️ Safety Hazard / Uncovered Trench</option>
              <option value="access_blocked">🚫 Resident / Driveway Access Blocked</option>
              <option value="excessive_noise">🔊 Excessive Noise / Night Construction</option>
              <option value="prolonged_inactivity">⏳ Prolonged Inactivity / Abandoned Site</option>
              <option value="water_power_leak">💧 Water Leak / Exposed Wire Risk</option>
              <option value="other">ℹ️ Other Public Concern</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Summary Title *</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Uncovered trench with no warning cones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Specific Location / Landmark</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Near gate #12 or opposite City Market"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Detailed Description *</label>
            <textarea
              rows={3}
              className={inputCls}
              placeholder="Explain what is happening and the impact on safety or access…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Your Name (Optional)</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Anil Sharma (or leave blank for Anonymous)"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
            >
              Submit Issue Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    state,
    updateProject,
    isGovernment,
    isPublic,
    addIssueReport,
    updateIssueReportStatus,
  } = useApp();
  const { isDark } = useTheme();

  const [showEditModal, setShowEditModal]     = useState(false);
  const [showDelayForm, setShowDelayForm]     = useState(false);
  const [showIssueModal, setShowIssueModal]   = useState(false);
  const [respondingIssueId, setRespondingIssueId] = useState<string | null>(null);
  const [responseText, setResponseText]       = useState('');
  // Milestone confirmation dialog state
  const [milestoneConfirm, setMilestoneConfirm] = useState<{
    milestone: Milestone;
    action: 'complete' | 'uncomplete';
    submitting: boolean;
  } | null>(null);

  const project = state.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-lg font-medium">Project not found.</p>
        <button onClick={() => navigate('/projects')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
          <ArrowLeft size={16} /> Back to Projects
        </button>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────

  const delay        = calculateDelay(project);
  const conflicts    = state.conflicts.filter((c) => c.projectIds.includes(project.id));
  const activityDesc = [...project.activityHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const priorityScore = calculatePriorityScore(project.priorityInputs);
  const projectIssues = state.issueReports.filter((r) => r.projectId === project.id);

  // ── Handlers ─────────────────────────────────────────────

  function handleMilestoneToggle(milestone: Milestone) {
    if (!project) return;
    if (milestoneConfirm?.submitting) return; // prevent double submission
    // Open confirmation dialog instead of applying immediately
    setMilestoneConfirm({
      milestone,
      action: milestone.completed ? 'uncomplete' : 'complete',
      submitting: false,
    });
  }

  function applyMilestoneToggle(milestone: Milestone, action: 'complete' | 'uncomplete') {
    if (!project) return;
    setMilestoneConfirm((prev) => prev ? { ...prev, submitting: true } : null);

    const nowCompleted = action === 'complete';
    const updatedMilestones: Milestone[] = project.milestones.map((m) =>
      m.id === milestone.id
        ? {
            ...m,
            completed: nowCompleted,
            actualDate: nowCompleted ? today() : undefined,
          }
        : m
    );
    const progress = calculateMilestoneProgress(updatedMilestones);

    const entry: ActivityEntry = {
      id: generateId('act'),
      timestamp: new Date().toISOString(),
      type: 'milestone_completed',
      description: nowCompleted
        ? `Milestone completed: "${milestone.name}"`
        : `Milestone re-opened: "${milestone.name}"`,
    };

    const updated: Project = {
      ...project,
      milestones: updatedMilestones,
      progress,
      activityHistory: [entry, ...project.activityHistory],
      updatedAt: new Date().toISOString(),
    };

    updateProject(updated);
    setMilestoneConfirm(null);
  }

  function handleDelaySubmit(reason: string, notes: string, revisedDate: string) {
    if (!project) return;
    const record: DelayRecord = {
      id: generateId('delay'),
      submittedAt: new Date().toISOString(),
      reason,
      notes: notes || undefined,
      originalDate: project.plannedEndDate,
      revisedDate,
      reviewStatus: 'pending',
    };

    const entry: ActivityEntry = {
      id: generateId('act'),
      timestamp: new Date().toISOString(),
      type: 'delay_recorded',
      description: `Delay recorded. Revised end date: ${formatDate(revisedDate)}. Reason: ${reason}`,
    };

    const isNowDelayed = project.status !== 'completed' && today() > project.plannedEndDate;

    const updated: Project = {
      ...project,
      revisedEndDate: revisedDate,
      status: isNowDelayed ? 'delayed' : project.status,
      delayRecords: [...project.delayRecords, record],
      activityHistory: [entry, ...project.activityHistory],
      updatedAt: new Date().toISOString(),
    };

    updateProject(updated);
    setShowDelayForm(false);
  }

  function handleEditSave(updated: Project) {
    updateProject(updated);
    setShowEditModal(false);
  }

  // ── Demo controls ─────────────────────────────────────────

  function demoSetProgress(progress: number) {
    if (!project) return;
    const entry: ActivityEntry = {
      id: generateId('act'),
      timestamp: new Date().toISOString(),
      type: 'progress_updated',
      description: `[Demo] Progress set to ${progress}%.`,
    };
    updateProject({ ...project, progress, activityHistory: [entry, ...project.activityHistory], updatedAt: new Date().toISOString() });
  }

  function demoSetStatus(status: ProjectStatus) {
    if (!project) return;
    const entry: ActivityEntry = {
      id: generateId('act'),
      timestamp: new Date().toISOString(),
      type: 'status_changed',
      description: `[Demo] Status changed to "${STATUS_LABELS[status]}".`,
    };
    updateProject({
      ...project,
      status,
      actualEndDate: status === 'completed' ? today() : project.actualEndDate,
      activityHistory: [entry, ...project.activityHistory],
      updatedAt: new Date().toISOString(),
    });
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cs-bg)' }}>
      {/* Modals */}
      {/* Milestone confirmation dialog */}
      {milestoneConfirm && (
        <MilestoneConfirmDialog
          milestone={milestoneConfirm.milestone}
          action={milestoneConfirm.action}
          onConfirm={() => applyMilestoneToggle(milestoneConfirm.milestone, milestoneConfirm.action)}
          onCancel={() => setMilestoneConfirm(null)}
        />
      )}

      {showEditModal && isGovernment && (
        <EditModal project={project} onSave={handleEditSave} onClose={() => setShowEditModal(false)} />
      )}
      {showDelayForm && isGovernment && (
        <DelayForm project={project} onSubmit={handleDelaySubmit} onClose={() => setShowDelayForm(false)} />
      )}
      {showIssueModal && (
        <ReportIssueModal
          project={project}
          onSubmit={(report) => {
            addIssueReport(report);
            setShowIssueModal(false);
          }}
          onClose={() => setShowIssueModal(false)}
        />
      )}

      {/* ── Top bar ── */}
      <div
        className="border-b sticky top-0 z-10"
        style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back to Projects
          </button>

          {isGovernment ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDelayForm(true)}
                disabled={project.status === 'completed'}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} /> Record Delay
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                <Edit size={14} /> Edit Project
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Eye size={13} className="text-emerald-600" />
                Resident View
              </span>
              <button
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors shadow-sm"
              >
                <AlertCircle size={15} />
                Report an Issue
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header card ── */}
        <div
          className="rounded-xl border shadow-sm p-6"
          style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {CATEGORY_LABELS[project.category]}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[project.priority]}`}>
                  <Flag size={10} className="mr-1" /> {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                </span>
                {project.isCriticalSafetyOverride && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <Shield size={10} /> Safety Override
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--cs-text)' }}>{project.title}</h1>
              {project.description && (
                <p className="mt-2 text-sm max-w-2xl" style={{ color: 'var(--cs-muted)' }}>{project.description}</p>
              )}
            </div>

            {/* Priority score ring */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-blue-200 flex flex-col items-center justify-center bg-blue-50">
                <span className="text-2xl font-extrabold text-blue-700">{priorityScore}</span>
                <span className="text-[10px] text-blue-500 font-medium">/ 100</span>
              </div>
              <span className="mt-1 text-xs text-gray-500 font-medium">Priority Score</span>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cs-elevated)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--cs-muted)' }}>Department</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>{project.department}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cs-elevated)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--cs-muted)' }}>Contractor</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>{project.contractorName}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cs-elevated)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--cs-muted)' }}>Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--cs-border)' }}>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      project.progress >= 100 ? 'bg-green-500' : project.status === 'delayed' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(project.progress, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--cs-text)' }}>{project.progress}%</span>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cs-elevated)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--cs-muted)' }}>Delay Status</p>
              <p className={`text-sm font-semibold ${delay.isDelayed ? 'text-red-500' : 'text-green-500'}`}>
                {delay.comparisonLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left column (2/3) ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Milestones */}
            <SectionCard title="Milestones" icon={<CheckCircle2 size={16} />}>
              {project.milestones.length === 0 ? (
                <p className="text-sm italic" style={{ color: 'var(--cs-muted)' }}>No milestones recorded for this project.</p>
              ) : (
                <div className="space-y-3">
                  {project.milestones.map((m) => (
                    <div key={m.id}
                      className="flex items-start gap-3 p-3 rounded-lg border transition-all"
                      style={{
                        backgroundColor: m.completed
                          ? 'rgba(34,197,94,0.08)'
                          : 'var(--cs-elevated)',
                        borderColor: m.completed
                          ? 'rgba(34,197,94,0.25)'
                          : 'var(--cs-border)',
                      }}
                    >
                      <button
                        onClick={() => isGovernment && handleMilestoneToggle(m)}
                        disabled={!isGovernment}
                        className={`mt-0.5 shrink-0 transition-all hover:scale-110 active:scale-90 ${
                          m.completed
                            ? 'text-green-500 cursor-pointer'
                            : isGovernment
                            ? 'text-gray-400 hover:text-blue-500 cursor-pointer'
                            : 'text-gray-300 cursor-default opacity-60'
                        }`}
                        title={
                          !isGovernment
                            ? 'Government official authorization required'
                            : m.completed
                            ? 'Click to mark milestone incomplete'
                            : 'Click to mark milestone complete'
                        }
                        aria-label={
                          !isGovernment
                            ? 'Milestone toggle (read-only)'
                            : m.completed
                            ? `Uncheck milestone: ${m.name}`
                            : `Check milestone: ${m.name}`
                        }
                      >
                        {m.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p
                            className={`text-sm font-medium ${m.completed ? 'line-through' : ''}`}
                            style={{ color: m.completed ? 'var(--cs-muted)' : 'var(--cs-text)' }}
                          >
                            {m.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cs-muted)' }}>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              Planned: {formatDate(m.plannedDate)}
                            </span>
                            {m.completed && m.actualDate && (
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircle2 size={11} />
                                Done: {formatDate(m.actualDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        {m.description && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--cs-muted)' }}>{m.description}</p>
                        )}
                        {m.notes && (
                          <p className="text-xs text-indigo-400 mt-0.5 italic">{m.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Delay analysis */}
            <SectionCard title="Delay Analysis" icon={<AlertTriangle size={16} />}>
              <div className={`rounded-lg p-4 border ${delay.isDelayed ? 'bg-red-50 border-red-200' : delay.isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-extrabold ${delay.isDelayed ? 'text-red-600' : delay.isCompleted && !delay.isDelayed ? 'text-green-600' : 'text-blue-600'}`}>
                    {delay.delayDays > 0 ? `+${delay.delayDays}d` : delay.comparisonLabel}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{delay.comparisonLabel}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{delay.explanation}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Start Date</p>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Planned End</p>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(project.plannedEndDate)}</p>
                </div>
                {project.revisedEndDate && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Revised End</p>
                    <p className="text-sm font-semibold text-amber-700">{formatDate(project.revisedEndDate)}</p>
                  </div>
                )}
                {project.actualEndDate && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Actual End</p>
                    <p className="text-sm font-semibold text-green-700">{formatDate(project.actualEndDate)}</p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Delay records */}
            <SectionCard title="Delay Records" icon={<FileText size={16} />}>
              {project.delayRecords.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No formal delay submissions yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...project.delayRecords].reverse().map((dr) => (
                    <div key={dr.id} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{dr.reason}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          dr.reviewStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          dr.reviewStatus === 'rejected' ? 'bg-gray-100 text-gray-500' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {dr.reviewStatus.charAt(0).toUpperCase() + dr.reviewStatus.slice(1)}
                        </span>
                      </div>
                      {dr.notes && <p className="text-xs text-gray-500 mt-1">{dr.notes}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Original: {formatDate(dr.originalDate)}
                        </span>
                        <span className="flex items-center gap-1 text-amber-700">
                          <Calendar size={11} /> Revised: {formatDate(dr.revisedDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Submitted: {formatDateTime(dr.submittedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Activity timeline */}
            <SectionCard title="Activity History" icon={<Activity size={16} />}>
              {activityDesc.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
              ) : (
                <div className="relative pl-5">
                  {/* Vertical line */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {activityDesc.map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className={`absolute -left-3 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ACTIVITY_COLORS[entry.type] ?? ACTIVITY_COLORS.general}`}>
                          {ACTIVITY_ICONS[entry.type] ?? ACTIVITY_ICONS.general}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{entry.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Conflicts */}
            <SectionCard title="Conflicts" icon={<AlertTriangle size={16} />}>
              {conflicts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No conflicts detected involving this project.</p>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((c) => {
                    const otherId = c.projectIds.find((pid) => pid !== project.id) ?? '';
                    const other = state.projects.find((p) => p.id === otherId);
                    return (
                      <div key={c.id} className={`p-4 rounded-lg border ${c.resolved ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{c.description}</p>
                            {other && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Conflicts with:{' '}
                                <NavLink to={`/projects/${other.id}`} className="text-blue-600 hover:underline font-medium">
                                  {other.title}
                                </NavLink>
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {c.resolved ? 'Resolved' : 'Active'}
                          </span>
                        </div>
                        {c.publicDisruption && (
                          <p className="text-xs text-gray-500 mt-1">Impact: {c.publicDisruption}</p>
                        )}
                        <NavLink
                          to="/conflicts"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                        >
                          View in Conflicts <ChevronRight size={11} />
                        </NavLink>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Citizen Issue Reports */}
            <SectionCard
              title={`Citizen Issue Reports (${projectIssues.length})`}
              icon={<AlertCircle size={16} />}
            >
              <div className="space-y-3">
                {projectIssues.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No citizen issues reported on this project.</p>
                    {isPublic && (
                      <button
                        onClick={() => setShowIssueModal(true)}
                        className="mt-2 text-xs text-amber-600 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <AlertCircle size={13} /> Report a concern if you notice hazards or blocked access
                      </button>
                    )}
                  </div>
                ) : (
                  projectIssues.map((issue) => {
                    const statusConfig = {
                      open: { label: 'Open', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                      under_review: { label: 'Under Municipal Review', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                      resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' },
                    }[issue.status];

                    const categoryLabels: Record<string, string> = {
                      safety_hazard: 'Safety Hazard',
                      access_blocked: 'Access Blocked',
                      excessive_noise: 'Noise / Construction Hours',
                      prolonged_inactivity: 'Inactivity',
                      water_power_leak: 'Utility Leak / Risk',
                      other: 'Community Concern',
                    };

                    return (
                      <div
                        key={issue.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{issue.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Reported by {issue.reporterName || 'Resident'} · {formatDateTime(issue.submittedAt)}
                              {issue.locationDetails ? ` · Location: ${issue.locationDetails}` : ''}
                              {' · '}
                              <span className="text-gray-500 font-medium">{categoryLabels[issue.category] || issue.category}</span>
                            </p>
                          </div>
                        </div>

                        <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                          {issue.description}
                        </p>

                        {issue.officialResponse && (
                          <div className="bg-teal-50 border border-teal-200 text-teal-900 p-2.5 rounded-lg text-[11px]">
                            <strong className="text-teal-800 font-semibold block mb-0.5">Official Municipal Response:</strong>
                            {issue.officialResponse}
                          </div>
                        )}

                        {/* Government action: update status & respond */}
                        {isGovernment && (
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] text-gray-500 font-medium">Government Official Action:</span>
                            <div className="flex items-center gap-1.5">
                              {issue.status !== 'under_review' && (
                                <button
                                  onClick={() => updateIssueReportStatus(issue.id, 'under_review')}
                                  className="px-2.5 py-1 text-[11px] rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium border border-blue-200 transition"
                                >
                                  Mark Under Review
                                </button>
                              )}
                              {issue.status !== 'resolved' && (
                                <button
                                  onClick={() => {
                                    const resp = window.prompt('Enter official resolution note for the resident public record:');
                                    updateIssueReportStatus(issue.id, 'resolved', resp || 'Issue inspected and mitigated by municipal works department.');
                                  }}
                                  className="px-2.5 py-1 text-[11px] rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium border border-green-200 transition"
                                >
                                  Mark Resolved
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </div>

          {/* ── Right column (1/3) ── */}
          <div className="space-y-6">

            {/* Location & Infrastructure */}
            <SectionCard title="Location & Infrastructure" icon={<MapPin size={16} />}>
              <InfoRow label="Location"        value={project.location} />
              <InfoRow label="Neighborhood"    value={project.neighborhood} />
              <InfoRow label="Segment ID"      value={<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{project.segmentId}</code>} />
              <InfoRow label="Buffer Days"     value={`${project.bufferDays} day${project.bufferDays !== 1 ? 's' : ''}`} />
              <InfoRow label="Inconvenience"   value={project.inconvenienceDescription} />
              <InfoRow label="Alt. Route"      value={project.alternativeRoute} />
            </SectionCard>

            {/* Project details */}
            <SectionCard title="Project Details" icon={<Building2 size={16} />}>
              <InfoRow label="Department"      value={<span className="flex items-center gap-1"><Building2 size={13} className="text-gray-400"/>{project.department}</span>} />
              <InfoRow label="Contractor"      value={<span className="flex items-center gap-1"><User size={13} className="text-gray-400"/>{project.contractorName}</span>} />
              <InfoRow label="Contact"         value={<span className="flex items-center gap-1"><Phone size={13} className="text-gray-400"/>{isGovernment ? project.contractorContact : `${project.contractorName} (Public inquiries via Department hotline)`}</span>} />
              <InfoRow label="Reason"          value={project.reason} />
              <InfoRow label="Created"         value={formatDate(project.createdAt)} />
              <InfoRow label="Last Updated"    value={formatDateTime(project.updatedAt)} />
            </SectionCard>

            {/* Priority score breakdown */}
            <SectionCard title="Priority Breakdown" icon={<TrendingUp size={16} />}>
              <div className="space-y-3">
                {PRIORITY_SCORE_INPUTS.map(({ key, label, weight, icon }) => {
                  const value    = project.priorityInputs[key];
                  const contrib  = Math.round((value * weight) / 5);
                  const pct      = (value / 5) * 100;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                          <span className="text-gray-400">{icon}</span> {label}
                          <span className="text-gray-400 font-normal">({weight}%)</span>
                        </span>
                        <span className="font-semibold text-gray-800">{value}/5 → <span className="text-blue-600">+{contrib}pts</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Score</span>
                  <span className="text-lg font-extrabold text-blue-700">{priorityScore}<span className="text-xs text-gray-400 font-normal"> / 100</span></span>
                </div>
              </div>
            </SectionCard>

            {/* Demo Controls - Government Only */}
            {isGovernment && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-100">
                  <span className="text-amber-500"><Flag size={16} /></span>
                  <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">Demo Controls (Gov Only)</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-amber-700 mb-2">Set Progress</p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 25, 50, 75, 100].map((v) => (
                        <button key={v} onClick={() => demoSetProgress(v)}
                          className="px-3 py-1 text-xs rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium border border-amber-200 transition-colors">
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-700 mb-2">Change Status</p>
                    <div className="flex flex-wrap gap-2">
                      {(['planned', 'ongoing', 'delayed', 'completed', 'emergency'] as ProjectStatus[]).map((s) => (
                        <button key={s} onClick={() => demoSetStatus(s)}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                            project.status === s
                              ? 'bg-gray-200 text-gray-500 cursor-default border-gray-200'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                          disabled={project.status === s}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Confirmation Dialog */}
        {milestoneConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div
              className="modal-panel max-w-md w-full p-6 space-y-4 rounded-2xl border shadow-2xl animate-scale-in"
              style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)', color: 'var(--cs-text)' }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${milestoneConfirm.action === 'complete' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {milestoneConfirm.action === 'complete' ? 'Mark Milestone Complete?' : 'Re-open Milestone?'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--cs-muted)' }}>
                    Project: <span className="font-medium" style={{ color: 'var(--cs-text)' }}>{project.title}</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-1" style={{ backgroundColor: 'var(--cs-elevated)', borderColor: 'var(--cs-border)' }}>
                <p className="font-semibold" style={{ color: 'var(--cs-text)' }}>
                  "{milestoneConfirm.milestone.name}"
                </p>
                <p style={{ color: 'var(--cs-muted)' }}>
                  {milestoneConfirm.action === 'complete'
                    ? 'This will update overall project completion stats and log an official milestone completion activity entry.'
                    : 'This will revert this milestone to pending state, adjust project completion progress accordingly, and log an activity entry.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={milestoneConfirm.submitting}
                  onClick={() => setMilestoneConfirm(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={milestoneConfirm.submitting}
                  onClick={() => applyMilestoneToggle(milestoneConfirm.milestone, milestoneConfirm.action)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-sm flex items-center gap-1.5 ${
                    milestoneConfirm.action === 'complete'
                      ? 'bg-green-600 hover:bg-green-700 active:scale-95'
                      : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                  }`}
                >
                  {milestoneConfirm.submitting ? (
                    'Updating...'
                  ) : milestoneConfirm.action === 'complete' ? (
                    'Confirm Completion'
                  ) : (
                    'Confirm Re-opening'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
