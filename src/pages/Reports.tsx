// ============================================================
// CivicTrack — Reports & Analytics Page
// ============================================================

import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  AlertTriangle,
  Users,
  Building2,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import {
  calculateDelay,
  formatDate,
  STATUS_LABELS,
  DEPARTMENT_LIST,
  exportProjectsToCSV,
} from '../utils';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import type { Project } from '../types';

// ── Colour constants ─────────────────────────────────────────

const STATUS_CHART_COLORS: Record<string, string> = {
  planned:   '#3b82f6',
  ongoing:   '#f59e0b',
  delayed:   '#ef4444',
  completed: '#22c55e',
  emergency: '#e11d48',
};

const DEPT_PALETTE = [
  '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
  '#6366f1', '#8b5cf6', '#f59e0b',
];

// ── Helpers ──────────────────────────────────────────────────

function abbrev(title: string, max = 18): string {
  return title.length > max ? title.slice(0, max - 1) + '…' : title;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Custom Tooltip ────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex gap-2">
          <span>{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function MetricCard({ icon, label, value, sub, accent = 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${accent} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function Reports() {
  const { state } = useApp();
  const { t } = useTranslation();

  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [tableSearch, setTableSearch] = useState('');
  const [tableSortKey, setTableSortKey] = useState<keyof Project | 'delay'>('title');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  const [tablePage, setTablePage] = useState(1);

  const PAGE_SIZE = 12;

  // ── Filtered projects (dept + status) ─────────────────────

  const filteredProjects = useMemo(() => {
    return state.projects.filter((p) => {
      const deptOk = deptFilter === 'All' || p.department === deptFilter;
      const statusOk = statusFilter === 'All' || p.status === statusFilter;
      return deptOk && statusOk;
    });
  }, [state.projects, deptFilter, statusFilter]);

  // ── Key metrics (computed from filteredProjects) ───────────

  const metrics = useMemo(() => {
    const total = filteredProjects.length;
    const completed = filteredProjects.filter((p) => p.status === 'completed');
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // On-time: completed projects that have both dates, where actualEnd <= plannedEnd
    const completedWithDates = completed.filter(
      (p) => p.plannedEndDate && p.actualEndDate
    );
    const onTime = completedWithDates.filter((p) => {
      const d = calculateDelay(p);
      return !d.isDelayed;
    });
    const onTimeRate =
      completedWithDates.length > 0
        ? Math.round((onTime.length / completedWithDates.length) * 100)
        : 0;

    // Average delay for late-completed projects
    const lateCompleted = completedWithDates.filter((p) => {
      const d = calculateDelay(p);
      return d.isDelayed;
    });
    const avgDelay =
      lateCompleted.length > 0
        ? Math.round(avg(lateCompleted.map((p) => calculateDelay(p).delayDays)))
        : 0;

    // Conflicts
    const activeConflicts = state.conflicts.filter((c) => !c.resolved).length;

    // Avg citizen rating (reviews for filtered projects)
    const filteredIds = new Set(filteredProjects.map((p) => p.id));
    const relevantReviews = state.reviews.filter((r) => filteredIds.has(r.projectId));
    const avgRating =
      relevantReviews.length > 0
        ? (avg(relevantReviews.map((r) => r.rating))).toFixed(1)
        : '—';

    return {
      total,
      completedCount: completed.length,
      completionRate,
      onTimeRate,
      avgDelay,
      activeConflicts,
      avgRating,
      reviewCount: relevantReviews.length,
    };
  }, [filteredProjects, state.conflicts, state.reviews]);

  // ── Chart: Status distribution ─────────────────────────────

  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {
      planned: 0, ongoing: 0, delayed: 0, completed: 0, emergency: 0,
    };
    filteredProjects.forEach((p) => {
      if (p.status in counts) counts[p.status]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: STATUS_LABELS[name] ?? name,
        value,
        key: name,
      }));
  }, [filteredProjects]);

  // ── Chart: Department workload (always all depts for bar chart) ─

  const deptBarData = useMemo(() => {
    // When dept filter is active we still show a single bar for context
    const source =
      deptFilter === 'All'
        ? state.projects
        : state.projects.filter((p) => p.department === deptFilter);

    const grouped: Record<string, number> = {};
    source.forEach((p) => {
      grouped[p.department] = (grouped[p.department] ?? 0) + 1;
    });
    return Object.entries(grouped)
      .map(([dept, count]) => ({
        dept: dept.replace(' & ', ' & \n').split('\n')[0], // abbreviate for axis
        fullDept: dept,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [state.projects, deptFilter]);

  // ── Chart: Planned vs Actual duration (completed with both dates) ─

  const plannedVsActualData = useMemo(() => {
    return filteredProjects
      .filter((p) => p.status === 'completed' && p.startDate && p.plannedEndDate && p.actualEndDate)
      .map((p) => {
        const start = parseISO(p.startDate);
        const planned = parseISO(p.plannedEndDate);
        const actual = parseISO(p.actualEndDate!);
        if (!isValid(start) || !isValid(planned) || !isValid(actual)) return null;
        return {
          name: abbrev(p.title),
          fullTitle: p.title,
          Planned: differenceInDays(planned, start),
          Actual: differenceInDays(actual, start),
        };
      })
      .filter(Boolean)
      .slice(0, 15) as { name: string; fullTitle: string; Planned: number; Actual: number }[];
  }, [filteredProjects]);

  // ── Chart: Rating distribution ────────────────────────────

  const ratingDistData = useMemo(() => {
    const filteredIds = new Set(filteredProjects.map((p) => p.id));
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star
    state.reviews
      .filter((r) => filteredIds.has(r.projectId))
      .forEach((r) => {
        const idx = Math.min(Math.max(Math.round(r.rating), 1), 5) - 1;
        counts[idx]++;
      });
    return counts.map((count, i) => ({
      star: `${i + 1} ★`,
      count,
    }));
  }, [filteredProjects, state.reviews]);

  // ── Chart: On-time vs Delayed completion ─────────────────

  const onTimeVsDelayedData = useMemo(() => {
    const completedWithDates = filteredProjects.filter(
      (p) => p.status === 'completed' && p.plannedEndDate && p.actualEndDate
    );
    let onTime = 0;
    let delayed = 0;
    completedWithDates.forEach((p) => {
      if (calculateDelay(p).isDelayed) delayed++;
      else onTime++;
    });
    return [
      { label: 'On-Time', count: onTime, fill: '#22c55e' },
      { label: 'Delayed', count: delayed, fill: '#ef4444' },
    ];
  }, [filteredProjects]);

  // ── Table ────────────────────────────────────────────────

  const tableData = useMemo(() => {
    const search = tableSearch.toLowerCase();
    const filtered = filteredProjects.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.id.toLowerCase().includes(search) ||
        p.department.toLowerCase().includes(search)
    );

    return [...filtered].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      if (tableSortKey === 'delay') {
        valA = calculateDelay(a).delayDays;
        valB = calculateDelay(b).delayDays;
      } else {
        valA = (a[tableSortKey as keyof Project] as string | number) ?? '';
        valB = (b[tableSortKey as keyof Project] as string | number) ?? '';
      }
      if (valA < valB) return tableSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, tableSearch, tableSortKey, tableSortDir]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE));
  const pagedData = tableData.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);

  function handleSort(key: keyof Project | 'delay') {
    if (key === tableSortKey) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('asc');
    }
    setTablePage(1);
  }

  function SortIcon({ col }: { col: keyof Project | 'delay' }) {
    if (col !== tableSortKey) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{tableSortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // ── Status badge ─────────────────────────────────────────

  const STATUS_BADGE: Record<string, string> = {
    planned:   'bg-blue-100 text-blue-800',
    ongoing:   'bg-amber-100 text-amber-800',
    delayed:   'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    emergency: 'bg-rose-100 text-rose-900',
  };

  // ── CSV Export (filtered projects) ───────────────────────

  function handleExport() {
    exportProjectsToCSV(filteredProjects);
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white transition-colors">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 print:hidden transition-colors">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Live data from {state.projects.length} projects · {state.reviews.length} reviews
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition bg-white dark:bg-gray-800"
            >
              <Download className="w-4 h-4" />
              {t('reports.exportCsv')}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition bg-white dark:bg-gray-800"
            >
              <Printer className="w-4 h-4" />
              {t('reports.printReport')}
            </button>
            <NavLink
              to="/dashboard"
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              ← {t('nav.dashboard')}
            </NavLink>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Filters ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
              <Filter className="w-4 h-4" />
              Filters
            </div>

            {/* Department */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                Department
              </label>
              <select
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setTablePage(1); }}
                className="text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="All">All Departments</option>
                {DEPARTMENT_LIST.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setTablePage(1); }}
                className="text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="All">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Clear */}
            {(deptFilter !== 'All' || statusFilter !== 'All') && (
              <button
                onClick={() => { setDeptFilter('All'); setStatusFilter('All'); setTablePage(1); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              Showing {filteredProjects.length} of {state.projects.length} projects
            </span>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <section>
          <SectionHeader title="Key Metrics" sub="Computed from filtered project and review data" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Total Projects"
              value={metrics.total}
              sub={`${metrics.completedCount} completed`}
              accent="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
            />
            <MetricCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              label="Completion Rate"
              value={`${metrics.completionRate}%`}
              sub={`${metrics.completedCount} / ${metrics.total}`}
              accent="bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="On-Time Rate"
              value={`${metrics.onTimeRate}%`}
              sub="Of completed projects"
              accent="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
            />
            <MetricCard
              icon={<Clock className="w-5 h-5" />}
              label="Avg Delay"
              value={metrics.avgDelay > 0 ? `${metrics.avgDelay}d` : '—'}
              sub="Late-completed projects"
              accent="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
            />
            <MetricCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Active Conflicts"
              value={metrics.activeConflicts}
              sub="Unresolved"
              accent="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
            />
            <MetricCard
              icon={<Star className="w-5 h-5" />}
              label="Avg Rating"
              value={metrics.avgRating}
              sub={`${metrics.reviewCount} reviews`}
              accent="bg-yellow-50 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400"
            />
          </div>
        </section>

        {/* ── Charts Row 1: Status Pie + Dept Workload Bar ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Status Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <SectionHeader
              title="Status Distribution"
              sub="Project count by current status"
            />
            {statusPieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusPieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_CHART_COLORS[entry.key] ?? '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as typeof statusPieData[0];
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold" style={{ color: STATUS_CHART_COLORS[d.key] }}>
                            {d.name}
                          </p>
                          <p className="text-gray-700 dark:text-gray-200">{d.value} project{d.value !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Department Workload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <SectionHeader
              title="Department Workload"
              sub="Project count per department"
            />
            {deptBarData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptBarData} margin={{ top: 5, right: 16, left: 0, bottom: 48 }}>
                  <XAxis
                    dataKey="dept"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as typeof deptBarData[0];
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold text-gray-700 dark:text-gray-200">{d.fullDept}</p>
                          <p className="text-blue-600 dark:text-blue-400">{d.count} project{d.count !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                    {deptBarData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={DEPT_PALETTE[idx % DEPT_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Charts Row 2: Planned vs Actual + Rating Distribution ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Planned vs Actual Duration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <SectionHeader
              title="Planned vs Actual Duration"
              sub="Completed projects with both dates (up to 15 most recent)"
            />
            {plannedVsActualData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                No completed projects with full date data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={plannedVsActualData}
                  margin={{ top: 5, right: 16, left: 0, bottom: 56 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    label={{
                      value: 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 10, fill: '#9ca3af' },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = plannedVsActualData.find((x) => x.name === label);
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm max-w-[200px]">
                          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1 text-xs">{d?.fullTitle ?? label}</p>
                          {payload.map((e) => (
                            <p key={e.name} style={{ color: e.color }} className="flex justify-between gap-4">
                              <span>{e.name}</span>
                              <span className="font-semibold">{e.value}d</span>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Planned" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Citizen Rating Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <SectionHeader
              title="Citizen Satisfaction"
              sub="Rating distribution across filtered projects"
            />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={ratingDistData}
                margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="star" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Reviews" radius={[4, 4, 0, 0]}>
                  {ratingDistData.map((_, idx) => {
                    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];
                    return <Cell key={idx} fill={colors[idx]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Chart: On-Time vs Delayed ── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <SectionHeader
            title="On-Time vs Delayed Completion"
            sub="Completed projects with both planned and actual end dates"
          />
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-full sm:w-72 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={onTimeVsDelayedData}
                  layout="vertical"
                  margin={{ top: 5, right: 32, left: 0, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    width={64}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" radius={[0, 4, 4, 0]}>
                    {onTimeVsDelayedData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stat blurbs */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{onTimeVsDelayedData[0].count}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">On-Time</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Completed ≤ planned date</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-4xl font-bold text-red-500 dark:text-red-400">{onTimeVsDelayedData[1].count}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Delayed</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Completed after planned date</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{metrics.onTimeRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">On-Time Rate</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Of dated completions</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Projects Table ── */}
        <section>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Projects Table
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    {tableData.length} result{tableData.length !== 1 ? 's' : ''}
                  </span>
                </h2>
              </div>
              <input
                type="text"
                placeholder="Search by title, ID, department…"
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                className="text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-1.5 w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700">
                    {(
                      [
                        { key: 'id', label: 'ID' },
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'department', label: 'Department' },
                        { key: 'progress', label: 'Progress' },
                        { key: 'plannedEndDate', label: 'Planned End' },
                        { key: 'actualEndDate', label: 'Actual End' },
                        { key: 'delay', label: 'Delay' },
                        { key: 'rating', label: 'Rating' },
                      ] as { key: keyof Project | 'delay' | 'rating'; label: string }[]
                    ).map((col) => (
                      <th
                        key={col.key}
                        onClick={() =>
                          col.key !== 'rating' && handleSort(col.key as keyof Project | 'delay')
                        }
                        className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${
                          col.key !== 'rating' ? 'cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none' : ''
                        }`}
                      >
                        {col.label}
                        {col.key !== 'rating' && (
                          <SortIcon col={col.key as keyof Project | 'delay'} />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No projects match your filters.
                      </td>
                    </tr>
                  )}
                  {pagedData.map((project, idx) => {
                    const delay = calculateDelay(project);
                    const filteredIds = new Set(filteredProjects.map((p) => p.id));
                    const projReviews = state.reviews.filter(
                      (r) => r.projectId === project.id && filteredIds.has(project.id)
                    );
                    const projAvgRating =
                      projReviews.length > 0
                        ? (avg(projReviews.map((r) => r.rating))).toFixed(1)
                        : null;

                    return (
                      <tr
                        key={project.id}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors'
                            : 'bg-gray-50/60 dark:bg-gray-850/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors'
                        }
                      >
                        {/* ID */}
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {project.id.slice(0, 12)}…
                        </td>

                        {/* Title */}
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium max-w-[180px]">
                          <NavLink
                            to={`/projects/${project.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline line-clamp-1"
                          >
                            {project.title}
                          </NavLink>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_BADGE[project.status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {STATUS_LABELS[project.status] ?? project.status}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                          {project.department}
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${project.progress}%`,
                                  backgroundColor:
                                    project.progress === 100
                                      ? '#22c55e'
                                      : project.progress >= 50
                                      ? '#3b82f6'
                                      : '#f59e0b',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                              {project.progress}%
                            </span>
                          </div>
                        </td>

                        {/* Planned End */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs tabular-nums">
                          {formatDate(project.plannedEndDate)}
                        </td>

                        {/* Actual End */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs tabular-nums">
                          {project.actualEndDate ? formatDate(project.actualEndDate) : '—'}
                        </td>

                        {/* Delay */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {delay.isDelayed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <Clock className="w-3 h-3" />
                              {delay.delayDays}d
                            </span>
                          ) : delay.isCompleted ? (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">On time</span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{delay.comparisonLabel}</span>
                          )}
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {projAvgRating ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                              <Star className="w-3 h-3 fill-current" />
                              {projAvgRating}
                              <span className="text-gray-400 dark:text-gray-500 font-normal">
                                ({projReviews.length})
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Page {tablePage} of {totalPages} · {tableData.length} results
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setTablePage(page)}
                        className={`px-2.5 py-1 rounded border text-xs ${
                          page === tablePage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  {totalPages > 7 && tablePage < totalPages && (
                    <>
                      <span className="px-1 text-gray-400 dark:text-gray-500">…</span>
                      <button
                        onClick={() => setTablePage(totalPages)}
                        className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    disabled={tablePage === totalPages}
                    className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Print-only summary ── */}
        <div className="hidden print:block mt-6 text-xs text-gray-500 border-t pt-4">
          <p>CivicTrack Analytics Report · Generated {new Date().toLocaleString()}</p>
          <p>
            Filters: Department = {deptFilter} · Status = {statusFilter}
          </p>
          <p>
            Total: {metrics.total} projects · Completion Rate: {metrics.completionRate}% ·
            On-Time: {metrics.onTimeRate}% · Avg Delay: {metrics.avgDelay}d ·
            Active Conflicts: {metrics.activeConflicts} · Avg Rating: {metrics.avgRating}
          </p>
        </div>

      </div>
    </div>
  );
}
