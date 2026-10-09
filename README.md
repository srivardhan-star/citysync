# 🏛️ CivicTrack — Infrastructure Project Transparency & Coordination Platform

> **Hackathon MVP Deliverable** — A full-stack civic technology web application built to eliminate uncoordinated road excavations, provide complete public visibility into city works, deterministically detect and resolve municipal scheduling conflicts, and bridge government administration with citizen accountability.

---

## 🌟 Overview & Problem Statement

Urban areas frequently suffer from poorly coordinated municipal works:
* Roads excavated by the Water Department are resurfaced, only to be dug up weeks later by the Electrical Board.
* Residents face unannounced lane closures with no posted timelines, delay explanations, or detour guidance.
* Departments operate in silos with no shared spatial or temporal scheduling awareness.
* Citizens lack structured accountability channels to evaluate whether completed projects met delivery commitments or to report on-ground hazards.

**CivicTrack** directly resolves this through a unified municipal project register, real-time spatial conflict detection, transparent weighted priority scoring, a resident-facing accountability portal, and **two synchronized operational perspectives: Government and Public**.

---

## 🏛️ Dual Perspectives: Government vs. Public Experience

CivicTrack incorporates a prominent, compact **Perspective Switcher** in the top navigation bar. Both perspectives operate on a **single, unified data store** in real-time — eliminating fragmented data silos while maintaining strict role-based operational boundaries.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CivicTrack Navigation                           │
│  [🏛️ CivicTrack]     [ 🏛️ Government | 👥 Public ]     [🔔 3] [Reset Demo]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     🏛️ GOVERNMENT MODE        │             │        👥 PUBLIC MODE         │
├───────────────────────────────┤             ├───────────────────────────────┤
│ • Full Project CRUD & Edits   │             │ • Explore & Filter Projects   │
│ • Interactive Milestones      │             │ • Read-Only Schedules & Dets  │
│ • Record Official Delays      │             │ • View Detours & Explanations │
│ • Apply Conflict Resolutions  │             │ • Rate Completed Works (1-5★) │
│ • Review Citizen Issues       │             │ • Report On-Ground Issues     │
│ • Update Status & Response    │             │ • Track Resolution Status     │
│ • Admin Analytics & CSV Export│             │ • Guarded Against Modifying   │
└───────────────────────────────┘             └───────────────────────────────┘
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       ▼
             [ Shared LocalStorage State (`civictrack_v3`) ]
