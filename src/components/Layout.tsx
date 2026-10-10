import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, AlertTriangle, MessageSquare,
  BarChart3, Bell, RefreshCw, ChevronRight, Zap, X, CheckCheck,
  Menu, Building2, Users, Map, Sun, Moon, BookOpen, LogOut, ArrowLeft
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useTranslation, LanguageSelector } from '../context/LanguageContext'
import { getStoredSession, clearSession } from '../config/authConfig'
import { formatDateTime } from '../utils'
import CitySyncLogo from './CitySyncLogo'
import clsx from 'clsx'

const NOTIF_TYPE_COLORS: Record<string, string> = {
  emergency: 'text-rose-400',
  conflict_detected: 'text-amber-400',
  delay_reported: 'text-yellow-400',
  milestone_complete: 'text-emerald-400',
  conflict_resolved: 'text-purple-300',
  new_project: 'text-purple-400',
  deadline_changed: 'text-pink-400',
  approaching_start: 'text-purple-300',
  general: 'text-slate-400',
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
  const { t } = useTranslation()

  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const notifRef = useRef<HTMLDivElement>(null)

  const session = getStoredSession()

  // Ensure unauthenticated visitors default to public perspective
  useEffect(() => {
    const currentSession = getStoredSession()
    if (!currentSession && userRole === 'government') {
      setUserRole('public')
    }
  }, [userRole, setUserRole])

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

  const handleLogout = () => {
    clearSession()
    setUserRole('public')
    navigate('/')
  }

  const handleSetGovPerspective = () => {
    const activeSession = getStoredSession()
    if (!activeSession || !activeSession.isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    setUserRole('government')
  }

  const handleSetPublicPerspective = () => {
    setUserRole('public')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    {
      to: '/projects',
      icon: FolderOpen,
      label: isGovernment ? t('nav.projects') : t('nav.projectsPublic'),
    },
    {
      to: '/map',
      icon: Map,
      label: t('nav.map'),
    },
    {
      to: '/conflicts',
      icon: AlertTriangle,
      label: isGovernment ? t('nav.conflicts') : t('nav.conflictsPublic'),
    },
    {
      to: '/ledger',
      icon: BookOpen,
      label: isGovernment ? 'Accountability Ledger' : 'Public Accountability Ledger',
    },
    {
      to: '/feedback',
      icon: MessageSquare,
      label: isGovernment ? t('nav.feedback') : t('nav.feedbackPublic'),
    },
    { to: '/reports', icon: BarChart3, label: t('nav.reports') },
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
          className="fixed inset-0 bg-black/60 z-20 lg:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 text-white transition-transform duration-200 border-r border-purple-500/20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--cs-sidebar-bg)' }}
      >
        {/* Logo / Brand Link to Landing */}
        <div
          className="flex items-center justify-between px-4 py-5 border-b border-purple-500/20 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => navigate('/')}
          title="Return to CitySync Landing Page"
        >
          <CitySyncLogo
            size="md"
            showWordmark={true}
            theme="dark"
            subtitle={t('app.portalSub')}
          />
          <button
            className="lg:hidden text-purple-300 hover:text-white transition-colors p-1"
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(false) }}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perspective Status Indicator in Sidebar */}
        <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl border text-xs transition-colors bg-purple-950/20 border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider font-semibold">
              {t('nav.activePerspective')}
            </span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                isGovernment
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-400/40'
              )}
            >
              {isGovernment ? t('nav.perspectiveGov') : t('nav.perspectivePublic')}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1">
            {isGovernment ? t('nav.govActiveNote') : t('nav.publicActiveNote')}
          </p>
        </div>

        {/* Demo badge */}
        <div className="mx-4 mt-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-medium">
            <Zap className="w-3 h-3" />
            {t('app.demoEnv')}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto scrollbar-thin">
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
          <div className="mx-4 mb-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {activeConflicts} {t('nav.activeConflicts')}
            </div>
          </div>
        )}

        {/* Back to Home & Logout button in sidebar */}
        <div className="px-4 pb-2 border-t border-purple-500/20 pt-3 space-y-1.5">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('auth.backToHome')}</span>
          </button>

          {session && isGovernment && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('nav.logout')}</span>
            </button>
          )}

          {/* Reset demo data */}
          <button
            onClick={handleReset}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
              resetConfirm
                ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
                : 'text-purple-300 hover:bg-white/10 hover:text-white'
            )}
          >
            <RefreshCw className="w-3 h-3" />
            {resetConfirm ? t('nav.confirmReset') : t('nav.resetDemoData')}
          </button>
          {resetConfirm && (
            <button
              onClick={() => setResetConfirm(false)}
              className="w-full text-xs text-purple-300 hover:text-purple-100 mt-0.5 text-center transition-colors"
            >
              {t('app.cancel')}
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
            className="lg:hidden transition-colors p-1"
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
              {t('nav.perspective')}:
            </span>
            <div
              className="inline-flex p-1 rounded-xl border shadow-inner"
              style={{ backgroundColor: 'var(--cs-elevated)', borderColor: 'var(--cs-border)' }}
            >
              <button
                type="button"
                onClick={handleSetGovPerspective}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                  isGovernment
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'hover:text-purple-400'
                )}
                style={!isGovernment ? { color: 'var(--cs-muted)' } : undefined}
                title="Switch to Municipal Government perspective (requires login)"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{t('nav.perspectiveGov')}</span>
              </button>
              <button
                type="button"
                onClick={handleSetPublicPerspective}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                  isPublic
                    ? 'bg-[#A855F7] text-white shadow-sm'
                    : 'hover:text-purple-400'
                )}
                style={!isPublic ? { color: 'var(--cs-muted)' } : undefined}
                title="Switch to Citizen / Public Resident perspective"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t('nav.perspectivePublic')}</span>
              </button>
            </div>
            <span
              className="text-[11px] hidden md:inline italic"
              style={{ color: 'var(--cs-muted)' }}
            >
              ({isGovernment ? t('nav.govAdminBadge') : t('nav.publicResidentBadge')})
            </span>
          </div>

          <div className="flex-1" />

          {/* Conflict indicator */}
          {activeConflicts > 0 && (
            <NavLink
              to="/conflicts"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {activeConflicts} {activeConflicts !== 1 ? t('nav.activeConflicts') : t('nav.conflicts')}
              <ChevronRight className="w-3 h-3" />
            </NavLink>
          )}

          {/* ── Multilingual Language Selector ── */}
          <LanguageSelector variant="header" />

          {/* ── Dark / Light theme toggle ── */}
          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg transition-all hover:scale-110 active:scale-95 text-purple-400 hover:text-purple-300"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun className="w-5 h-5 text-amber-400" />
              : <Moon className="w-5 h-5 text-purple-400" />
            }
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-purple-300 hover:text-white"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-notif-entrance">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-slide-down"
                style={{ backgroundColor: 'var(--cs-surface)', borderColor: 'var(--cs-border)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--cs-border)' }}
                >
                  <span className="font-semibold text-sm" style={{ color: 'var(--cs-text)' }}>
                    {t('nav.notifications')}
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        {t('nav.markAllRead')}
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="transition-colors text-slate-400 hover:text-white"
                      aria-label="Close notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y" style={{ borderColor: 'var(--cs-border)' }}>
                  {state.notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--cs-muted)' }}>
                      {t('nav.noNotifications')}
                    </div>
                  ) : (
                    state.notifications.slice(0, 15).map((n, idx) => (
                      <div
                        key={n.id}
                        className="px-4 py-3 flex gap-3 cursor-pointer transition-colors hover:bg-purple-500/10"
                        style={{
                          backgroundColor: !n.read ? 'rgba(124,58,237,0.08)' : 'transparent',
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
                            !n.read ? 'bg-purple-500' : 'bg-transparent'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            'text-xs leading-relaxed',
                            NOTIF_TYPE_COLORS[n.type] ?? 'text-slate-400',
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

          {/* Government Logout Action Button in Header */}
          {session && isGovernment && (
            <button
              id="header-gov-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 active:scale-95 transition-all shadow-sm"
              title={t('nav.logout')}
              aria-label={t('nav.logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('nav.logout')}</span>
            </button>
          )}
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
