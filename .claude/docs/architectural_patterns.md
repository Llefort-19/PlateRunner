# Architectural Patterns

This document describes patterns and conventions observed across the HTE App codebase.

## State Management

### Backend: Thread-Safe Singleton
Global experiment state uses RLock protection with copy-on-read:
- `backend/state/experiment.py:9` - Lock definition
- `backend/state/experiment.py:38-43` - Deep copy on read
- `backend/state/experiment.py:45-78` - Lock-protected updates

### Frontend: Context + Hooks
- `ToastContext.js:3-11` - Context creation with custom hook pattern
- `ToastContext.js:16-53` - useCallback memoization for all handlers
- All 15 components use `useState` for local state

### Ref-Based Performance State
For drag operations, useRef avoids re-renders:
- `Procedure.js:12-15` - dragStateRef for non-render state

## API Design

### Blueprint Organization
Routes organized by domain with consistent URL prefixes:
- `app.py:131-151` - Centralized blueprint registration
- `routes/experiment.py:15` - `/api/experiment`
- `routes/inventory.py:12` - `/api/inventory`
- `routes/kit.py:14` - `/api/experiment/kit`

### RESTful Conventions
- GET for retrieval, POST for mutations
- `routes/experiment.py:17-220` - Consistent pattern for all endpoints
- Axios used throughout frontend (69 occurrences)

### Proxy Configuration
Development proxy in `frontend/src/setupProxy.js:1-24`

## Validation

### Marshmallow Schemas
33 schemas defined in `backend/validation/schemas.py`:
- `schemas.py:7-14` - ExperimentContextSchema
- `schemas.py:16-33` - MaterialSchema
- `schemas.py:119-129` - SolventSearchSchema

### Decorator Pattern
- `decorators.py:14-73` - @validate_request
- `decorators.py:75-141` - @validate_response
- `decorators.py:143-195` - @validate_query_params

### Dual-Mode Validation
Configurable strict vs warn-only:
- `validation/utils.py:77-84` - Mode switching logic

## Component Patterns

### Functional Components
All components are functional with hooks:
- `Materials.js:9` - `const Materials = () => {...}`
- `Procedure.js:5` - Props destructuring with defaults

### Props with Fallbacks
- `Procedure.js:22-23` - Local state fallback when props absent

### Modal State Pattern
Boolean state controls visibility:
- `Materials.js:19-26` - Multiple modal states

### Memoization
- `MaterialTable.js:54` - memo() wrapper
- `ToastContext.js:16-33` - useCallback for handlers

### Component Composition
Parent components import specialized children:
- `Materials.js:4-7` - MaterialTable, MaterialForm, InventorySearch, KitPositioning

## Data Persistence

### Excel-Based Storage
No traditional database - Excel files for persistence:
- `routes/export.py:18-36` - openpyxl workbook creation
- `state/inventory.py:36-42` - pandas DataFrame from Excel

### Multi-Sheet Import/Export
- `routes/experiment_import.py:50-262` - Sheet-by-sheet processing
- `routes/export.py:25-239` - Structured export with enrichment

### Temporary File Handling
- `routes/import.py:44-46` - tempfile.NamedTemporaryFile pattern

## Error Handling

### Centralized Error Responses
- `app.py:153-201` - @app.errorhandler decorators for 400, 404, 413, 500

### Custom Exceptions
- `validation/utils.py:10-15` - ValidationError with structured errors
- `validation/utils.py:17-19` - ValidationWarning for non-strict mode

### Try-Except with Logging
105 occurrences across route files with appropriate logging levels

## Security

### Rate Limiting
- `security/rate_limiting.py:9-10` - Per-IP request tracking
- `security/rate_limiting.py:12-50` - is_rate_limited() service
- `app.py:127-129` - Applied as before_request handler

### Security Headers
- `security/headers.py:6-37` - add_security_headers() middleware

### File Validation
- `security/file_validation.py` - MIME type and extension checks

## Configuration

### Environment-Driven
- `config.py:75-137` - Base Config class
- `config.py:139-148` - DevelopmentConfig (lenient)
- `config.py:150-155` - ProductionConfig (strict)
- `config.py:176-179` - get_config() factory

## Inter-Component Communication

### Custom Events
- `ExperimentContext.js:84-92` - Listen for 'materialsCleared'
- `ExperimentContext.js:203-204` - Dispatch 'experimentContextUpdated'

### Module Barrel Exports
- `state/__init__.py:5-12` - Re-export pattern for encapsulation
- `validation/__init__.py:5-43` - Controlled exports

## Conventions Summary

| Area | Pattern |
|------|---------|
| State (Backend) | Thread-safe singleton with RLock |
| State (Frontend) | Context API + useState hooks |
| API Routes | Flask blueprints by domain |
| Validation | Marshmallow schemas + decorators |
| Components | Functional + hooks, no classes |
| Data Storage | Excel files via pandas/openpyxl |
| Error Handling | Centralized handlers + logging |
| Security | Rate limiting + headers middleware |
