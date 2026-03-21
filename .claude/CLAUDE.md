# PlateRunner

Web application for High-Throughput Experimentation (HTE) lab work. Enables 96-well plate experiment design, chemical inventory management, analytical data import, heatmap visualization, and a mobile-optimized PWA lab companion.

- **Live URL**: https://platerunner-kwlz.onrender.com
- **Local repo**: `C:\Cursor\Platerunner`
- **GitHub**: https://github.com/Llefort-19/PlateRunner

## Tech Stack

**Frontend:** React 18.3, React Router 6, React Hook Form, Axios, React Table, XLSX, PWA (CRA + Workbox)
**Backend:** Flask 2.3, SQLAlchemy + SQLite, Flask-Login + bcrypt, Marshmallow validation, RDKit (optional)
**Deployment:** Docker, Render.com, gunicorn (single worker)

## Project Structure

```
├── backend/
│   ├── app.py                    # App factory, blueprint registration, security middleware
│   ├── auth.py                   # Flask-Login auth blueprint (/api/auth/*)
│   ├── config.py                 # Dev/Prod/Test configs
│   ├── models.py                 # SQLAlchemy: User, Experiment, InviteCode
│   ├── seed.py                   # Invite code & admin account management (no Flask import)
│   ├── utils.py                  # RDKit helpers, image conversion
│   ├── routes/                   # 12 API blueprints
│   │   ├── experiment.py         # Context, materials, procedure, results
│   │   ├── experiment_import.py  # Excel/SDF import
│   │   ├── export.py             # Excel export
│   │   ├── inventory.py          # Chemical search (Inventory.xlsx)
│   │   ├── solvent.py            # Solvent database
│   │   ├── molecules.py          # Structure rendering (RDKit)
│   │   ├── kit.py                # Kit management
│   │   ├── plating_protocol.py   # Protocol generation
│   │   ├── pdf_export_reportlab.py # PDF reports
│   │   ├── lab_guide.py          # Lab guide API
│   │   ├── uploads.py            # File upload handling
│   │   └── lifecycle.py          # Server status endpoint
│   ├── validation/               # Marshmallow schemas & decorators
│   ├── security/                 # CSP headers, rate limiting, file validation
│   └── state/                    # Per-user DB-backed state (experiment.py, inventory.py)
├── frontend/src/
│   ├── index.js                  # Entry point: global PWA prompt capture + SW registration
│   ├── App.js                    # Auth check, routing (desktop/mobile/lab)
│   ├── setupProxy.js             # Dev proxy: /api/* → localhost:5000
│   ├── serviceWorkerRegistration.js
│   └── components/
│       ├── Login.js              # Sign in / register with invite code + minimal PWA mode
│       ├── Header.jsx            # Tab navigation, logout
│       ├── ExperimentContext.js  # Experiment metadata form
│       ├── Materials.js          # Chemical materials management
│       ├── Procedure.js          # 96-well plate design
│       ├── ProcedureSettings.js  # Reaction conditions & analytics
│       ├── AnalyticalData.js     # UPLC/MS data import & processing
│       ├── Results.js            # Yield/conversion/selectivity entry
│       ├── Heatmap.js            # Result heatmap visualization
│       ├── Help.js               # Contextual help sidebar
│       ├── InventorySearch.js    # Chemical lookup
│       ├── KitPositioning.js     # Kit layout
│       ├── Toast.js / ToastContext.js
│       ├── LabGuide/             # Mobile PWA lab companion
│       │   ├── LabGuide.js       # Main step-by-step workflow
│       │   ├── LabGuideShell.js  # Nav shell (topbar, prev/next, jump, logout)
│       │   ├── LabLogin.js       # Standalone auth for lab route
│       │   ├── InstallBanner.js  # PWA install overlay card
│       │   ├── buildSteps.js     # Dynamic step builder
│       │   ├── DeviationForm.js  # Record lab deviations
│       │   ├── DispenseStep.js, EvaporateStep.js, ...
│       │   └── LabGuide.css
│       └── PlatingProtocol/      # Plating protocol design modal
│           ├── PlatingProtocolModal.js
│           ├── StockSolutionForm.js
│           ├── stockCalculations.js
│           └── ...
├── data/                         # Reference Excel files (required)
│   ├── Inventory.xlsx
│   └── Solvent.xlsx
├── Dockerfile                    # miniconda3 base (RDKit), Node 18, gunicorn
├── docker-compose.yml
├── render.yaml                   # Render.com IaC blueprint
└── DEPLOY.md
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `backend/app.py` | Flask factory: CORS, auth, DB init, security headers, blueprints |
| `backend/auth.py` | Login / register / logout / me endpoints |
| `backend/models.py` | User, Experiment (JSON blob), InviteCode |
| `backend/state/experiment.py` | Per-user state singleton, loads from DB via `flask.g` |
| `frontend/src/App.js` | Auth check, desktop/mobile routing, isStandalone detection |
| `frontend/src/index.js` | Global `beforeinstallprompt` capture, SW registration |

## Essential Commands

```bash
# Development
npm start                    # Start backend + frontend concurrently
npm run start-backend        # Flask only (port 5000)
npm run start-frontend       # React only (port 3000)

# Build & Deploy
npm run build                # Production React build
docker build -t platerunner .
docker-compose up

# Dependencies
npm run install-all          # Install all npm packages
pip install -r requirements.txt

# Invite code & user management (run from backend/)
python seed.py generate 10   # Generate 10 invite codes
python seed.py list          # List unused codes
python seed.py create-admin <username> <password>
python seed.py list-users

