// ============================================================
// CitySync — Chennai Infrastructure Map Page
// ============================================================
// Uses Leaflet + React-Leaflet v4 with OpenStreetMap tiles.
// Displays project markers with category/status colour coding,
// filter controls, and project-detail popups.
// ⚠️ DEMO MODE: All project locations are simulated, not verified
// live GCC or CMDA records.
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NavLink } from 'react-router-dom'
import {
  Map as MapIcon, Filter, AlertTriangle, CheckCircle2, Clock,
  Flame, ChevronRight, Building2, Calendar, MapPin,
  List, X, Info, Shield, Layers, ExternalLink
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate, STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, calculateConflictPriority } from '../utils'
import clsx from 'clsx'
import type { Project, ProjectCategory, ProjectStatus, Conflict, ConflictPriorityAssessment } from '../types'

// ─── Fix Leaflet default marker icon paths broken by Vite bundling ───────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Marker colour palette ────────────────────────────────────────────────────
const STATUS_MARKER_COLORS: Record<ProjectStatus, string> = {
  planned: '#3b82f6',     // blue
  ongoing: '#f59e0b',     // amber
  delayed: '#ef4444',     // red
  completed: '#22c55e',   // green
  emergency: '#e11d48',   // rose
}

const CATEGORY_ICONS: Record<ProjectCategory, string> = {
  road_repair: '🚧',
  drainage: '💧',
  water_pipeline: '🔵',
  electrical: '⚡',
  other: '🏗️',
}

