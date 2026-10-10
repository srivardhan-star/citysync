import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetail from './pages/ProjectDetail'
import ConflictDetection from './pages/ConflictDetection'
import PublicFeedback from './pages/PublicFeedback'
import Reports from './pages/Reports'
import ChennaiMap from './pages/ChennaiMap'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/map" element={<ChennaiMap />} />
        <Route path="/conflicts" element={<ConflictDetection />} />
        <Route path="/feedback" element={<PublicFeedback />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
