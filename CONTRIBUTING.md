# Contributing to CitySync

> CitySync — Chennai Infrastructure Transparency Portal

Welcome! This guide explains how our four-person team collaborates on a shared codebase without stepping on each other's work.

---

## 🌿 Branch Strategy

We use a single repository with one stable default branch and short-lived feature branches.

```
main (stable — always deployable)
 ├── feature/citysync-brand      — Branding, renaming, CONTRIBUTING docs
 ├── feature/chennai-map         — Interactive Leaflet map for Chennai
 ├── feature/project-data        — Chennai seed data, project schema updates
 └── feature/public-portal       — Public perspective, citizen issue reporting
```

### Rules
| Rule | Details |
|------|---------|
| **`main` is always stable** | Never push broken or WIP code directly to `main`. |
| **One feature per branch** | Keep branches focused. If your work crosses two features, talk first. |
| **Short-lived branches** | Aim to merge within 2–3 days. Long-lived branches create merge conflicts. |
| **No force-push** | Never `git push --force` to `main` or a shared branch. |
| **No credentials** | Never commit API keys, tokens, passwords, or `.env` files. |

---

## 🔀 Daily Workflow

### 1. Always start from a fresh base

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Make small, meaningful commits

```bash
git add -p           # stage hunks selectively, not blindly git add .
git commit -m "feat: add Tambaram project to Chennai seed data"
```

**Good commit message prefixes:**
- `feat:` — new feature or user-visible change
- `fix:` — bug fix
- `style:` — UI/visual-only change (no logic change)
- `refactor:` — code cleanup with no behaviour change
- `docs:` — README, comments, CONTRIBUTING only
- `test:` — adding or updating tests

### 3. Push and open a pull request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub. Request at least one reviewer.

### 4. Run the build before merging

```bash
npm run build       # must pass with 0 TypeScript errors
npm test            # must show 0 failures
```

Do not merge if either command fails.

### 5. Merge and delete the branch

Once approved and passing, merge into `main`. Delete the feature branch after merging to keep the repository tidy.

---

## ⚠️ Coordinating Shared Files

Certain files are shared infrastructure and require extra care:

| File | Owner / Note |
|------|-------------|
| `src/types/index.ts` | Discuss schema changes in a PR comment before merging. Adding *optional* fields is safe. Removing or renaming fields is breaking. |
| `src/data/seedData.ts` | Only `feature/project-data` updates the seed dataset. Others must not duplicate or overwrite it. |
| `src/data/store.ts` | Bump `DATA_VERSION` and `STORAGE_KEY` when the data schema changes, to trigger automatic re-seeding for all users. |
| `src/App.tsx` | Add routes here when introducing a new page. Coordinate to avoid route conflicts. |
| `src/components/Layout.tsx` | Add nav items here when introducing a new page. One nav item per feature branch. |
| `src/context/AppContext.tsx` | Add new dispatch actions only when needed. Document the action and its payload in a PR comment. |

**Interface coordination:**  
If your feature needs a new field in `AppState` or `Project`, open a draft PR that adds only the type definition first. Let others know in the PR description. Once merged, other branches can safely rebase on `main` and use the new field.

---

## 🔧 Local Setup

```bash
git clone https://github.com/JustASpudd/citysync.git
cd citysync
npm install
npm run dev        # starts on http://localhost:5173
npm test           # run algorithmic + role-safeguard tests
npm run build      # production build
```

**Required:** Node.js 18 or higher.

---

## 🧪 Testing Before Merging

Run both checks and confirm they pass:

```bash
npm test           # 17 deterministic tests (priority scoring, delay engine, conflict detection, role safeguards)
npm run build      # TypeScript + Vite production bundle — must have 0 errors
```

The CI check is manual for this hackathon MVP. In production we would add GitHub Actions.

---

## 🚫 Never Do This

- `git push --force` to `main`
- Commit `node_modules/`, `dist/`, `.env`, or API keys
- Create a separate standalone application inside this repository
- Overwrite another person's feature branch
- Merge without running `npm run build` first
- Hardcode statistics independently of `state.projects` data

---

## 🔐 Security & Disclaimer

CitySync uses **client-side LocalStorage only** for this hackathon MVP. The Government/Public role switch is a **demonstration simulation** and does not constitute secure authentication. In a production deployment, all role restrictions must be enforced server-side. Never deploy this with real municipal data without a proper authentication and authorisation layer.

---

## 📬 Questions?

Open a GitHub Issue or tag the team in a PR comment.