# Testing
cd frontend && npm test
```

## API Routes

All routes prefixed with `/api`:
- `/auth/*` — login, register, me, logout
- `/experiment/*` — context, materials, procedure, procedure-settings, analytical-data, results
- `/experiment/import` — Excel/SDF import
- `/export/*` — Excel export
- `/inventory/*` — chemical search
- `/solvent/*` — solvent database
- `/molecule/*` — structure image generation (RDKit)
- `/kit/*` — kit management
- `/plating-protocol/*` — protocol generation
- `/pdf-export/*` — PDF report generation
- `/lab-guide/*` — lab workflow API
- `/uploads/*` — file uploads
- `/server/ping` — health check (auth-exempt)

**Auth-exempt routes:** `/api/auth/login`, `/api/auth/register`, `/api/server/ping`, `/api/server/status`

## Authentication & State

- **Auth:** Flask-Login + bcrypt. Invite-only registration (single-use codes).
- **Session:** HttpOnly cookie (Secure + Lax SameSite in prod). 401 → frontend reload → Login.
- **Per-user state:** Each request loads user's active Experiment from SQLite via `flask.g`.
- **Auto-save:** After-request hook persists dirty state. No explicit Save button.
- **Database:** SQLite at `backend/instance/hte_beta.db` (dev) or `/data/hte_beta.db` (prod).

## Mobile / PWA Architecture

### Two apps in one
- **Desktop** (`/`): Full 7-tab app — Context, Materials, Design, Procedure, Analytical Data, Results, Heatmap
- **Mobile** (`/lab`): PlateRunner Lab — step-by-step PWA companion for field use

### Routing logic (App.js)
```js
// 1. Unauthenticated → <Login minimal={isStandalone} />
//    - isStandalone=true: minimal login form only (no marketing page)
//    - isStandalone=false: full landing/marketing page
// 2. Authenticated + path === '/lab' → render LabGuide directly
// 3. Authenticated + isMobile (< 768px) → window.location.replace('/lab')
// 4. Authenticated + desktop → full tab app
```

### PWA Install Banner (InstallBanner.js)
- Full-screen overlay shown to mobile users who haven't installed yet
- **iOS:** Safari share instructions (step-by-step)
- **Android:** native Install button (triggers `beforeinstallprompt`)
- **Guard:** `if (isStandalone || dismissed || (!isIOS && !installPrompt)) return null`
  - App already installed → Chrome suppresses `beforeinstallprompt` → `installPrompt` null → banner hidden
  - Dismissed is session-only (useState, no localStorage)
- **Race condition fix:** `index.js` captures event globally before React mounts via `window.__pwaInstallPrompt`

### PWA Manifest
- `start_url: /lab`, `scope: /lab`, `display: standalone`, `orientation: portrait`
- Theme color: `#2563eb`

### Logout behavior (LabGuideShell.js)
- Standalone PWA: `window.location.href = '/lab'` → 401 → minimal Login form
- Browser: `window.location.href = '/'` → full landing page

### Logo files
- `/public/Unicorn_lab_no_bg.png` — geometric unicorn with lab flasks. Used in: InstallBanner, minimal Login
- `/public/platerunner-logo.png` — unicorn + grid squares. Used in: main landing page

## Validation

Marshmallow schemas in `backend/validation/schemas.py` with decorators:
- `@validate_request(schema)` — validates request body
- `@validate_response(schema)` — validates response (warnings only)
- `@validate_query_params(schema)` — validates query strings

| Field | Type | Constraints |
|-------|------|-------------|
| molecular_weight | Float | 0 < MW ≤ 10000 |
| cas | String | `\d{1,7}-\d{2}-\d` |
| smiles | String | Valid SMILES (balanced parens/brackets) |
| temperature | Float | Any value |
| time | Float | ≥ 0 |
| pressure | Float | > 0 |
| wavelength | Float | ≥ 0 |
| conversion/yield/selectivity | Float | 0–100 |

**Modes:** Dev (`VALIDATION_STRICT=False`) logs warnings; Prod enforces HTTP 400.

## Security

- Security headers: CSP, X-Frame-Options DENY, HSTS (prod), nosniff
- Rate limiting: 100 req/min (API), 10 uploads per 5 min
- File uploads: `.xlsx/.xls/.csv/.sdf` only, max 25 MB, MIME type checked via `python-magic`
- Single gunicorn worker (SQLite write safety)

## Deployment (Render.com)

- Docker runtime, 1GB persistent disk at `/data`
- `SECRET_KEY` auto-generated by Render
- `start.sh` seeds reference data then launches gunicorn
- 1 instance only (SQLite concurrency constraint)
- See `DEPLOY.md` for full instructions

## Environment Notes

- **Python:** 3.11 via conda (RDKit requires conda, not pip)
- **Node:** 18+
- **Ports:** Frontend 3000, Backend 5000
- `seed.py` must NOT import from `app.py` (module-level Flask init hangs)

## Additional Documentation

| Topic | File |
|-------|------|
| Architectural patterns & conventions | `.claude/docs/architectural_patterns.md` |
| Implementation history | `.claude/IMPLEMENTATION_SUMMARY.md` |
| Validation field reference | `.claude/VALIDATION_GUIDE.md` |
| Integration test procedures | `.claude/INTEGRATION_TEST_GUIDE.md` |
| Version history | `.claude/CHANGELOG.md` |
| Deployment guide | `DEPLOY.md` |