```

### 1. 🏛️ Government Perspective
Designed for municipal engineers, city coordinators, and department heads:
* **Project Administration**: Full ability to create, update, and manage public works projects (budget, contractors, segment IDs, locations, and priority parameters).
* **Milestone Progression**: Interactive milestone completion checkboxes that automatically compute and update project completion percentage and record audit entries.
* **Delay Justification Engine**: Form to officially submit delay records with mandatory justifications, revised end dates, and public explanations.
* **Conflict Resolution Execution**: One-click execution to apply recommended sequencing plans (e.g., delaying Project B after Project A) directly to the city schedule.
* **Citizen Issue Management Center**: Review citizen-reported grievances, filter by status (*Open*, *Under Review*, *Resolved*), update triage status, and publish official municipal responses.
* **Administrative Analytics**: Department workload distribution, timeline variances, and CSV report export.

### 2. 👥 Public Perspective
Designed for city residents, commuters, and civic watchdogs:
* **Plain-Language Project Discovery**: Search and filter active and upcoming projects across neighborhoods, departments, and categories.
* **Transparency & Disruption Notice**: Understand *why* a road is being dug up, which contractor is responsible, start/end dates, and alternative detour recommendations.
* **Published Delay Explanations**: Read official municipal delay justifications with transparency into revised target dates.
* **Completed Works Accountability**: Rate completed infrastructure projects (1–5 stars) and submit qualitative reviews on workmanship and timeliness.
* **Citizen Issue Reporting**: File localized concerns directly against specific projects (e.g., *Safety Hazard*, *Detour Signage Missing*, *Excessive Dust/Noise*, *Unauthorized Digging*, *Drainage Blockage*).
* **Live Issue Status Tracking**: Follow the real-time status of reported issues (*Open*, *Under Review*, *Resolved*) and read official department response notes.
* **Strict Role Safeguards**: Public users are strictly prevented from creating projects, altering milestone checkboxes, changing schedules, approving delays, or executing conflict resolutions.

---

## 🚀 Core Algorithmic Engines

### 1. ⚠️ Deterministic Scheduling Conflict Detection Engine
* **Spatial & Temporal Overlap Logic**: Flags concurrent works on identical infrastructure segments (`segmentId`), factoring in configurable post-construction buffer days (e.g., preventing asphalt resurfacing right before pipeline laying).
* **Incompatible Work Type Detection**: Detects hazardous simultaneous operations (e.g., simultaneous trenching and road resurfacing).
* **Ranked Resolution Alternatives**: Deterministically computes sequencing solutions (Finish A first vs. Finish B first vs. Joint coordinated window), showing added delay days and trade-offs.
* **One-Click Application**: Government coordinators can apply solutions with immediate automated schedule adjustments and notification broadcasts.

### 2. ⚖️ Explainable Weighted Priority Scoring
* **Transparent Multi-Factor Model (0–100 score)**:
  $$\text{Priority Score} = \frac{30 \times \text{Safety} + 25 \times \text{EssentialService} + 20 \times \text{Dependency} + 15 \times \text{Urgency} + 10 \times \text{Disruption}}{5}$$
* **Critical Safety Override**: Automatically elevates life-safety emergencies (e.g., burst water mains, collapsed culverts) to #1 priority, bypassing standard weights.
* **Explainable Municipal Rankings**: Transparent breakdown table showing all five rated factors (0–5 scale) for each project.

### 3. ⏱️ Delay Calculation Engine
* **Standardized Variance Rules**:
  * Projects before their planned deadline are never falsely marked delayed.
  * Overdue ongoing projects compute delay days relative to `plannedEndDate`.
  * Completed projects compute delay strictly as `actualEndDate - plannedEndDate`.
  * Revised deadlines and reason logs are maintained in an immutable audit trail.

---

## 🛠️ Technology Stack

* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS (CivicTech dark navy/slate palette with clean card surfaces)
* **Icons**: Lucide React
* **Charts**: Recharts (Pie charts, Bar charts, Responsive containers)
* **Date Utilities**: Date-fns
* **Persistence**: LocalStorage with automatic seed data initialization and state reset functionality (`civictrack_v3`)
* **Testing**: Node / TSX automated test runner for algorithmic logic and role-based safeguards

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

### 4. Run Automated Algorithmic & Role Tests
Execute the comprehensive test suite verifying priority scoring, date overlap logic, delay calculation, conflict resolution generation, and dual-perspective role safeguards:
```bash
npm test
```
*Current test status: **17 passed, 0 failed**.*

### 5. Build for Production
Generate the production-ready distribution bundle:
```bash
npm run build
```
*Zero TypeScript and Vite errors (`dist/index.html`, `dist/assets/index.js`, `dist/assets/index.css`).*

---

## 🧪 Automated Test Suite (17 Tests)

The automated test suite (`src/test-suite.ts`) verifies all mission-critical algorithmic components and role boundaries:

1. **Priority Score Algorithm**:
   - `✓` Max ratings (all 5) yield score 100
   - `✓` Min ratings (all 0) yield score 0
   - `✓` Weighted formula (4,3,2,4,4) yields exactly 67
2. **Date Overlap Engine**:
   - `✓` Separated dates do not overlap
   - `✓` Direct date overlap correctly detected
   - `✓` Buffer days correctly trigger overlap warning
3. **Delay Calculation Engine**:
   - `✓` Early completed project is not marked delayed
   - `✓` Completed project with actual > planned has exact delay days
   - `✓` Unfinished project before deadline is not delayed
4. **Milestone Progress Engine**:
   - `✓` 2/4 milestones yields exactly 50%
5. **Conflict Detection & Recommendation Engine**:
   - `✓` Deterministic conflict engine detects conflicts in seed data
   - `✓` Generates ranked resolution alternatives
   - `✓` At least one viable scheduling adjustment alternative proposed
6. **Dual Perspective & Citizen Issue Reporting**:
   - `✓` Initial state defaults to Government perspective
   - `✓` `setUserRole` successfully switches to Public perspective
   - `✓` Citizens can successfully submit issue reports with project linkage
   - `✓` Government perspective can review, resolve, and publish official responses to citizen issue reports

---

## 🎬 3-Minute Hackathon Demonstration Script

Follow this path to showcase CivicTrack during judging:

1. **Top Bar Perspective Switcher**:
   - Point out the **[🏛️ Government | 👥 Public]** toggle in the top bar and role badge in the sidebar.
2. **Executive Dashboard (`/`)**:
   - View citywide statistics calculated in real-time from the shared dataset.
   - Show active emergency alerts and department workload distributions.
3. **Conflict Detection & Coordination (`/conflicts`)**:
   - Switch to **Government Mode**: Show the detected conflict between Water Works and Road Resurfacing on Segment `SEG-401`.
   - Explain the 5-factor Priority Score ranking and the Critical Safety Override.
   - Click **"Apply Resolution"** to resolve the conflict by shifting the road resurfacing schedule with buffer days.
   - Show how the conflict resolves immediately and updates the project timeline.
4. **Switch to Public Perspective (`👥 Public`)**:
   - Click **Public** in the top bar. Note the instant interface adaptation:
     * Nav labels switch to resident terminology (*Explore Projects*, *Coordination Viewer*).
     * Administrative action buttons ("Add Project", "Record Delay", "Apply Schedule") are hidden.
     * Milestone checkboxes become disabled with explanatory tooltips.
5. **Citizen Issue Reporting (`/feedback` & `/projects/:id`)**:
   - Navigate to any project or the **Citizen Issue Reports** tab.
   - Click **"Report an Issue"** to file a real-world grievance (e.g. "Trench left uncovered near school").
   - Switch back to **Government Mode**: The reported issue immediately appears in the government triage queue.
   - Click **"Mark Under Review"** or **"Resolve"**, enter an official response (*"Barricade installed and trench covered"*), and see the status update propagate to Public mode instantly.
6. **Reports & Data Export (`/reports`)**:
   - Showcase Planned vs. Actual completion comparisons and export the municipal project dataset as CSV.

---

## ⚖️ Demo Disclaimers & Assumptions

* **Simulated Demo Environment**: All contractor names, phone numbers, email addresses, and project titles are fictitious.
* **Prototype Heuristic**: Priority scoring weights (Safety 30%, Essential 25%, Dependency 20%, Urgency 15%, Disruption 10%) are prototype heuristics designed for hackathon demonstration.
* **Role Simulation**: For the 24-hour hackathon MVP, the perspective switch in the UI simulates role authentication using LocalStorage persistence.
