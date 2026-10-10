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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NavLink } from 'react-router-dom'
import {
  Map, Filter, AlertTriangle, CheckCircle2, Clock,
  Flame, ChevronRight, Building2, Calendar, MapPin,
  List, X, Info
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate, STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../utils'
import clsx from 'clsx'
import type { Project, ProjectCategory, ProjectStatus } from '../types'

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

function createColoredIcon(color: string, emoji: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px; height:36px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
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
  const [showList, setShowList] = useState(false)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

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
      return hasCoords && statusOk && categoryOk && deptOk
    })
  }, [state.projects, statusFilter, categoryFilter, departmentFilter])

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
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chennai Infrastructure Map</h1>
              <p className="text-sm text-gray-500">
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
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <List className="w-4 h-4" />
              {showList ? 'Hide' : 'Show'} List
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Demo disclaimer */}
        <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Demo mode</strong> — project records and civic issues are simulated, not verified live reports.
            Coordinates are approximate and do not represent official GCC or CMDA project locations.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status legend */}
        <div className="mt-2 flex flex-wrap gap-3">
          {(Object.entries(STATUS_MARKER_COLORS) as [ProjectStatus, string][]).map(([status, color]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all',
                statusFilter === status
                  ? 'font-semibold shadow-sm'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300'
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
          <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">
                {mappableProjects.length} project{mappableProjects.length !== 1 ? 's' : ''} on map
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Click to focus on the map</p>
            </div>
            <div className="divide-y divide-gray-50">
              {mappableProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleListClick(project)}
                  className={clsx(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                    activeProjectId === project.id && 'bg-teal-50 border-l-4 border-teal-500'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">{CATEGORY_ICONS[project.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
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
              ))}

              {noCoordProjects.length > 0 && (
                <div className="px-4 py-3 bg-gray-50">
                  <p className="text-xs text-gray-500 font-medium">
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10 pointer-events-none">
              <div className="text-center max-w-xs">
                <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No projects match the current filters</p>
                <p className="text-gray-400 text-sm mt-1">Try clearing a filter to see more projects</p>
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

            {mappableProjects.map((project) => (
              <Marker
                key={project.id}
                position={[project.lat!, project.lng!]}
                icon={createColoredIcon(
                  STATUS_MARKER_COLORS[project.status],
                  CATEGORY_ICONS[project.category]
                )}
                eventHandlers={{
                  click: () => setActiveProjectId(project.id),
                }}
              >
                <Popup minWidth={280} maxWidth={320}>
                  <div className="font-sans">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2">
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
                    </div>

                    {/* Title */}
                    <p className="font-bold text-gray-900 text-sm leading-snug mb-2">
                      {project.title}
                    </p>

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
                            <span className="ml-1 text-orange-600">(revised)</span>
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

                    {/* Link */}
                    <NavLink
                      to={`/projects/${project.id}`}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                    >
                      View project details
                      <ChevronRight className="w-3 h-3" />
                    </NavLink>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Category legend bar at the bottom */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
          {(Object.entries(CATEGORY_ICONS) as [ProjectCategory, string][]).map(([cat, icon]) => (
            <span key={cat} className="flex items-center gap-1">
              <span>{icon}</span>
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
