// ============================================================
// CitySync — Public Accountability Ledger Page (Phase 2)
// ============================================================
// ⚠️ DEMO MODE: All ledger entries are recorded demonstration events.
// These records are stored in client-side localStorage and are NOT
// cryptographically verified, immutable, or connected to live
// government systems.
// ============================================================

import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  ChevronRight,
  ArrowRight,
  Calendar,
  MapPin,
  Building2,
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Shield,
  Zap,
  RotateCcw,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { formatDate, formatDateTime, DEPARTMENT_LIST } from '../utils';
import type { LedgerEntry, ResolutionCategory } from '../types';
import { RESOLUTION_CATEGORY_LABELS } from './ConflictDetection';

// ── Category styling ─────────────────────────────────────────

const CATEGORY_ICONS: Record<ResolutionCategory, React.ReactNode> = {
  sequential_delay: <Clock className="w-4 h-4" />,
  joint_excavation: <Users className="w-4 h-4" />,
  fast_track: <Zap className="w-4 h-4" />,
  emergency_reschedule: <AlertTriangle className="w-4 h-4" />,
  route_diversion: <RotateCcw className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

const CATEGORY_BADGE_COLORS: Record<ResolutionCategory, string> = {
  sequential_delay:    'bg-purple-500/20 text-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
  joint_excavation:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  fast_track:          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  emergency_reschedule:'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  route_diversion:     'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
  other:               'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const CATEGORY_BORDER_COLORS: Record<ResolutionCategory, string> = {
  sequential_delay:    'border-purple-500/30 dark:border-purple-500/30',
  joint_excavation:    'border-emerald-200 dark:border-emerald-800',
  fast_track:          'border-amber-200 dark:border-amber-800',
  emergency_reschedule:'border-red-200 dark:border-red-800',
  route_diversion:     'border-purple-200 dark:border-purple-800',
  other:               'border-gray-200 dark:border-gray-700',
};

const CATEGORY_LEFT_COLORS: Record<ResolutionCategory, string> = {
  sequential_delay:    'bg-[#7C3AED]',
  joint_excavation:    'bg-emerald-500',
  fast_track:          'bg-amber-500',
  emergency_reschedule:'bg-red-500',
  route_diversion:     'bg-purple-500',
  other:               'bg-gray-400',
};

// ── Ledger Entry Card ─────────────────────────────────────────

function LedgerEntryCard({
  entry,
  isGovernment,
}: {
  entry: LedgerEntry;
  isGovernment: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const categoryColor = CATEGORY_BADGE_COLORS[entry.resolutionCategory] ?? CATEGORY_BADGE_COLORS.other;
  const borderColor   = CATEGORY_BORDER_COLORS[entry.resolutionCategory] ?? CATEGORY_BORDER_COLORS.other;
  const leftColor     = CATEGORY_LEFT_COLORS[entry.resolutionCategory] ?? CATEGORY_LEFT_COLORS.other;
  const categoryIcon  = CATEGORY_ICONS[entry.resolutionCategory] ?? CATEGORY_ICONS.other;
  const categoryLabel = RESOLUTION_CATEGORY_LABELS[entry.resolutionCategory] ?? 'Schedule Adjustment';

  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl border ${borderColor} shadow-sm overflow-hidden`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftColor} rounded-l-xl`} />

      <div className="pl-5 pr-5 pt-5 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${categoryColor}`}>
                {categoryIcon}
                {categoryLabel}
              </span>
              {entry.isDemonstrationRecord && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-medium">
                  Recorded Demonstration Event
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
              {entry.title}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDateTime(entry.timestamp)}
            </div>
            {entry.conflictId && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                Ref: {entry.id.slice(-10).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Location row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            {entry.location}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            Segment: <span className="font-mono">{entry.segmentId}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            {entry.projects.length} project{entry.projects.length !== 1 ? 's' : ''} affected
          </span>
        </div>

        {/* Public citizen explanation — always visible, no jargon */}
        <div className="bg-purple-950/20 dark:bg-purple-950/30 border border-purple-500/30 dark:border-purple-500/30 rounded-lg p-3.5 text-xs text-purple-100 dark:text-purple-200 leading-relaxed">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Public Notice: </span>
              {entry.citizenExplanation}
            </div>
          </div>
        </div>

        {/* Affected projects summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entry.projects.map((proj) => (
            <div
              key={proj.projectId}
              className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                  {proj.projectTitle}
                </div>
                <NavLink
                  to={`/projects/${proj.projectId}`}
                  className="shrink-0 text-purple-400 dark:text-purple-300 hover:underline flex items-center gap-0.5"
                >
                  View <ChevronRight className="w-3 h-3" />
                </NavLink>
              </div>
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {proj.department}
              </div>
              <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
                {proj.changes.length > 0 ? (
                  proj.changes.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-gray-400 dark:text-gray-500">
                        {ch.field === 'startDate' ? 'Start' : 'End'}:
                      </span>
                      <span className="line-through text-gray-400 dark:text-gray-500 font-mono">
                        {formatDate(ch.previousValue)}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-teal-500" />
                      <span className="font-semibold text-teal-700 dark:text-teal-300 font-mono">
                        {formatDate(ch.newValue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">
                      Original: {formatDate(proj.originalStartDate)} → {formatDate(proj.originalEndDate)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {proj.scheduleConfidence === 'confirmed' ? (
                  <CheckCircle2 className="w-3 h-3 text-teal-500" />
                ) : (
                  <Clock className="w-3 h-3 text-amber-500" />
                )}
                <span className={`font-medium ${proj.scheduleConfidence === 'confirmed' ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {proj.scheduleConfidence === 'confirmed' ? 'Confirmed revised date' : 'Estimated revised date'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-purple-400 dark:text-purple-300 hover:underline flex items-center gap-1 mt-1"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide details' : (isGovernment ? 'Show coordinator details' : 'Show decision details')}
        </button>

        {/* Expanded detail section */}
        {expanded && (
          <div className="space-y-3 pt-1 animate-fade-in">
            {/* Reason */}
            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Reason for Rescheduling: </span>
                  {entry.reason}
                </div>
              </div>
            </div>

            {/* Government-only: coordinator justification */}
            {isGovernment && (
              <div className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs">
                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Coordinator Justification:{' '}
                    </span>
                    {entry.coordinatorJustification}
                  </div>
                </div>
                {entry.performedBy && (
                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pl-6">
                    <Building2 className="w-3 h-3" />
                    Recorded by: {entry.performedBy}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const ALL_CATEGORIES: (ResolutionCategory | 'all')[] = [
  'all',
  'sequential_delay',
  'joint_excavation',
  'fast_track',
  'emergency_reschedule',
  'route_diversion',
  'other',
];

const CATEGORY_FILTER_LABELS: Record<ResolutionCategory | 'all', string> = {
  all:                 'All Decisions',
  sequential_delay:    'Sequential',
  joint_excavation:    'Joint Coordination',
  fast_track:          'Fast-Track',
  emergency_reschedule:'Emergency',
  route_diversion:     'Traffic Diversion',
  other:               'Administrative',
};

export default function AccountabilityLedger() {
  const { state, isGovernment } = useApp();
  const { ledgerEntries = [], projects } = state;

  const [searchQuery, setSearchQuery]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ResolutionCategory | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  // Collect unique segments for filter
  const uniqueSegments = useMemo(() => {
    const segs = new Set<string>();
    ledgerEntries.forEach((e) => segs.add(e.segmentId));
    return Array.from(segs).sort();
  }, [ledgerEntries]);

  // Sorted newest-first, then filtered
  const filteredEntries = useMemo(() => {
    const sorted = [...ledgerEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted.filter((e) => {
      if (categoryFilter !== 'all' && e.resolutionCategory !== categoryFilter) return false;
      if (departmentFilter) {
        const hasDept = e.projects.some((p) => p.department === departmentFilter);
        if (!hasDept) return false;
      }
      if (segmentFilter && e.segmentId !== segmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.segmentId.toLowerCase().includes(q) ||
          e.citizenExplanation.toLowerCase().includes(q) ||
          e.projects.some(
            (p) =>
              p.projectTitle.toLowerCase().includes(q) ||
              p.department.toLowerCase().includes(q) ||
              p.location.toLowerCase().includes(q)
          );
        if (!match) return false;
      }
      return true;
    });
  }, [ledgerEntries, categoryFilter, departmentFilter, segmentFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = ledgerEntries.length;
    const thisMonth = ledgerEntries.filter((e) => {
      const d = new Date(e.timestamp);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const categoryCounts: Record<string, number> = {};
    ledgerEntries.forEach((e) => {
      categoryCounts[e.resolutionCategory] = (categoryCounts[e.resolutionCategory] || 0) + 1;
    });
    const mostCommonCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'sequential_delay';
    const affectedProjects = new Set(ledgerEntries.flatMap((e) => e.projects.map((p) => p.projectId))).size;
    return { total, thisMonth, mostCommonCategory, affectedProjects };
  }, [ledgerEntries]);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Public Accountability Ledger
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isGovernment
                  ? 'Chronological record of confirmed municipal project scheduling decisions'
                  : 'A transparent public record of why and when project schedules changed'}
              </p>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 rounded-lg">
            ⚠️ Demonstration Data — Client-Side Storage Only
          </div>
        </div>

        {/* Role-specific info banner */}
        {isGovernment ? (
          <div className="mt-3 bg-purple-950/20 dark:bg-purple-950/30 border border-purple-500/30 dark:border-purple-500/30 rounded-lg px-4 py-2.5 text-xs text-purple-200 dark:text-purple-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400 dark:text-purple-300 shrink-0" />
            Government view: Coordinator justifications, technical details, and decision attribution visible below each entry.
          </div>
        ) : (
          <div className="mt-3 bg-purple-950/20 dark:bg-purple-950/30 border border-purple-500/30 dark:border-purple-500/30 rounded-lg px-4 py-2.5 text-xs text-purple-200 dark:text-purple-200 flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            Public view: Each entry explains what changed, which road was affected, and why the rescheduling was necessary.
          </div>
        )}
      </div>

      {/* KPI stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Decisions',
            value: stats.total,
            color: 'text-teal-700 dark:text-teal-300',
            bg: 'bg-purple-950/20 dark:bg-purple-950/40',
            border: 'border-purple-500/30 dark:border-teal-800',
            icon: <BookOpen className="w-4 h-4" />,
          },
          {
            label: 'This Month',
            value: stats.thisMonth,
            color: 'text-blue-700 dark:text-purple-300',
            bg: 'bg-purple-950/20 dark:bg-purple-950/40',
            border: 'border-purple-500/30 dark:border-purple-500/30',
            icon: <Calendar className="w-4 h-4" />,
          },
          {
            label: 'Projects Affected',
            value: stats.affectedProjects,
            color: 'text-purple-700 dark:text-purple-300',
            bg: 'bg-purple-50 dark:bg-purple-950/40',
            border: 'border-purple-200 dark:border-purple-800',
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            label: 'Showing Now',
            value: filteredEntries.length,
            color: 'text-gray-700 dark:text-gray-300',
            bg: 'bg-gray-50 dark:bg-gray-750',
            border: 'border-gray-200 dark:border-gray-700',
            icon: <Filter className="w-4 h-4" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} ${stat.border} border rounded-xl p-4 flex items-center gap-3`}
          >
            <div className={`${stat.color} opacity-80`}>{stat.icon}</div>
            <div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter & Search</span>
        </div>

        {/* Search box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by project name, road, location or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-[#7C3AED] text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {CATEGORY_FILTER_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Department & Segment selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Departments</option>
              {DEPARTMENT_LIST.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Road Segment
            </label>
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Segments</option>
              {uniqueSegments.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear filters */}
        {(searchQuery || categoryFilter !== 'all' || departmentFilter || segmentFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setDepartmentFilter('');
              setSegmentFilter('');
            }}
            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Ledger entries */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            {ledgerEntries.length === 0
              ? 'No scheduling decisions have been recorded yet. Confirm a schedule resolution in the Conflict Detection page to create the first ledger entry.'
              : 'No entries match your current filters.'}
          </div>
          {ledgerEntries.length > 0 && (
            <NavLink
              to="/conflicts"
              className="inline-flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Go to Conflict Detection <ChevronRight className="w-4 h-4" />
            </NavLink>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Chronological Record — Newest First
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filteredEntries.length} of {ledgerEntries.length} entr{filteredEntries.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {/* Entries list */}
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <LedgerEntryCard
                key={entry.id}
                entry={entry}
                isGovernment={isGovernment}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect to conflict detection */}
      {ledgerEntries.length > 0 && (
        <div className="bg-purple-950/20 dark:bg-purple-950/30 border border-purple-500/30 dark:border-purple-500/30 rounded-xl p-5 text-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 dark:text-purple-300 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-semibold text-blue-900 dark:text-purple-200">
              How decisions appear here
            </div>
            <div className="text-blue-700 dark:text-purple-300 text-xs leading-relaxed">
              Every confirmed scheduling change from the{' '}
              <NavLink to="/conflicts" className="font-medium hover:underline">
                Conflict Detection & Coordination
              </NavLink>{' '}
              page creates a new entry in this ledger automatically. Cancelled simulations or previews do not create records.
              Resetting demonstration data restores the initial example entries.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
