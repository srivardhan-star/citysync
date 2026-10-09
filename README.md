<<<<<<< HEAD
# 🏛️ CivicTrack — Infrastructure Project Transparency & Coordination Platform

> **Hackathon MVP Deliverable** — A full-stack civic technology web application built to eliminate uncoordinated road excavations, provide complete public visibility into city works, and deterministically detect and resolve municipal scheduling conflicts.

---

## 🌟 Overview & Problem Statement

Urban areas frequently suffer from poorly coordinated municipal works:
* Roads excavated by the Water Department are resurfaced, only to be dug up weeks later by the Electrical Board.
* Residents face unannounced lane closures with no posted timelines, delay explanations, or detour guidance.
* Departments operate in silos with no shared spatial or temporal scheduling awareness.
* Citizens lack structured accountability channels to evaluate whether completed projects met delivery commitments.

**CivicTrack** directly resolves this through a unified municipal project register, real-time spatial conflict detection, transparent weighted priority scoring, and a resident-facing accountability portal.

---

## 🚀 Key Features

### 1. 📊 Executive Infrastructure Dashboard
* **Dynamic City KPIs**: Real-time counts of total, ongoing, delayed, completed, emergency, and conflicting projects computed from a shared dataset.
* **Interactive Analytics**: Department workload distribution and project status breakdown with Recharts visualisations.
* **Attention Alert Center**: Immediate triage list of active emergencies and overdue works.
* **Upcoming Milestones Feed**: Imminent delivery commitments across all city works.

### 2. 🏗️ Public Works Project Management
* **Comprehensive Project Lifecycle**: Tracks original planned dates, revised dates, actual completion dates, segment IDs, contractors, and costs.
* **Advanced Search & Filtering**: Multi-parameter search across neighborhoods, contractors, departments, statuses, categories, and priority ratings.
* **Interactive Project Creation**: Form with validation, input sliders for 5-factor priority calculation, and buffer day configuration.
* **Granular Milestone & Audit Trail**: Milestone completion updates project progress and logs chronological entries to the activity history.

### 3. ⚠️ Deterministic Scheduling Conflict Detection Engine
* **Spatial & Temporal Overlap Logic**: Pinpoints concurrent or overlapping works on identical infrastructure segments (`segmentId`), accounting for configurable post-construction buffer days.
* **Incompatible Work Type Detection**: Flags high-risk simultaneous operations (e.g., Road Resurfacing + Trenching).
* **Ranked Resolution Alternatives**: Deterministically computes sequencing solutions (Finish A first vs. Finish B first vs. Coordinated work), showing added delay days and trade-offs.
* **One-Click Schedule Application**: Directly updates project dates, recalculates citywide conflicts, and logs administrative audit events.

### 4. ⚖️ Explainable Weighted Priority Scoring
* **Transparent Multi-Factor Model (0–100 score)**:
  $$\text{Priority Score} = \frac{30 \times \text{Safety} + 25 \times \text{EssentialService} + 20 \times \text{Dependency} + 15 \times \text{Urgency} + 10 \times \text{Disruption}}{5}$$
* **Critical Safety Override**: Automatically elevates life-safety emergencies (e.g., burst mains) to #1 priority, bypassing standard weights.
* **Explainable Municipal Rankings**: Breakdown table showing all five rated factors (0–5 scale) for each project.

### 5. 👥 Public Transparency & Citizen Accountability
* **Plain-Language Citizen Browser**: Filterable public view explaining why work is happening and providing alternative routes / detour instructions.
* **Plain-Language Status Legend**: Explains municipal statuses (*Planned*, *Ongoing*, *Delayed*, *Completed*, *Emergency*).
* **Citizen Feedback & Review Engine**: Verified ratings (1–5 stars) and qualitative feedback on completed infrastructure works.
* **Contractor Performance Scorecard**: On-time delivery rate vs. late delivery rate, average delay duration, and resident satisfaction index.

### 6. 📈 Reports, Analytics & Data Export
* **Metric Summaries**: Detailed metrics on completion rates, delay trends, and public satisfaction.
* **Planned vs. Actual Timeline Comparison**: Graphical variance analysis between committed dates and actual completion.
* **CSV Export**: One-click download of city project records.
* **Print-Friendly Format**: Clean styling for municipal report generation.

---

## 🛠️ Technology Stack

* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Charts**: Recharts
* **Date Utilities**: Date-fns
* **Persistence**: LocalStorage with automatic seed data initialization and state reset functionality
* **Testing**: Node / TSX automated test runner for algorithmic logic

---

## ⚡ Quick Start & Run Commands

### 1. Prerequisites
Ensure [Node.js](https://nodejs.org/) (v18 or higher) and `npm` are installed.

### 2. Installation
Navigate to the project root and install dependencies:
```bash
npm install
```

### 3. Start Development Server
Run the local Vite dev server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Automated Algorithmic Tests
Execute the unit test suite verifying delay calculations, priority scoring, date overlap logic, and conflict resolution generation:
```bash
npm test
```

### 5. Build for Production
Generate the production-ready distribution bundle:
```bash
npm run build
```

---

## 🧪 Critical Flows Tested

1. **Deterministic Priority Scoring**: Verified boundary cases (0/5 yields 0, 5/5 yields 100, and weighted combinations match the exact formula).
2. **Date Overlap & Buffer Calculations**: Verified that non-overlapping works are not falsely flagged, while buffer day extensions correctly catch rapid re-excavation risks.
3. **Delay Engine Rules**:
   * Projects before planned deadlines are never marked delayed.
   * Completed projects compute delay strictly as `actualEndDate - plannedEndDate`.
   * Unfinished overdue projects compute delay relative to `plannedEndDate`.
4. **Conflict Resolution Application**: Verified that selecting a resolution (e.g., delaying Project B after Project A) updates the store, triggers audit logging, creates in-app notifications, and clears the conflict state.
5. **State Persistence & Re-seed**: Verified that browser refreshes preserve created projects and submitted reviews, and clicking "Reset Demo Data" properly re-seeds the initial dataset with confirmation.

---

## 🚢 Deployment Instructions (Vercel & Netlify)

### Deploying to Vercel
1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/), click **New Project** and import the repository.
3. Build Settings:
   * **Framework Preset**: Vite
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`
4. Click **Deploy**.

### Deploying to Netlify
1. In the [Netlify Dashboard](https://www.netlify.com/), click **Add new site** > **Import an existing project**.
2. Connect your Git repository.
3. Build Settings:
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist`
4. For single-page app routing, ensure a `_redirects` file or `netlify.toml` with `/* /index.html 200` is present.

---

## ⚖️ Demo Disclaimers & Assumptions

* **Simulated Environment**: All contractors, phone numbers, email addresses, and project names are strictly fictional and intended for demonstration purposes.
* **Prototype Algorithm**: The priority scoring weights (Safety 30%, Essential 25%, Dependency 20%, Urgency 15%, Disruption 10%) are prototype heuristics designed for hackathon evaluation and do not represent statutory municipal standards.
* **Human-in-the-Loop Coordination**: Conflict resolutions generated by CivicTrack are advisory recommendations requiring confirmation by municipal coordinators before real-world scheduling shifts.
=======
# citysync
to solve the issues public face while government is working on projects
>>>>>>> eb74ed40fc4dced4f2d3a8b7d5cd26496b9d004a
