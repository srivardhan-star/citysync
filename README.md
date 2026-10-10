# 🏙️ CitySync — Chennai Infrastructure Transparency Portal

> **Hackathon MVP Deliverable** — A full-stack CivicTech web application for Chennai, built to eliminate uncoordinated road excavations, provide complete public visibility into city infrastructure works, detect and resolve scheduling conflicts, and bridge government administration with citizen accountability.

> ⚠️ **Demo Mode & Data Disclaimer** — All project records, civic issues, contractor names, contact details, and map coordinates in this application are **simulated for demonstration purposes only**. These are not verified live reports from the Greater Chennai Corporation (GCC), CMDA, TANGEDCO, or any official government body.

---

## 🌟 What CitySync Does

Urban centers like Chennai frequently suffer from uncoordinated municipal works:
* Roads resurfaced by the Highways/Roads Department are dug up weeks later by CMWSSB or TANGEDCO for pipeline or cable laying.
* Residents face unannounced lane closures near Velachery, Adyar, and Tambaram with no posted timelines, delay explanations, or detour guidance.
* Departments operate in departmental silos without spatial or temporal scheduling awareness.
* Citizens lack accessible accountability channels to evaluate whether completed projects met delivery commitments or to report on-ground safety hazards.

**CitySync** resolves this through:
1. **Public Landing Page**: A responsive civic-tech portal entry point with instant public access and dedicated government login.
2. **Chennai Infrastructure Map**: Interactive Leaflet map with 12 neighborhood projects, detour guidance, and status tracking.
3. **Deterministic Conflict Detection**: Algorithmic detection of overlapping road excavations across agencies before digging begins.
4. **Transparent Priority Scoring**: Mathematical 5-factor formula balancing public safety, essential utilities, and community disruption.
5. **Government vs. Public Perspectives**: Role-based interface with protected administrative controls for officials and open transparency for residents.
6. **Full Multilingual Support**: Seamless interface switching between English, Tamil (தமிழ்), and Hindi (हिन्दी) with persistent local storage.

---

## 🏛️ Government Demo Login & Route Protection

CitySync includes a demonstration authentication system to showcase administrative workflows:

### Fictional Demo Credentials
Demo credentials are centrally defined in [`src/config/authConfig.ts`](file:///c:/Users/sriva/OneDrive/antigravity%20files/citysync/login%20page/src/config/authConfig.ts):

| Field | Value |
|---|---|
| **Username** | `gcc_admin` |
| **Password** | `citysync2026` |
| **Role** | `government` |
| **Department** | `GCC Works & Infrastructure Department` |

### How Demo Login Works
1. Navigate to `/login` or click **"Government Login"** on the landing page.
2. An **"Auto-fill"** button is provided on the login page for hackathon judges.
3. Successful authentication establishes a minimal demo session stored in `localStorage` under `citysync_demo_auth` and grants Government administrative privileges.
4. **Route Protection**: Direct access to `/government` or `/government/*` routes automatically redirects unauthenticated visitors to `/login`.
5. **Logout**: An official Logout button in the header and sidebar clears the session, sets the perspective to `public`, and safely redirects to the Landing Page (`/`).
6. **Open Public Access**: The Public Dashboard (`/dashboard`) remains completely accessible without login.

> 🔒 **Security Notice**: This is a **frontend demonstration session** for hackathon evaluation and does not constitute production-grade authentication. In a real-world municipal deployment, authentication, password verification, and role-based access control must be strictly enforced server-side using secure HTTP-only session cookies, JWTs, and an enterprise identity provider (IdP). Passwords are never stored in browser storage.

---

## 🌐 Multilingual Support (English, Tamil, Hindi)

CitySync provides interface-wide translation across 3 languages:

1. **English (`en`)** — Default
2. **தமிழ் (`ta`) — Tamil**
3. **हिन्दी (`hi`) — Hindi**

### How Language Switching Works
* **Visible Language Selector**: Accessible near the top-right on the Landing Page, the Government Login page, and the application header.
* **Native Script Display**: The active language is displayed in its native script (e.g., `தமிழ்` and `हिन्दी`) with a globe icon.
* **Instant State-Preserving Switch**: Changing languages updates all UI components immediately without reloading the page or losing current route state.
* **Persistence**: The selected language is stored in `localStorage` (`citysync_lang`) and persists across page refreshes and navigation flows.
* **Fallback Behavior**: English is used as the automatic fallback if a translation key is missing in the chosen language.
* **Translation Coverage**:
  - Landing page headings, taglines, civic descriptions, feature highlights, and buttons.
  - Login form labels, placeholders, validation warnings, errors, and judge hints.
  - Public & Government Dashboard headings, status cards, pie charts, and banners.
  - Project cards, categories, status badges, and department names.
  - Map controls, list view, popup descriptions, and category legends.
  - Conflict detection resolution options and advisory banners.
  - Citizen feedback form labels, issue categories, and response statuses.
  - Reports export controls and analytical metrics.

Translations are centrally maintained in [`src/i18n/translations.ts`](file:///c:/Users/sriva/OneDrive/antigravity%20files/citysync/login%20page/src/i18n/translations.ts).

---

## 🎨 Landing Page & Background Customization

The landing page background and branding settings are centralized in [`src/config/landingConfig.ts`](file:///c:/Users/sriva/OneDrive/antigravity%20files/citysync/login%20page/src/config/landingConfig.ts):

```typescript
export const LANDING_PAGE_CONFIG: LandingPageConfig = {
  appName: 'CitySync',
  tagline: 'Coordinating infrastructure. Connecting communities.',
  description:
    'CitySync helps residents track public works projects, understand construction progress, and improve coordination between government departments.',
  // Customizable background image (URL or local asset):
  backgroundImageUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=2000&q=80',
  overlayOpacity: 0.82,
  // Attractive CSS gradient fallback if image fails to load or is unset:
  gradientFallback: 'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%, #030712 100%)',
  locationBadge: 'Chennai, Tamil Nadu',
  accentCity: 'Greater Chennai Corporation',
};
```

To use a local asset, place the image in the `public/` directory (e.g., `public/chennai-hero.jpg`) and set `backgroundImageUrl: '/chennai-hero.jpg'`. If the image URL is invalid or empty, the application automatically applies the gradient fallback without visual glitches.

---

## 🗺️ Application Routing Flow

| Route | View | Description | Access |
|---|---|---|---|
| `/` | `LandingPage` | CitySync public landing page with branding and action buttons | Public |
| `/login` | `LoginPage` | Government administration login with demo credential hints | Public |
| `/dashboard` | `Dashboard` | Public Dashboard (read-only) or Government Dashboard (administrative) based on role/auth | Public / Gov |
| `/projects` | `ProjectsPage` | Search, filter, and view municipal project lifecycle | Public / Gov |
| `/projects/:id` | `ProjectDetail` | Granular project details, audit history, milestones, and issues | Public / Gov |
| `/map` | `ChennaiMap` | Interactive Leaflet map of Chennai infrastructure works | Public / Gov |
| `/conflicts` | `ConflictDetection` | Automated spatial/temporal overlap detection engine | Public / Gov |
| `/feedback` | `PublicFeedback` | Citizen hazard reporting and municipal triage queue | Public / Gov |
| `/reports` | `Reports` | Analytical charts, delay trends, and CSV export | Public / Gov |
| `/government/*` | Protected Redirect | Guarded route: redirects unauthenticated visitors to `/login` | Protected |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + CSS Variables |
| Internationalization | Lightweight Centralized Dictionary (`src/i18n/translations.ts`) |
| Icons | Lucide React |
| Charts | Recharts |
| Map | Leaflet + React-Leaflet v4 + OpenStreetMap |
| Date Utilities | Date-fns |
| Persistence | LocalStorage (`citysync_v4`, `citysync_demo_auth`, `citysync_lang`) |
| Testing | TSX node test runner (49 deterministic tests) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18 or higher
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Tests
```bash
npm test
```
*49 deterministic tests, 0 failures.*

### 4. Build Production Bundle
```bash
npm run build
```
Generates production-optimized bundle in `dist/` with 0 TypeScript errors.

---

## 🧪 Automated Test Results (49/49 passing)

```
--- Running CitySync Deterministic Engine & Feature Tests ---

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
  ✓ Deterministic conflict engine detects 1 conflict(s) in seed data
  ✓ Generates 3 ranked resolution alternatives
  ✓ At least one viable scheduling adjustment alternative proposed

6. Dual Perspective & Citizen Issue Reporting:
  ✓ Initial state defaults to Government perspective
  ✓ setUserRole successfully switches to Public perspective
  ✓ Citizens can successfully submit issue reports
  ✓ Government perspective can review, resolve, and respond to citizen issue reports

7. Landing Page Branding & Navigation Actions:
  ✓ Landing page app name is configured as CitySync
  ✓ Tagline matches "Coordinating infrastructure. Connecting communities."
  ✓ Description accurately articulates civic infrastructure transparency
  ✓ Attractive CSS gradient fallback is configured when background image is unavailable
  ✓ Landing branding highlights Chennai municipal location

8. Government Login Validation & Security Safeguards:
  ✓ Fictional demo credentials are centrally configured in authConfig
  ✓ Valid demo credentials (gcc_admin / citysync2026) authenticate successfully
  ✓ Username matching is case-insensitive for reliable demo judge login
  ✓ Invalid password triggers expected clear error message key
  ✓ Unregistered username is rejected
  ✓ Empty login attempt triggers required-fields error validation

9. Government Session Management & Route Protection:
  ✓ Initial or cleared state has null stored session (unauthenticated)
  ✓ Successful login establishes minimal demo session in storage
  ✓ Logging out clears session from browser storage
  ✓ Public Dashboard remains fully accessible without requiring authentication

10. Multilingual System (English, Tamil, Hindi):
  ✓ English is default initial language
  ✓ Exactly three languages supported (en, ta, hi)
  ✓ Language codes include English (en), Tamil (ta), and Hindi (hi)
  ✓ Tamil native script renders correctly as தமிழ்
  ✓ Hindi native script renders correctly as हिन्दी

11. Translation Dictionary Coverage & UI Rendering:
  ✓ Landing "Continue to Dashboard" translated correctly in all 3 languages
  ✓ Landing "Government Login" translated correctly in all 3 languages
  ✓ Navigation "Dashboard" translated correctly across EN, TA, HI
  ✓ Project status "Delayed" translated accurately in native Tamil and Hindi
  ✓ Category labels translated accurately in native Tamil and Hindi

12. Translation Fallback & Language Persistence:
  ✓ Existing key in active language returns valid translated string
  ✓ Missing key gracefully returns provided fallback string
  ✓ Tamil selection persists across page refreshes via storage
  ✓ Hindi selection persists across page refreshes via storage
  ✓ First-time visit defaults to English when no preference saved

13. Public vs Government Role Safeguards:
  ✓ Public perspective is active
  ✓ Public role preserves official project data integrity without modification

========================================
Results: 49 passed, 0 failed
========================================
```

---

## 🎬 Judging Demo Walkthrough (3 Minutes)

1. **Landing Page (`/`)**:
   - Inspect the civic branding, tagline, and live stats overview.
   - Click the language selector in the top-right and select **தமிழ் (Tamil)** or **हिन्दी (Hindi)**.
   - Note immediate in-place translation of the entire landing page.
2. **Continue to Dashboard**:
   - Click **"Continue to Dashboard"** (or **"டாஷ்போர்டுக்கு தொடரவும்"**).
   - Arrives at the **Public Dashboard** in the chosen language without requiring authentication.
   - Notice the green "Resident View" badge and disabled admin actions.
3. **Government Login (`/login`)**:
   - Click the perspective switch to Government or navigate to `/login`.
   - Click **"Auto-fill"** to populate demo credentials (`gcc_admin` / `citysync2026`).
   - Sign in to enter the **Government Dashboard** with full administrative privileges.
4. **Government Administrative Actions**:
   - Review active scheduling conflicts and upcoming project milestones.
   - Check the citizen issues triage queue.
5. **Government Logout**:
   - Click **"Logout"** in the top navigation or sidebar.
   - Confirms session clearance and returns cleanly to the Landing Page.

---

## 🤝 Contributing

Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for branch strategy, Git workflows, and shared file coordination rules.
