import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, CheckCircle2, Clock,
  Flame, Activity, TrendingUp, ChevronRight, BarChart3,
  Layers, MapPin, Calendar, Building2, Users
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { calculateDelay, formatDate, formatDateTime, STATUS_LABELS, CATEGORY_LABELS } from '../utils'
import clsx from 'clsx'

const STATUS_PIE_COLORS: Record<string, string> = {
  planned: '#3b82f6',
  ongoing: '#f59e0b',
  delayed: '#ef4444',
  completed: '#22c55e',
  emergency: '#e11d48',
}

const DEPT_COLORS = ['#3b82f6', '#0ea5e9', '#0d9488', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

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
      className={clsx('card p-4 flex items-start gap-4', to && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={handleClick}
    >
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
      {to && <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />}
    </div>
  )
}

export default function Dashboard() {
  const { state, isGovernment, isPublic } = useApp()
  const { projects, conflicts, notifications } = state

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

  // Status pie chart data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_PIE_COLORS[status] || '#94a3b8',
    }))
  }, [projects])

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
    created: '🆕',
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
        isGovernment ? 'bg-blue-50/80 border-blue-200 text-blue-900' : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
      )}>
        <div className="flex items-center gap-2.5">
          {isGovernment ? (
            <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
          ) : (
            <Users className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>
            <strong>{isGovernment ? 'Municipal Government Mode' : 'Resident Public Mode'}</strong> — {
              isGovernment
                ? 'Full administrative capabilities active. You can create/edit projects, record delay justifications, and resolve scheduling conflicts.'
                : 'Citizen transparency view. You can track ongoing works, view detour plans, submit quality ratings, and report local project issues.'
            }
          </span>
        </div>
        <span className="text-[11px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
          Switch role via toggle in top navigation
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">City Infrastructure Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time tracking of public works projects across all departments
          </p>
        </div>
        <NavLink to="/projects" className="btn-primary hidden sm:inline-flex">
          View All Projects
          <ChevronRight className="w-4 h-4" />
        </NavLink>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Layers} label="Total Projects" value={stats.total} color="bg-blue-100 text-blue-700" to="/projects" />
        <StatCard icon={Activity} label="Ongoing" value={stats.ongoing} color="bg-amber-100 text-amber-700" to="/projects" search="status=ongoing" />
        <StatCard icon={Clock} label="Delayed" value={stats.delayed} sub="Past original deadline" color="bg-red-100 text-red-700" to="/projects" search="status=delayed" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} sub={`${stats.onTime} on time`} color="bg-green-100 text-green-700" to="/projects" search="status=completed" />
        <StatCard icon={Flame} label="Emergency" value={stats.emergency} color="bg-rose-100 text-rose-700" to="/projects" search="status=emergency" />
        <StatCard icon={AlertTriangle} label="Conflicts" value={conflicts.filter(c => !c.resolved).length} sub="Scheduling conflicts" color="bg-orange-100 text-orange-700" to="/conflicts" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="card p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Project Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [v, n]} />
              <Legend formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department distribution */}
        <div className="card p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            Department Workload
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={90} />
              <Tooltip
                formatter={(v: any) => [v, 'Projects']}
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
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Needs Attention
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {needsAttention.length}
            </span>
          </h2>
          {needsAttention.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">No projects need attention</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(p => {
                const delay = calculateDelay(p)
                return (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={clsx(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      p.status === 'emergency' ? 'bg-rose-500' : 'bg-red-400'
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{p.title}</p>
                      <p className="text-xs text-gray-500">{p.department}</p>
                      {delay.isDelayed && (
                        <p className="text-xs text-red-600 font-medium">{delay.comparisonLabel}</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-1 flex-shrink-0" />
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentActivity.map(({ project, entry }, i) => (
              <NavLink
                key={`${project.id}-${entry.id}-${i}`}
                to={`/projects/${project.id}`}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm flex-shrink-0">{ACTIVITY_ICONS[entry.type] || 'ℹ️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 line-clamp-2 group-hover:text-blue-700">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{project.title.substring(0,28)}… · {formatDateTime(entry.timestamp)}</p>
                </div>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Upcoming milestones */}
        <div className="card p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            Upcoming Milestones
          </h2>
          {upcomingMilestones.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No upcoming milestones</div>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map(({ project, milestone }) => {
                const daysUntil = Math.ceil((new Date(milestone.plannedDate).getTime() - Date.now()) / 86400000)
                return (
                  <NavLink
                    key={`${project.id}-${milestone.id}`}
                    to={`/projects/${project.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                      daysUntil <= 3 ? 'bg-red-100 text-red-700' :
                      daysUntil <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {daysUntil}d
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{milestone.name}</p>
                      <p className="text-xs text-gray-500 truncate">{project.title.substring(0, 28)}{project.title.length > 28 ? '…' : ''}</p>
                      <p className="text-xs text-gray-400">{formatDate(milestone.plannedDate)}</p>
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
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Completed Projects — On-Time vs Delayed
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.onTime}</div>
              <div className="text-xs text-gray-500">Completed On Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.completedWithDates - stats.onTime}</div>
              <div className="text-xs text-gray-500">Completed Late</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.completedWithDates > 0 ? Math.round(stats.onTime / stats.completedWithDates * 100) : 0}%
              </div>
              <div className="text-xs text-gray-500">On-Time Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
