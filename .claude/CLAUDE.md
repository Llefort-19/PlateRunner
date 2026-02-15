# HTE Design Application

High-Throughput Experimentation (HTE) planning tool for chemical research. Enables 96-well plate experiment design, chemical inventory management, analytical data import, and heatmap visualization.

## Tech Stack

**Frontend:** React 18.3, React Router 6, React Hook Form, Axios, React Table, XLSX
**Backend:** Flask 2.3, Pandas, Marshmallow validation, RDKit (optional, molecule rendering)
**Data:** Excel files (no database) - Inventory.xlsx, Solvent.xlsx in `/data`

## Project Structure

```
├── backend/                 # Flask API
│   ├── app.py              # App factory, blueprint registration
│   ├── config.py           # Environment configs (Dev/Prod/Test)
│   ├── utils.py            # Molecule rendering, image helpers
│   ├── routes/             # API blueprints (8 modules)
│   ├── validation/         # Marshmallow schemas, decorators
│   ├── security/           # Rate limiting, file validation, headers
│   └── state/              # Thread-safe global state management
├── frontend/
│   └── src/
│       ├── App.js          # Tab-based UI (7 tabs)
│       └── components/     # 15 React components
├── data/                   # Required Excel files (Inventory, Solvent)
└── dist/                   # PyInstaller build output
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `backend/app.py:19-85` | Flask app factory with CORS, logging, security |
| `frontend/src/App.js:1-102` | Main React component with tab routing |
| `hte_launcher.py` | PyInstaller executable entry point |
| `backend/state/experiment.py` | Experiment state singleton |

## Essential Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run start-backend          # Flask only (port 5000)
npm run start-frontend         # React only (port 3000)

# Build
npm run build                  # Production React build
pyinstaller hte_app.spec       # Standard executable
pyinstaller hte_app_onefile.spec  # Single-file executable

# Dependencies
npm run install-all            # Install all npm packages
pip install -r requirements.txt  # Python dependencies

# Testing & Audit
npm run audit                  # Security audit
cd frontend && npm test        # React tests
```

## API Routes

All routes prefixed with `/api`:
- `/experiment/*` - Context, materials, procedure, analytical data, results
- `/inventory/*` - Chemical inventory search
- `/solvent/*` - Solvent database
- `/molecule/*` - Structure image generation

## State Management

**Frontend:** React Context (`ToastContext.js`) + component `useState` hooks
**Backend:** Thread-safe singleton in `backend/state/` with RLock protection

## Validation

Backend uses Marshmallow schemas (`backend/validation/schemas.py`) with decorators:
- `@validate_request(schema)` - Request body validation (line 1-202)
- `@validate_response(schema)` - Response validation
- `@validate_query_params(schema)` - Query string validation

### Validated Fields

All numeric fields enforce strict data types for ML-ready data:

| Field | Type | Constraints | Example |
|-------|------|-------------|---------|
| **Materials** |
| molecular_weight | Float | 0 < MW ≤ 10000 | 46.07 |
| cas | String | Format: `\d{1,7}-\d{2}-\d` | 64-17-5 |
| smiles | String | Valid SMILES syntax | CCO |
| **Procedure** |
| temperature | Float | Any value | 80.0 or -78.0 |
| time | Float | ≥ 0 | 2.5 |
| pressure | Float | > 0 | 1.5 |
| wavelength | Float | ≥ 0 | 254 |
| **Analytical Data** |
| duration | Float | ≥ 0 | 15.5 |

### Validation Modes

- **Development Mode** (`VALIDATION_STRICT = False`): Invalid data generates warnings but is accepted (useful for prototyping)
- **Production Mode** (`VALIDATION_STRICT = True`): Invalid data returns 400 error (enforces data quality)
- **Testing Mode**: Uses strict mode for comprehensive validation testing

### Error Handling

**Frontend:**
- Inline validation shows errors below fields as user types (onBlur)
- Red border + error icon indicates invalid fields
- Toast notifications display structured validation errors

**Backend:**
- Returns HTTP 400 with structured error details
- Error response format: `{ "message": "...", "details": { "field_name": ["error message"] } }`

**Example Error Response:**
```json
{
  "message": "Validation failed",
  "details": {
    "molecular_weight": ["Molecular weight must be greater than 0"],
    "cas": ["Invalid CAS format (expected: 123-45-6)"]
  }
}
```

See [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) for user-friendly documentation.

## Required Data Files

Place in `/data` directory:
- `Inventory.xlsx` - Main chemical inventory (required)
- `Solvent.xlsx` - Solvent database (required)
- `Private_Inventory.xlsx` - User chemicals (auto-created)

## Environment Notes

- **Python:** 3.9-3.11 recommended (RDKit compatibility issues with 3.13+)
- **Node:** 16+ (18+ recommended)
- **Ports:** Frontend 3000, Backend 5000

## Additional Documentation

Check these files when working on specific areas:

| Topic | File |
|-------|------|
| Architectural patterns & conventions | [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) |
| Troubleshooting common issues | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Dependency issues | [DEPENDENCY_TROUBLESHOOTING.md](DEPENDENCY_TROUBLESHOOTING.md) |
| Deployment automation | [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) |
| Data folder requirements | [data/README.md](data/README.md) |

## Quick Reference

- 7 UI tabs: Experiment Context, Materials, Design, Procedure, Analytical Data, Results, Heatmap
- All state is in-memory (no database) - persisted via Excel import/export
- Components use functional React with hooks (no class components)
- Flask blueprints organize routes by domain
- File uploads validated for security (`backend/security/file_validation.py`)