// ─── Accessible Conflict-Aware Pin Generator ──────────────────────────────────
function createProjectMarkerIcon(
  color: string,
  emoji: string,
  isConflict: boolean,
  isDelayed: boolean
) {
  if (isConflict) {
    // Accessible indicator: High-contrast dashed boundary + warning badge with ⚠️
    return L.divIcon({
      className: 'conflict-map-marker',
      html: `
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
          <div style="
            position:absolute; inset:-4px;
            border:3px dashed #ea580c;
            border-radius:50%;
            background:rgba(234, 88, 12, 0.22);
          "></div>
          <div style="
            width:36px; height:36px;
            background:${color};
            border:3px solid #ea580c;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 3px 10px rgba(234,88,12,0.6);
            display:flex; align-items:center; justify-content:center;
          ">
            <span style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</span>
          </div>
          <div style="
            position:absolute; top:-5px; right:-5px;
            width:20px; height:20px;
            background:#ea580c;
            color:#ffffff;
            border:2px solid #ffffff;
            border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:11px; font-weight:bold;
            box-shadow:0 2px 4px rgba(0,0,0,0.35);
          " title="Active Scheduling Conflict">⚠️</div>
        </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 40],
      popupAnchor: [0, -42],
    })
  }

  const border = isDelayed ? '3px solid #ef4444' : '3px solid white'
  const shadow = isDelayed ? '0 2px 8px rgba(239,68,68,0.5)' : '0 2px 8px rgba(0,0,0,0.35)'

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px; height:36px;
        background:${color};
        border:${border};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:${shadow};
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
}

// ─── Dig-Once Policy Helper (recently resurfaced road within 90 days) ───────────
function getDigOnceWarning(
  project: Project,
  allProjects: Project[],
  thresholdDays = 90
): { isDigOnceRisk: boolean; resurfacedProject?: Project; daysSinceResurfacing?: number } {
  if (project.status === 'completed') return { isDigOnceRisk: false }
  const excavationCategories = ['water_pipeline', 'drainage', 'electrical', 'road_repair']
  if (!excavationCategories.includes(project.category)) return { isDigOnceRisk: false }

  const now = new Date()
  for (const other of allProjects) {
    if (other.id === project.id) continue
    if (other.segmentId !== project.segmentId) continue
    if (other.category !== 'road_repair') continue
    if (other.status !== 'completed') continue
    const compDate = other.actualEndDate || other.revisedEndDate || other.plannedEndDate
    if (!compDate) continue
    const d = new Date(compDate)
    const diffDays = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays <= thresholdDays) {
      return { isDigOnceRisk: true, resurfacedProject: other, daysSinceResurfacing: diffDays }
    }
  }
  return { isDigOnceRisk: false }
}

// ─── Flyto helper — imperative map control ────────────────────────────────────
function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 1 })
    }
  }, [target, map])
  return null
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChennaiMap() {
  const { state } = useApp()

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [onlyConflicts, setOnlyConflicts] = useState(false)
  const [showList, setShowList] = useState(false)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  // Active conflicts (excluding resolved)
  const activeConflicts = useMemo(() => {
    return (state.conflicts || []).filter((c) => !c.resolved)
  }, [state.conflicts])

  // Map each project ID to its active conflicts
  const projectActiveConflicts = useMemo(() => {
    const map = new Map<string, Conflict[]>()
    for (const conflict of activeConflicts) {
      for (const pId of conflict.projectIds) {
        const list = map.get(pId) || []
        list.push(conflict)
        map.set(pId, list)
      }
    }
    return map
  }, [activeConflicts])

  // Conflict connecting corridors between projects with coordinates
  const conflictLines = useMemo(() => {
    const lines: {
      conflictId: string
      positions: [[number, number], [number, number]]
      projectA: Project
      projectB: Project
      segmentId: string
      reason: string
    }[] = []

    for (const c of activeConflicts) {
      if (c.projectIds.length < 2) continue
      const pA = state.projects.find((p) => p.id === c.projectIds[0])
      const pB = state.projects.find((p) => p.id === c.projectIds[1])
      if (pA?.lat !== undefined && pA?.lng !== undefined && pB?.lat !== undefined && pB?.lng !== undefined) {
        lines.push({
          conflictId: c.id,
          positions: [[pA.lat, pA.lng], [pB.lat, pB.lng]],
          projectA: pA,
          projectB: pB,
          segmentId: c.segmentId || 'Unknown Segment',
          reason: c.reason,
        })
      }
    }
    return lines
  }, [activeConflicts, state.projects])

  // Collect unique departments
  const departments = useMemo(
    () => Array.from(new Set(state.projects.map((p) => p.department))).sort(),
    [state.projects]
  )

  // Filtered projects with coordinates
  const mappableProjects = useMemo(() => {
    return state.projects.filter((p) => {
      const hasCoords = p.lat !== undefined && p.lng !== undefined
      const statusOk = statusFilter === 'all' || p.status === statusFilter
      const categoryOk = categoryFilter === 'all' || p.category === categoryFilter
      const deptOk = departmentFilter === 'all' || p.department === departmentFilter
      const conflictOk = !onlyConflicts || projectActiveConflicts.has(p.id)
      return hasCoords && statusOk && categoryOk && deptOk && conflictOk
    })
  }, [state.projects, statusFilter, categoryFilter, departmentFilter, onlyConflicts, projectActiveConflicts])

  // Projects without coordinates — show in fallback list
  const noCoordProjects = useMemo(() => {
    return state.projects.filter((p) => p.lat === undefined || p.lng === undefined)
  }, [state.projects])

  function handleListClick(project: Project) {
    if (project.lat !== undefined && project.lng !== undefined) {
      setFlyTarget([project.lat, project.lng])
      setActiveProjectId(project.id)
      setShowList(false)
    }
  }

  function clearFilters() {
    setStatusFilter('all')
    setCategoryFilter('all')
    setDepartmentFilter('all')
    setActiveProjectId(null)
  }

  const activeFiltersCount = [
    statusFilter !== 'all',
    categoryFilter !== 'all',
    departmentFilter !== 'all',
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chennai Infrastructure Map</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mappableProjects.length} project{mappableProjects.length !== 1 ? 's' : ''} shown · Centered on Chennai, Tamil Nadu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowList(!showList)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                showList
                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-750 text-teal-700 dark:text-teal-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <List className="w-4 h-4" />
              {showList ? 'Hide' : 'Show'} List
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Demo disclaimer */}
        <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Demo mode</strong> — project records and civic issues are simulated, not verified live reports.
            Coordinates are approximate and do not represent official GCC or CMDA project locations.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="text-sm border border-gray-200 dark:border-gray-750 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ProjectCategory | 'all')}
            className="text-sm border border-gray-200 dark:border-gray-750 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Categories</option>
            {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          {/* Department filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-750 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Conflict filter toggle */}
          <button
            onClick={() => setOnlyConflicts(!onlyConflicts)}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all',
              onlyConflicts
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-100'
            )}
          >
            <AlertTriangle className={clsx('w-3.5 h-3.5', onlyConflicts ? 'text-white' : 'text-orange-600 dark:text-orange-400')} />
            <span>
              {onlyConflicts ? 'Showing Conflicts Only' : `Filter by Conflicts (${activeConflicts.length})`}
            </span>
          </button>
        </div>

        {/* Accessible Marker & Status Legend */}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
          {/* Conflict warning legend */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200 font-semibold">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-orange-600 flex items-center justify-center text-[9px] font-bold">
              ⚠️
            </span>
            <span>Conflict Alert (Dashed Orange Ring)</span>
          </div>

          {/* Standard Statuses */}
          {(Object.entries(STATUS_MARKER_COLORS) as [ProjectStatus, string][]).map(([status, color]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all',
                statusFilter === status
                  ? 'font-semibold shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
              style={statusFilter === status ? { borderColor: color, backgroundColor: color + '20', color } : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Map + optional list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Project list panel */}
        {showList && (
          <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {mappableProjects.length} project{mappableProjects.length !== 1 ? 's' : ''} on map
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click to focus on the map</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {mappableProjects.map((project) => {
                const conflicts = projectActiveConflicts.get(project.id) || []
                const hasConflict = conflicts.length > 0
                return (
                  <button
                    key={project.id}
                    onClick={() => handleListClick(project)}
                    className={clsx(
                      'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors',
                      activeProjectId === project.id && 'bg-teal-50 dark:bg-teal-950/40 border-l-4 border-teal-500'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{CATEGORY_ICONS[project.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{project.title}</p>
                          {hasConflict && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold border border-orange-300 dark:border-orange-700" title="Scheduling Conflict">
                              ⚠️ Conflict
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.neighborhood}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[project.status])}
                          >
                            {STATUS_LABELS[project.status]}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    </div>
                  </button>
                )
              })}

              {noCoordProjects.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {noCoordProjects.length} project{noCoordProjects.length !== 1 ? 's' : ''} not shown (no coordinates)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          {mappableProjects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 pointer-events-none">
              <div className="text-center max-w-xs">
                <MapIcon className="w-12 h-12 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No projects match the current filters</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try clearing a filter to see more projects</p>
              </div>
            </div>
          )}

          <MapContainer
            center={[13.0827, 80.2707]}
            zoom={11}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapFlyTo target={flyTarget} />

            {/* Connecting conflict corridors between project coordinates */}
            {conflictLines.map((line) => (
              <Polyline
                key={line.conflictId}
                positions={line.positions}
                pathOptions={{
                  color: '#ea580c',
                  weight: 3.5,
                  dashArray: '6, 8',
                  opacity: 0.85,
                }}
              >
                <Popup minWidth={260} maxWidth={300}>
                  <div className="font-sans text-xs space-y-1.5 p-1">
                    <div className="flex items-center gap-1.5 font-bold text-orange-700">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span>Scheduling Conflict Corridor</span>
                    </div>
                    <p className="text-gray-700 leading-snug">
                      Potential excavation overlap on shared segment <strong className="font-mono">{line.segmentId}</strong>.
                    </p>
                    <div className="bg-orange-50 p-2 rounded border border-orange-200 space-y-1 text-[11px]">
                      <div><strong>Project 1:</strong> {line.projectA.title} ({line.projectA.department})</div>
                      <div><strong>Project 2:</strong> {line.projectB.title} ({line.projectB.department})</div>
                    </div>
                    <div className="text-[10px] text-gray-400 italic">
                      Approximate project-level indicator; does not represent exact trench boundaries.
                    </div>
                    <NavLink
                      to="/conflicts"
                      className="block text-orange-700 hover:text-orange-900 font-semibold underline pt-1"
                    >
                      Resolve in Conflict Coordinator →
                    </NavLink>
                  </div>
                </Popup>
              </Polyline>
            ))}

            {mappableProjects.map((project) => {
              const conflicts = projectActiveConflicts.get(project.id) || []
              const hasConflict = conflicts.length > 0
              const isDelayed = project.status === 'delayed'
              const digOnce = getDigOnceWarning(project, state.projects)

              // Conflicting projects list
              const conflictingOtherProjects = conflicts.flatMap((c) =>
                c.projectIds
                  .filter((id) => id !== project.id)
                  .map((id) => state.projects.find((p) => p.id === id))
                  .filter(Boolean) as Project[]
              )

              // Compute the highest coordination priority across this project's active conflicts
              const highestConflictAssessment: ConflictPriorityAssessment | null = conflicts.length > 0
                ? conflicts.reduce((best, c) => {
                    const a = calculateConflictPriority(c, state.projects)
                    if (!best || a.score > best.score) return a
                    return best
                  }, null as ConflictPriorityAssessment | null)
                : null

              return (
                <Marker
                  key={project.id}
                  position={[project.lat!, project.lng!]}
                  icon={createProjectMarkerIcon(
                    STATUS_MARKER_COLORS[project.status],
                    CATEGORY_ICONS[project.category],
                    hasConflict,
                    isDelayed
                  )}
                  eventHandlers={{
                    click: () => setActiveProjectId(project.id),
                  }}
                >
                  <Popup minWidth={290} maxWidth={340}>
                    <div className="font-sans">
                      {/* Status badge row */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-full font-semibold',
                            STATUS_COLORS[project.status]
                          )}
                        >
                          {STATUS_LABELS[project.status]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {CATEGORY_ICONS[project.category]} {CATEGORY_LABELS[project.category]}
                        </span>
                        {hasConflict && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-300">
                            ⚠️ Conflict Alert
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="font-bold text-gray-900 text-sm leading-snug mb-2">
                        {project.title}
                      </p>

                      {/* Conflict Alert Box in Popup */}
                      {hasConflict && (
                        <div className="mb-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-orange-800">
                            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Active Scheduling Conflict Detected</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-orange-900">
                            Road segment <span className="font-mono font-semibold">{project.segmentId}</span> overlaps with:
                          </p>
                          <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-orange-950 font-medium">
                            {conflictingOtherProjects.map((cp) => (
                              <li key={cp.id}>
                                {cp.title} <span className="text-gray-500 font-normal">({cp.department})</span>
                              </li>
                            ))}
                          </ul>
                          {highestConflictAssessment && (
                            <div className="flex items-center justify-between text-[11px] bg-white/90 dark:bg-gray-800/90 p-1.5 rounded border border-orange-200 dark:border-orange-800">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Coordination Urgency:</span>
                              <span
                                className={clsx(
                                  'font-bold px-1.5 py-0.5 rounded font-mono text-[10px]',
                                  highestConflictAssessment.level === 'High'
                                    ? 'bg-rose-100 text-rose-800'
                                    : highestConflictAssessment.level === 'Medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                )}
                              >
                                {highestConflictAssessment.level} ({highestConflictAssessment.score}/100)
                              </span>
                            </div>
                          )}
                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <NavLink
                              to="/conflicts"
                              className="text-orange-700 hover:text-orange-900 font-semibold underline flex items-center gap-0.5"
                            >
                              Simulate & Resolve Schedule →
                            </NavLink>
                          </div>
                        </div>
                      )}

                      {/* Dig-Once Policy Advisory in Popup */}
                      {digOnce.isDigOnceRisk && digOnce.resurfacedProject && (
                        <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                          <div className="flex items-center gap-1 font-semibold text-amber-800">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Dig-Once Policy Advisory</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Road segment was resurfaced {digOnce.daysSinceResurfacing} days ago by {digOnce.resurfacedProject.department}. Repeated excavation requires joint coordination.
                          </p>
                        </div>
                      )}

                      {/* Key info */}
                      <div className="space-y-1 text-xs text-gray-700">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{project.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>
                            Due: {formatDate(project.revisedEndDate ?? project.plannedEndDate)}
                            {project.revisedEndDate && (
                              <span className="ml-1 text-orange-600 font-medium">(revised)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-teal-500 transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Alternative route */}
                      {project.alternativeRoute && (
                        <div className="mt-2 text-xs text-gray-600 bg-blue-50 rounded px-2 py-1.5">
                          <strong>Alt route:</strong> {project.alternativeRoute}
                        </div>
                      )}

                      {/* Links */}
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <NavLink
                          to={`/projects/${project.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                        >
                          View project details
                          <ChevronRight className="w-3 h-3" />
                        </NavLink>
                        {hasConflict && (
                          <NavLink
                            to="/conflicts"
                            className="text-xs font-semibold text-orange-600 hover:text-orange-800"
                          >
                            Conflicts →
                          </NavLink>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      {/* Category legend bar at the bottom */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {(Object.entries(CATEGORY_ICONS) as [ProjectCategory, string][]).map(([cat, icon]) => (
              <span key={cat} className="flex items-center gap-1">
                <span>{icon}</span>
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-orange-500 inline-block" />
              Conflict Corridor
            </span>
            <span>📍 Approximate Project-Level Coordinates</span>
          </div>
        </div>
      </div>
    </div>
  )
}
