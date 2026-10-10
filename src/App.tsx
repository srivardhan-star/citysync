import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetail from './pages/ProjectDetail'
import ConflictDetection from './pages/ConflictDetection'
import PublicFeedback from './pages/PublicFeedback'
import Reports from './pages/Reports'
import ChennaiMap from './pages/ChennaiMap'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RequireGovAuth from './components/RequireGovAuth'

export default function App() {
  return (
    <Routes>
      {/* ── Public Landing Page (Default Entry Point) ── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Dedicated Government Login ── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Protected Government Route Direct Access ── */}
      <Route
        path="/government/*"
        element={
          <RequireGovAuth>
            <Navigate to="/dashboard" replace />
          </RequireGovAuth>
        }
      />
      <Route
        path="/government"
        element={
          <RequireGovAuth>
            <Navigate to="/dashboard" replace />
          </RequireGovAuth>
        }
      />

      {/* ── Application Portal Routes with Layout ── */}
      <Route element={<Layout />}>
        {/* Public or Government Dashboard (role-based) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/map" element={<ChennaiMap />} />
        <Route path="/conflicts" element={<ConflictDetection />} />
        <Route path="/feedback" element={<PublicFeedback />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* Fallback to Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
