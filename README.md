# 🏙️ CitySync — Chennai Infrastructure Transparency Portal

> **Hackathon MVP Deliverable** — A full-stack CivicTech web application for Chennai, built to eliminate uncoordinated road excavations, provide complete public visibility into city infrastructure works, detect and resolve scheduling conflicts, and bridge government administration with citizen accountability.

> ⚠️ **Demo Mode** — All project records, civic issues, contractor names, contact details, and map coordinates in this application are **simulated for demonstration purposes only**. These are not verified live reports from the Greater Chennai Corporation (GCC), CMDA, TANGEDCO, or any official government body.

---

## 🌟 Product Name

| Before | After |
|--------|-------|
| CivicTrack | **CitySync** |
| Generic city | **Chennai, Tamil Nadu** |
| Generic locations | **Anna Nagar, T. Nagar, Adyar, Velachery, Guindy, Tambaram, Mylapore, Perungudi, Pallavaram, Nungambakkam, Egmore** |

---

## 🌟 Problem Statement

Urban areas like Chennai frequently suffer from poorly coordinated municipal works:
* Roads excavated by the Water Department are resurfaced, only to be dug up weeks later by TANGEDCO.
* Residents face unannounced lane closures near Velachery, Adyar, and Tambaram with no posted timelines, delay explanations, or detour guidance.
* Departments operate in silos with no shared spatial or temporal scheduling awareness.
* Citizens lack structured accountability channels to evaluate whether completed projects met delivery commitments or to report on-ground hazards.

**CitySync** directly resolves this through a unified municipal project register, real-time spatial conflict detection, transparent weighted priority scoring, a resident-facing accountability portal, and **two synchronized operational perspectives: Government and Public**.

---

## 🏛️ Dual Perspectives: Government vs. Public

CitySync features a prominent **Perspective Switcher** in the top navigation bar. Both perspectives share one data store.

### 🏛️ Government Perspective
- Full project CRUD (create, edit, delete)
- Interactive milestone completion tracking
- Formal delay recording with audit trail
- Conflict resolution execution
- Citizen issue management (review, respond, resolve)
- Admin analytics and CSV export

### 👥 Public Perspective
- Browse and search Chennai infrastructure projects
- View project details, delay explanations, alternative routes
- Rate completed works (1–5 stars)
- **Report civic issues** on active projects
- Track resolution status of submitted reports

> **Security Note**: Role restrictions are client-side simulation for this hackathon MVP. In production, all permissions must be enforced server-side with proper authentication.

---

## 🗺️ Chennai Infrastructure Map (New)

- Interactive Leaflet map **centered on Chennai, Tamil Nadu**
- **12 project markers** across Chennai neighborhoods with colour-coded status indicators
- **OpenStreetMap tiles** with full attribution (no paid API key required)
- **Distinguishable markers** by project category (road repair 🚧, drainage 💧, pipeline 🔵, electrical ⚡, other 🏗️)
- **Status-coded colours**: Planned (blue), Ongoing (amber), Delayed (red), Completed (green), Emergency (rose)
- **Popups** with title, location, department, deadline, progress bar, alt route, and link to project detail
- **Filters** by status, category, and department
- **List-view toggle** to click projects and fly the map to their marker
- Responsive layout with proper Leaflet CSS, tile attribution, and empty state

---

## 🚀 Key Features

### 1. 📊 Executive Infrastructure Dashboard
- Dynamic city KPIs (total / ongoing / delayed / completed / emergency / conflicting) from shared dataset
- Department workload bar chart and status pie chart (Recharts)
- Attention alert center for emergencies and overdue works
- Upcoming milestone feed

### 2. 🗺️ Chennai Infrastructure Map
- Interactive Leaflet map (see above)

### 3. 🏗️ Public Works Project Management
- Full project lifecycle tracking (planned dates, revised dates, actual completion, contractors, costs)
- Advanced search & filtering (neighborhood, contractor, department, status, category, priority)
- Interactive project creation form with 5-factor priority scoring sliders (Government only)
- Granular milestone tracking and immutable audit trail

### 4. ⚠️ Deterministic Scheduling Conflict Detection Engine
- Spatial & temporal overlap on identical infrastructure segments (`segmentId`) with buffer days
- Incompatible work type detection (e.g., simultaneous trenching + road resurfacing)
- Ranked resolution alternatives (Finish A first / Finish B first / Joint window)
- One-click schedule application with automated audit logging (Government only; Public sees advisory view)

### 5. ⚖️ Explainable Weighted Priority Scoring
$$\text{Priority Score} = \frac{30 \times \text{Safety} + 25 \times \text{EssentialService} + 20 \times \text{Dependency} + 15 \times \text{Urgency} + 10 \times \text{Disruption}}{5}$$
- Critical Safety Override: life-safety emergencies jump to #1 regardless of score
- Transparent factor breakdown table per project

### 6. 👥 Public Transparency & Citizen Accountability
- Citizen project browser with plain-language status legend
- Verified ratings and reviews for completed works
- **Citizen Issue Reporting**: Submit safety hazards, signage problems, and site inactivity reports
- Live resolution status tracking (*Open*, *Under Review*, *Resolved*) with official response notes

