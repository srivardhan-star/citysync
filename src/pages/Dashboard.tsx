import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, Clock,
  Flame, Activity, TrendingUp, ChevronRight, BarChart3,
  Layers, Calendar, Building2, Users
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useTranslation } from '../context/LanguageContext'
import { calculateDelay, formatDate, formatDateTime, STATUS_LABELS } from '../utils'
import clsx from 'clsx'

const STATUS_PIE_COLORS: Record<string, string> = {
  planned: '#7C3AED',
  ongoing: '#F59E0B',
  delayed: '#EF4444',
  completed: '#10B981',
  emergency: '#F43F5E',
}

const DEPT_COLORS = ['#7C3AED', '#A855F7', '#C084FC', '#F472B6', '#6366F1', '#EC4899', '#8B5CF6']

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  to,
  search,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
  to?: string
  search?: string
}) {
  const navigate = useNavigate()
  const handleClick = () => {
    if (to) navigate(search ? `${to}?${search}` : to)
  }
  return (
    <div
      className={clsx('card p-4 flex items-start gap-4', to && 'cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.99]')}
      onClick={handleClick}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--cs-text)' }}>{value}</div>
        <div className="text-sm font-semibold" style={{ color: 'var(--cs-text)' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--cs-muted)' }}>{sub}</div>}
      </div>
      {to && <ChevronRight className="w-4 h-4 ml-auto mt-1" style={{ color: 'var(--cs-muted)' }} />}
    </div>
  )
}

