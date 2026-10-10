import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, AlertTriangle, MessageSquare,
  BarChart3, Bell, RefreshCw, ChevronRight, Zap, X, CheckCheck,
  Menu, Shield, Building2, Users, Eye, Map, Sun, Moon, BookOpen
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { formatDateTime } from '../utils'
import clsx from 'clsx'

const NOTIF_TYPE_COLORS: Record<string, string> = {
  emergency: 'text-red-500',
  conflict_detected: 'text-orange-500',
  delay_reported: 'text-yellow-500',
  milestone_complete: 'text-green-500',
  conflict_resolved: 'text-teal-400',
  new_project: 'text-blue-400',
  deadline_changed: 'text-purple-400',
  approaching_start: 'text-indigo-400',
  general: 'text-gray-400',
}

export default function Layout() {
  const {
    state,
    userRole,
    isGovernment,
    isPublic,
    setUserRole,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    resetData,
  } = useApp()

  const { isDark, toggleTheme } = useTheme()

  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const notifRef = useRef<HTMLDivElement>(null)

  // Close notification panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notifOpen])

  // Close notification panel on route change
  useEffect(() => {
    setNotifOpen(false)
    setSidebarOpen(false)
  }, [location.pathname])

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
      to: '/projects',
      icon: FolderOpen,
      label: isGovernment ? 'Public Works Projects' : 'Explore Projects',
    },
    {
      to: '/map',
      icon: Map,
      label: 'Chennai Infrastructure Map',
    },
    {
      to: '/conflicts',
      icon: AlertTriangle,
      label: isGovernment ? 'Conflict Detection' : 'Coordination Viewer',
    },
    {
      to: '/ledger',
      icon: BookOpen,
      label: isGovernment ? 'Accountability Ledger' : 'Public Accountability Ledger',
    },
    {
      to: '/feedback',
      icon: MessageSquare,
      label: isGovernment ? 'Citizen Feedback & Issues' : 'Public Feedback & Issues',
    },
    { to: '/reports', icon: BarChart3, label: 'Reports & Analytics' },
  ]

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return }
    resetData()
    setResetConfirm(false)
    navigate('/dashboard')
  }

  const activeConflicts = state.conflicts.filter(c => !c.resolved).length

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--cs-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 text-white transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--cs-sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-blue-400 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-none">CitySync</div>
            <div className="text-blue-300 text-xs mt-0.5">Chennai Infrastructure Portal</div>
          </div>
          <button
            className="ml-auto lg:hidden text-blue-300 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perspective Status Indicator in Sidebar */}
        <div className="mx-4 mt-3 px-3 py-2.5 rounded-lg border text-xs transition-colors bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-200 uppercase tracking-wider font-semibold">Active Perspective</span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                isGovernment
                  ? 'bg-blue-400/20 text-blue-200 border border-blue-400/30'
                  : 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
              )}
            >
              {isGovernment ? 'Government' : 'Public'}
            </span>
          </div>
          <p className="text-[11px] text-gray-300 mt-1">
            {isGovernment
              ? 'Full management, conflict resolution & project editing privileges.'
              : 'Read-only municipal transparency, feedback & issue reporting.'}
          </p>
        </div>

        {/* Demo badge */}
        <div className="mx-4 mt-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-medium">
            <Zap className="w-3 h-3" />
            Demo Environment
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Conflict badge */}
        {activeConflicts > 0 && (
          <div className="mx-4 mb-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2 text-orange-300 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {activeConflicts} Active Conflict{activeConflicts !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Reset data */}
        <div className="px-4 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={handleReset}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95',
              resetConfirm
                ? 'bg-red-500/30 text-red-200 border border-red-500/40'
                : 'text-blue-300 hover:bg-white/10 hover:text-white'
            )}
          >
            <RefreshCw className="w-3 h-3" />
            {resetConfirm ? 'Click again to confirm reset' : 'Reset Demo Data'}
          </button>
          {resetConfirm && (
            <button
              onClick={() => setResetConfirm(false)}
              className="w-full text-xs text-blue-400 hover:text-blue-200 mt-1 text-center transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex-shrink-0 border-b px-4 lg:px-6 py-2.5 flex items-center gap-3 transition-colors"
          style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
        >
          <button
            className="lg:hidden transition-colors"
            style={{ color: 'var(--cs-muted)' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Perspective Switcher in Top Bar */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium hidden sm:inline"
              style={{ color: 'var(--cs-muted)' }}
            >
              Perspective:
            </span>
            <div
              className="inline-flex p-1 rounded-xl border shadow-inner"
              style={{ backgroundColor: 'var(--cs-elevated)', borderColor: 'var(--cs-border)' }}
            >
              <button
                type="button"
                onClick={() => setUserRole('government')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                  isGovernment
                    ? 'bg-[#1e3a5f] text-white shadow-sm'
                    : 'hover:text-gray-900 dark:hover:text-gray-100'
                )}
                style={!isGovernment ? { color: 'var(--cs-muted)' } : undefined}
                title="Switch to Municipal Government perspective"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Government</span>
              </button>
              <button
                type="button"
                onClick={() => setUserRole('public')}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                  isPublic
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'hover:text-gray-900 dark:hover:text-gray-100'
                )}
                style={!isPublic ? { color: 'var(--cs-muted)' } : undefined}
                title="Switch to Citizen / Public Resident perspective"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>
            </div>
            <span
              className="text-[11px] hidden md:inline italic"
              style={{ color: 'var(--cs-muted)' }}
            >
              ({isGovernment ? 'Admin Actions Active' : 'Resident View'})
            </span>
          </div>

          <div className="flex-1" />

          {/* Conflict indicator */}
          {activeConflicts > 0 && (
            <NavLink
              to="/conflicts"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-full text-orange-700 dark:text-orange-300 text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {activeConflicts} conflict{activeConflicts !== 1 ? 's' : ''}
              <ChevronRight className="w-3 h-3" />
            </NavLink>
          )}

          {/* ── Dark / Light theme toggle ── */}
          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: isDark ? 'rgba(56,189,248,0.1)' : 'transparent',
              color: isDark ? '#38bdf8' : '#6b7280'
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun className="w-5 h-5" />
              : <Moon className="w-5 h-5" />
            }
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ color: 'var(--cs-muted)' }}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-notif-entrance">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-96 rounded-xl shadow-xl border z-50 overflow-hidden animate-slide-down"
                style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--cs-border)' }}
                >
                  <span className="font-semibold text-sm" style={{ color: 'var(--cs-text)' }}>
                    Notifications
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="transition-colors"
                      style={{ color: 'var(--cs-muted)' }}
                      aria-label="Close notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y" style={{ borderColor: 'var(--cs-border)' }}>
                  {state.notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--cs-muted)' }}>
                      No notifications
                    </div>
                  ) : (
                    state.notifications.slice(0, 15).map((n, idx) => (
                      <div
                        key={n.id}
                        className="px-4 py-3 flex gap-3 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: !n.read ? 'rgba(59,130,246,0.05)' : 'transparent',
                          animationDelay: `${idx * 20}ms`,
                        }}
                        onClick={() => {
                          markNotificationRead(n.id)
                          if (n.projectId) {
                            navigate(`/projects/${n.projectId}`)
                            setNotifOpen(false)
                          }
                        }}
                      >
                        <div
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0',
                            !n.read ? 'bg-blue-500' : 'bg-transparent'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            'text-xs leading-relaxed',
                            NOTIF_TYPE_COLORS[n.type] ?? 'text-gray-400',
                            !n.read && 'font-medium'
                          )}>
                            {n.message}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--cs-muted)' }}>
                            {formatDateTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{ backgroundColor: 'var(--cs-bg)' }}
        >
          <div key={location.pathname} className="page-enter h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