### 7. 📈 Reports, Analytics & Data Export
- Completion rates, delay trends, citizen satisfaction
- Planned vs. Actual timeline comparison charts
- CSV export and print-friendly format

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Map | Leaflet + React-Leaflet v4 + OpenStreetMap |
| Date Utilities | Date-fns |
| Persistence | LocalStorage (`citysync_v4`) with auto seed |
| Testing | TSX node runner (17 deterministic tests) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18 or higher
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Tests

```bash
npm test
```

*17 tests, 0 failures:* priority scoring, date overlap, delay calculation, milestone progress, conflict detection, role safeguards.

### Production Build

```bash
npm run build
```

Zero TypeScript errors. Output in `dist/`.

### Deploy to Vercel

1. Push to GitHub: `git push origin main`
2. Import repo at [vercel.com/new](https://vercel.com/new) — auto-detects Vite
3. **Build Command**: `npm run build` | **Output Dir**: `dist`
4. Deploy. The `vercel.json` SPA rewrites are already configured.

---

## 🗺️ Chennai Demo Data

12 simulated projects across Chennai:

| # | Project | Neighborhood | Status | Category |
|---|---------|-------------|--------|----------|
| PRJ-001 | Anna Nagar 2nd Avenue Resurfacing | Anna Nagar | ✅ Completed | Road Repair |
| PRJ-002 | T. Nagar Panagal Park Drainage Upgrade | T. Nagar | ✅ Completed (late) | Drainage |
| PRJ-003 | Adyar Water Main Replacement | Adyar | 🔄 Ongoing | Water Pipeline |
| PRJ-004 | Velachery Main Road Pothole Repair | Velachery | ⏰ Delayed | Road Repair |
| PRJ-005 | EMERGENCY: Guindy Water Main Burst | Guindy | 🚨 Emergency | Water Pipeline |
| PRJ-006 | Tambaram Sanatorium Road Reconstruction | Tambaram | 📋 Planned | Road Repair |
| PRJ-007 | Tambaram Sanatorium Road Cable Laying | Tambaram | 📋 Planned (conflicts PRJ-006) | Electrical |
| PRJ-008 | Mylapore Mada Streets Footpath Work | Mylapore | 🔄 Ongoing (revised deadline) | Other |
| PRJ-009 | Perungudi Sewer Line Extension | Perungudi | ✅ Completed | Drainage |
| PRJ-010 | Nungambakkam Substation Upgrade | Nungambakkam | 📋 Planned | Electrical |
| PRJ-011 | Egmore Museum Road Beautification | Egmore | 📋 Planned | Other |
| PRJ-012 | Pallavaram Junction Signal Upgrade | Pallavaram | 🔄 Ongoing | Electrical |

PRJ-006 and PRJ-007 share the same `segmentId` (`SEG-TB-001`) with overlapping dates, **demonstrating conflict detection**.

---

## 🧪 Automated Test Results (17/17 passing)

```
1. Priority Score Algorithm:
  ✓ Max ratings (all 5) yield score 100
  ✓ Min ratings (all 0) yield score 0
  ✓ Weighted formula (4,3,2,4,4) yields exactly 67

2. Date Overlap Engine:
  ✓ Separated dates do not overlap
  ✓ Direct date overlap correctly detected
  ✓ Buffer days correctly trigger overlap warning

3. Delay Calculation Engine:
  ✓ Early completed project is not marked delayed
  ✓ Completed project with actual > planned has exact delay days
  ✓ Unfinished project before deadline is not delayed

4. Milestone Progress Engine:
  ✓ 2/4 milestones yields exactly 50%

5. Conflict Detection & Recommendation Engine:
  ✓ Deterministic conflict engine detects conflicts in seed data
  ✓ Generates ranked resolution alternatives
  ✓ At least one viable scheduling adjustment alternative proposed

6. Dual Perspective & Citizen Issue Reporting:
  ✓ Initial state defaults to Government perspective
  ✓ setUserRole successfully switches to Public perspective
  ✓ Citizens can successfully submit issue reports
  ✓ Government can review, resolve, and respond to citizen issues
```

---

## 🎬 3-Minute Demo Script

1. **Brand & Map** — Show the CitySync logo and navigate to **Chennai Infrastructure Map**. Demonstrate filter controls and click a project to fly to its marker.
2. **Dashboard** — Return to the dashboard and show live KPIs from the shared dataset.
3. **Conflict Detection** — Show the detected conflict between Tambaram Sanatorium Road projects. Switch to Government mode. Click **Apply Resolution**.
4. **Public Perspective** — Switch to Public. Note hidden admin buttons, read-only milestones, and advisory conflict view.
5. **Citizen Reporting** — In Public mode, report a safety issue on any active project. Switch to Government — it appears immediately in the triage queue. Resolve it with an official response.
6. **Reports** — Show the Planned vs. Actual chart and export as CSV.

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the four-person Git workflow, branch strategy, and shared file coordination rules.

---

## ⚖️ Disclaimers

- **Simulated Demo Environment**: All contractors, contacts, project names, and coordinates are entirely fictional.
- **Prototype Algorithm**: Priority scoring weights are prototype heuristics, not statutory standards.
- **Demo Authentication**: The Government/Public toggle simulates role switching using LocalStorage. Not production-secure.
- **Not Official Data**: CitySync is not affiliated with the Greater Chennai Corporation, CMDA, TANGEDCO, or Tamil Nadu government.