export default function Dashboard() {
  const { state, isGovernment } = useApp()
  const { t } = useTranslation()
  const { projects, conflicts } = state

  const stats = useMemo(() => {
    const total = projects.length
    const ongoing = projects.filter(p => p.status === 'ongoing').length
    const delayed = projects.filter(p => p.status === 'delayed').length
    const completed = projects.filter(p => p.status === 'completed').length
    const emergency = projects.filter(p => p.status === 'emergency').length
    const planned = projects.filter(p => p.status === 'planned').length
    const activeConflicts = conflicts.filter(c => !c.resolved).length

    // On-time completion
    const completedWithDates = projects.filter(p => p.status === 'completed' && p.actualEndDate && p.plannedEndDate)
    const onTime = completedWithDates.filter(p => {
      const d = calculateDelay(p)
      return !d.isDelayed
    }).length

    return { total, ongoing, delayed, completed, emergency, planned, activeConflicts, onTime, completedWithDates: completedWithDates.length }
  }, [projects, conflicts])

  // Status pie chart data with multilingual labels
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: t(`status.${status}`, STATUS_LABELS[status] || status),
      value: count,
      color: STATUS_PIE_COLORS[status] || '#94A3B8',
    }))
  }, [projects, t])

  // Department bar chart data
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach(p => { counts[p.department] = (counts[p.department] || 0) + 1 })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count], i) => ({
        dept: dept.replace(' & ', ' & ').split(' ').slice(0, 2).join(' '),
        fullDept: dept,
        count,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
      }))
  }, [projects])

  // Recent activity
  const recentActivity = useMemo(() => {
    const all: { project: typeof projects[0]; entry: typeof projects[0]['activityHistory'][0] }[] = []
    projects.forEach(p => {
      p.activityHistory.forEach(e => all.push({ project: p, entry: e }))
    })
    return all
      .sort((a, b) => new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime())
      .slice(0, 6)
  }, [projects])

  // Upcoming milestones
  const upcomingMilestones = useMemo(() => {
    const today = new Date()
    const all: { project: typeof projects[0]; milestone: typeof projects[0]['milestones'][0] }[] = []
    projects.forEach(p => {
      p.milestones.filter(m => !m.completed).forEach(m => {
        const d = new Date(m.plannedDate)
        if (d >= today) all.push({ project: p, milestone: m })
      })
    })
    return all
      .sort((a, b) => new Date(a.milestone.plannedDate).getTime() - new Date(b.milestone.plannedDate).getTime())
      .slice(0, 5)
  }, [projects])

  // Attention needed
  const needsAttention = useMemo(() =>
    projects.filter(p => p.status === 'delayed' || p.status === 'emergency')
      .sort((a, b) => (b.status === 'emergency' ? 1 : 0) - (a.status === 'emergency' ? 1 : 0)),
    [projects]
  )

  // Completion comparison chart data
  const completionData = useMemo(() => {
    return projects
      .filter(p => p.status === 'completed' && p.actualEndDate && p.plannedEndDate)
      .map(p => {
        const delay = calculateDelay(p)
        return {
          name: p.title.substring(0, 20) + (p.title.length > 20 ? '…' : ''),
          onTime: !delay.isDelayed ? 1 : 0,
          delayed: delay.isDelayed ? 1 : 0,
          delayDays: delay.delayDays,
        }
      })
  }, [projects])

  const ACTIVITY_ICONS: Record<string, string> = {
    created: '✨',
    status_changed: '🔄',
    milestone_completed: '✅',
    delay_recorded: '⚠️',
    progress_updated: '📈',
    conflict_noted: '⚡',
    resolution_applied: '🤝',
    deadline_changed: '📅',
    general: 'ℹ️',
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Perspective Info Banner */}
      <div className={clsx(
        'border rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs',
        isGovernment
          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
          : 'bg-pink-950/20 border-pink-500/30 text-pink-200'
      )}>
        <div className="flex items-center gap-2.5">
          {isGovernment ? (
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
          ) : (
            <Users className="w-4 h-4 text-pink-400 shrink-0" />
          )}
          <span>
            <strong>{isGovernment ? t('dashboard.govBannerTitle') : t('dashboard.publicBannerTitle')}</strong> — {
              isGovernment
                ? t('dashboard.govBannerDesc')
                : t('dashboard.publicBannerDesc')
            }
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--cs-text)' }}>{t('dashboard.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cs-muted)' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <NavLink to="/projects" className="btn-primary hidden sm:inline-flex">
          {t('nav.projectsPublic')}
          <ChevronRight className="w-4 h-4" />
        </NavLink>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Layers} label={t('dashboard.totalProjects')} value={stats.total} color="bg-purple-500/20 text-purple-300 border border-purple-500/30" to="/projects" />
        <StatCard icon={Activity} label={t('status.ongoing')} value={stats.ongoing} color="bg-amber-500/20 text-amber-300 border border-amber-500/30" to="/projects" search="status=ongoing" />
        <StatCard icon={Clock} label={t('status.delayed')} value={stats.delayed} sub="Past original deadline" color="bg-red-500/20 text-red-300 border border-red-500/30" to="/projects" search="status=delayed" />
        <StatCard icon={CheckCircle2} label={t('status.completed')} value={stats.completed} sub={`${stats.onTime} on time`} color="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" to="/projects" search="status=completed" />
        <StatCard icon={Flame} label={t('status.emergency')} value={stats.emergency} color="bg-rose-500/20 text-rose-300 border border-rose-500/30" to="/projects" search="status=emergency" />
        <StatCard icon={AlertTriangle} label={t('dashboard.conflicts')} value={conflicts.filter(c => !c.resolved).length} sub="Scheduling conflicts" color="bg-pink-500/20 text-pink-300 border border-pink-500/30" to="/conflicts" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <BarChart3 className="w-4 h-4 text-purple-400" />
            {t('dashboard.statusDistribution')}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [v, n]} />
              <Legend formatter={(v) => <span className="text-xs" style={{ color: 'var(--cs-muted)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department distribution */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <Building2 className="w-4 h-4 text-purple-400" />
            {t('dashboard.deptWorkload')}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={90} />
              <Tooltip
                formatter={(v: any) => [v, t('dashboard.totalProjects')]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {deptData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Attention + Activity + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs attention */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            {t('dashboard.attentionRequired')}
            <span className="ml-auto text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">
              {needsAttention.length}
            </span>
          </h2>
          {needsAttention.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--cs-muted)' }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm">{t('dashboard.noAlerts')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(p => {
                const delay = calculateDelay(p)
                return (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-500/10 transition-colors group"
                  >
                    <div className={clsx(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      p.status === 'emergency' ? 'bg-rose-500' : 'bg-red-400'
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-purple-300" style={{ color: 'var(--cs-text)' }}>{p.title}</p>
                      <p className="text-xs" style={{ color: 'var(--cs-muted)' }}>{p.department}</p>
                      {delay.isDelayed && (
                        <p className="text-xs text-rose-400 font-medium">{delay.comparisonLabel}</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" style={{ color: 'var(--cs-muted)' }} />
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <Activity className="w-4 h-4 text-purple-400" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentActivity.map(({ project, entry }, i) => (
              <NavLink
                key={`${project.id}-${entry.id}-${i}`}
                to={`/projects/${project.id}`}
                className="flex items-start gap-2 p-2 rounded-xl hover:bg-purple-500/10 transition-colors group"
              >
                <span className="text-sm flex-shrink-0">{ACTIVITY_ICONS[entry.type] || 'ℹ️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs line-clamp-2 group-hover:text-purple-300" style={{ color: 'var(--cs-text)' }}>{entry.description}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--cs-muted)' }}>{project.title.substring(0,28)}… · {formatDateTime(entry.timestamp)}</p>
                </div>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Upcoming milestones */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <Calendar className="w-4 h-4 text-pink-400" />
            {t('dashboard.recentMilestones')}
          </h2>
          {upcomingMilestones.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--cs-muted)' }}>No upcoming milestones</div>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map(({ project, milestone }) => {
                const daysUntil = Math.ceil((new Date(milestone.plannedDate).getTime() - Date.now()) / 86400000)
                return (
                  <NavLink
                    key={`${project.id}-${milestone.id}`}
                    to={`/projects/${project.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-500/10 transition-colors group"
                  >
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                      daysUntil <= 3 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      daysUntil <= 7 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    )}>
                      {daysUntil}d
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-purple-300" style={{ color: 'var(--cs-text)' }}>{milestone.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--cs-muted)' }}>{project.title.substring(0, 28)}{project.title.length > 28 ? '…' : ''}</p>
                      <p className="text-xs" style={{ color: 'var(--cs-muted)' }}>{formatDate(milestone.plannedDate)}</p>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* On-time completion chart */}
      {completionData.length > 0 && (
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--cs-text)' }}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            {t('dashboard.onTimeRate')}
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{stats.onTime}</div>
              <div className="text-xs" style={{ color: 'var(--cs-muted)' }}>Completed On Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-rose-400">{stats.completedWithDates - stats.onTime}</div>
              <div className="text-xs" style={{ color: 'var(--cs-muted)' }}>Completed Late</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-purple-400">
                {stats.completedWithDates > 0 ? Math.round(stats.onTime / stats.completedWithDates * 100) : 0}%
              </div>
              <div className="text-xs" style={{ color: 'var(--cs-muted)' }}>{t('dashboard.onTimeRate')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
