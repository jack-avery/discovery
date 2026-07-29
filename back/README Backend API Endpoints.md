# RRCRC Asset Mapping Platform, Backend

Flask REST API backend for the Rideau-Rockcliffe Community Resource Asset Mapping Platform.

## Main Objectives & Core Application Logic

The primary objective of the RRCRC Asset Mapping Platform backend is to provide a robust, moderated, and version-controlled API for managing community resources in the Rideau-Rockcliffe area. It serves as the central data engine powering both a public-facing interactive map and a staff-only administrative dashboard.

### Core Workflows & Business Logic

1. **Community Submission & Moderation Flow**
   - **Public Submissions**: Community members (anonymous or authenticated) can submit new resources, propose updates to existing listings, or offer community assets (skills/programs).
   - **Spam Prevention**: Anonymous submissions are rate-limited via hashed IP tracking. The active limit is hardcoded in `utils.py` as `RATE_LIMIT_MAX_SUBMISSIONS = 5` and does **not** read from Flask config, `TestingConfig.RATE_LIMIT_MAX_OVERRIDE` currently has no effect on runtime behavior. To make the override functional, replace the constant with `current_app.config.get("RATE_LIMIT_MAX_OVERRIDE", 5)`.
   - **Moderation Queue**: All community submissions initially land in a `pending_review` state. Moderators review these entries via the dashboard to either approve or reject them.

2. **Resource Versioning & Draft System**
   - To strictly preserve data integrity, the system employs a **Draft & Versioning Pattern**.
   - The `Resource` table acts as a thin permanent shell that holds a pointer (`current_approved_version_id`) to the active data.
   - When an update is suggested, a completely new `ResourceVersion` record is generated rather than mutating the original entry. Upon staff approval, the shell's pointer smoothly shifts to the new version. This isolates live public data from unauthorized tampering and maintains a full historical audit trail.

3. **Geospatial & Map Querying Flow**
   - The frontend's interactive map requires rapid delivery of geographic location pins.
   - The backend intercepts coordinate requests (latitude/longitude) and dynamically determines which active resources fall within a specific viewing radius using a Haversine distance calculation, then dispatches lightweight payloads to render map nodes smoothly.

4. **Issue Ticketing Workflow**
   - Users who encounter map discrepancies (e.g., permanently closed locations, wrong hours) can submit an "Issue."
   - These reports generate organized tickets for the moderation team. Staff can investigate the claim, safely draft corrective updates against the resource, and resolve the ticket.
   - Anonymous issue reporting is rate-limited using the same IP-hash mechanism as submissions.

## Stack & Framework Details

| Layer       | Technology                               |
|-------------|-------------------------------------------|
| Framework   | Flask 3.0                                 |
| ORM         | SQLAlchemy 2.0 + Flask-SQLAlchemy         |
| Database    | MySQL 8 (dev/test: SQLite in-memory)      |
| Auth        | Flask-JWT-Extended (dual-token pattern)   |
| Passwords   | Flask-Bcrypt                              |
| Migrations  | Flask-Migrate (Alembic)                   |
| Deployment  | Docker + docker-compose (handled by DevOps) |

This backend architecture operates exclusively on a Flask + SQLAlchemy ORM layer serving REST API endpoints. All validation, database models, pagination, role-based access control, and routing logic are handled here before delivering serialized responses to clients.

---

## Detailed Project Structure & Files

```text
back/
├── run.py                      # Application entry point
├── requirements.txt            # Dependency list (includes pytest)
├── .env.example                # Copy to .env and fill in secrets
├── pytest.ini                  # Pytest configuration
│
├── app/
│   ├── __init__.py             # Application factory `create_app` (initializes extensions, registers blueprints)
│   ├── config.py               # Development / Testing / Production configs (database URI, JWT configs)
│   ├── extensions.py           # Singletons matching the stack (db, jwt, bcrypt, migrate)
│   ├── models.py               # Defines all SQLAlchemy ORM models covering Auth, Resources, & Workflow
│   ├── utils.py                # Reusable logic: response envelope (ok/err), slug generation, rate limiting, role decorators
│   └── routes/
│       ├── __init__.py         # Gathers components and registers blueprints
│       ├── auth.py             # Auth Blueprint (url_prefix="/auth"): login, register, refresh, logout
│       ├── resources.py        # Resources Blueprint: map, list, slug detail, staff CRUD
│       ├── categories.py       # Categories & Tags CRUD
│       ├── submissions.py      # Community submission workflows (Flow A / Flow B)
│       └── issues.py           # Ticket/issues moderation + dashboard metrics
│
└── tests/
    ├── conftest.py             # Fixtures: `client`, `app` (function-scoped, fresh in-memory SQLite per test)
    └── test_app.py             # Full integration test suite, 87 tests
```

### Key Python Logic & Utilities (`app/utils.py`)
- **`ok()` and `err()` Envelopes**: Standardize every JSON response so clients always receive a unified structured envelope.
- **`paginate(query, page, limit)`**: Used for search operations; caps the upper limit to prevent abusive querying against MySQL.
- **Role Decorators (`@require_roles`)**: Verifies the active JWT identity against `User.query` to enforce functional permissions. Returns `401` when no token is present, `403` when the authenticated user's role isn't in the allowed set.
- **Slug Generation (`generate_unique_slug`)**: Recursively resolves naming conflicts (e.g. `Food Bank` → `food-bank-2` on duplicate).
- **Rate Limiting (`check_and_increment_rate_limit`)**: Hashed IP tracking blocks excessive unauthenticated calls on `/submissions` and `/issues`. Returns `True` when the request is allowed, `False` when the limit is exceeded, callers must gate on `if not check_and_increment_rate_limit(ip_hash): return err(...), 429`.

---

## Quick Start (Local Development)

### 1. Clone and create a virtual environment

```bash
cd back
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env, set DB_*, SECRET_KEY, JWT_SECRET_KEY
```

### 3. Set up the database

*Note: Production schemas and permissions are managed outside this repository via dedicated MySQL SQL scripts (see `db/schema.sql` and the project `Justfile`'s `initdb` recipe).*

For local dev via Flask-Migrate against your SQLAlchemy models:

```bash
flask db init          # First time only
flask db migrate -m "Initial schema"
flask db upgrade
```

### 4. Run the development server

```bash
FLASK_ENV=development python run.py
```

Direct backend access (bypassing Caddy) is at `http://localhost:5000/`.
Health check: `GET http://localhost:5000/health`

**Note on the `/api/v1/` prefix**: Flask blueprints in this repo are registered with bare prefixes (`/auth`, `/resources`, `/submissions`, `/issues`, `/categories`, `/tags`, `/dashboard`), there is no `/api/v1/` prefix inside the Flask app itself. The `/api/v1/` prefix seen by frontend clients is added and stripped by the Caddy reverse proxy (`conf/caddy/Caddyfile`), which routes `/api/v1/*` → `strip_prefix /api/v1` → `back:5000/*`. When testing the backend directly or writing pytest cases, use the bare paths (e.g. `/auth/login`, not `/api/v1/auth/login`).

---

## Database Models & Relationships (`app/models.py`)

### Domain 1: Authentication & Users
- **`Role`**, **`User`**, **`UserRole`**: Many-to-many relationship defining functional authorization levels (`contributor`, `staff_editor`, `moderator`, `administrator`).
- **`PasswordResetToken`**: Tracks reset request links and hash expiry.

### Domain 2: Core Resources & Lookup
- **`Resource`** & **`ResourceVersion`**: Implements the "Draft & Versioning" mechanism. `Resource` is a thin shell holding `current_approved_version_id`; `ResourceVersion` contains actual fields (name, description, moderation_status).
- **`ResourceLocation`**: Stores decimal-point latitude/longitude for Haversine-based distance filtering. Related to Contacts and Hours.
- **`Category`** & **`Tag`**: Organize and reference approved `ResourceVersion` rows.
- **`ResourceChangeLog`**: Audit trail row written on every approval/rejection/edit action.

### Domain 3: Workflows & Submissions
- **`Submission`**: Public submissions generating a version tagged `pending_review`.
- **`SubmissionReview`**: Captures who approved/rejected a listing and any moderator notes.
- **`ReportedIssue`**: Ticketing system for map inaccuracies, tracked via `status` (`open`/`resolved`) and `resolved_at`.

---

## Comprehensive API Overview

All paths below are the bare Flask routes. When accessed through the deployed stack, prepend `/api/v1` (handled transparently by Caddy).

### Authentication (`routes/auth.py`)
Dual-Token Pattern: a short-lived JWT `access_token` returned in the JSON body (for the `Authorization` header), and a 7-day `refresh_token` stored in an `HttpOnly` secure cookie.

| Method | Endpoint         | Auth   | Role | Logic Flow / Method Insight |
|--------|------------------|--------|------|------------------------------|
| POST   | `/auth/register` | None   | None | Hashes password via Bcrypt, stores a new `User`. No RBAC roles assigned by default. Returns `422` with field-level errors for missing/invalid fields, `409` on duplicate email, `400` only when the body isn't valid JSON at all. |
| POST   | `/auth/login`    | None   | None | Verifies password via constant-time Bcrypt check against a dummy hash when the user doesn't exist (prevents enumeration). Returns `401` on bad credentials, `422` on a valid-JSON-but-missing-fields body (e.g. `{}`), `400` only for non-JSON bodies. Sets the refresh cookie via `set_refresh_cookies()`. |
| POST   | `/auth/refresh`  | Cookie | None | `@jwt_required(refresh=True)` validates the refresh cookie, re-checks `user.is_active`, and mints a new access token. |
| POST   | `/auth/logout`   | None   | None | Calls `unset_refresh_cookies()` to emit a clearing `Set-Cookie` header. |

**Important implementation detail**: both `register()` and `login()` must use `if data is None:` (not `if not data:`) when checking `request.get_json(silent=True)`. An empty JSON body `{}` is falsy in Python but is still valid JSON, using `not data` incorrectly short-circuits to `400` before field-level validation runs, when it should fall through to return `422`.

### Resource Management (`routes/resources.py`)
Public endpoints use Haversine distance filtering on lat/lng and support pagination.

| Method | Endpoint                 | Auth          | Logic Flow / Method Insight |
|--------|--------------------------|---------------|------------------------------|
| GET    | `/resources/map`         | None          | Requires `lat`/`lng` query params (`400` if missing). Filters active resources by radius (`radius_km`, default reasonable value) via Haversine, returns lightweight `{count, pins}` payload. |
| GET    | `/resources`             | None          | Paginated list of published (`is_active=1`) resources. |
| GET    | `/resources/slug/{slug}` | None          | Returns full `ResourceVersion` detail for the current approved version. `404` if slug not found. |
| GET    | `/resources/{id}`        | None          | Returns detail by numeric ID. `404` if not found. |
| POST   | `/resources`             | staff_editor+ | Bypasses moderation queue, creates an immediately active `Resource` + approved `ResourceVersion` with an auto-generated unique slug. |
| PUT    | `/resources/{id}`        | staff_editor+ | Creates a **new** `ResourceVersion` row (never mutates the existing one) and repoints `current_approved_version_id`. |
| DELETE | `/resources/{id}`        | administrator | Soft-delete via `deleted_at` timestamp. Row is preserved; hidden from public endpoints. |

### Moderation Submissions (`routes/submissions.py`)
Two flows: Flow A (`new_resource` / `community_asset`) creates a shell + pending version; Flow B (`update_resource`) creates a diff against an existing `Resource`.

| Method | Endpoint                    | Auth              | Logic Flow / Method Insight |
|--------|-----------------------------|--------------------|------------------------------|
| POST   | `/submissions`              | None (rate-limited) | `submission_type` required (`400` if missing/invalid). Flow B requires `resource_id` (`400` if missing, `404` if nonexistent). Anonymous callers rate-limited via `check_and_increment_rate_limit`; 6th call from the same IP hash within the window returns `429`. Authenticated users bypass the limiter entirely. |
| GET    | `/submissions`              | moderator+         | Returns `{items: [...]}` of pending submissions across all categories. |
| POST   | `/submissions/{id}/review`  | moderator+         | `decision` must be `"approved"` or `"rejected"` (`400` otherwise). Re-reviewing an already-reviewed submission returns `422`. On approve, atomically: sets version status to `approved`, stamps `approved_at`, repoints `current_approved_version_id`, sets `Resource.is_active=1`, sets `Submission.moderation_status=approved`, inserts a `SubmissionReview` row, and writes a `ResourceChangeLog` row (`change_type=approved_submission`). |

### Categories & Tags (`routes/categories.py`)

| Method | Endpoint          | Auth          | Logic Flow / Method Insight |
|--------|-------------------|---------------|------------------------------|
| GET    | `/categories`     | None          | Public list. |
| POST   | `/categories`     | staff_editor+ | `409` on duplicate name. |
| PUT    | `/categories/{id}`| staff_editor+ | `404` if nonexistent. `422` if `parent_category_id` would create a circular reference (self-parenting). |
| DELETE | `/categories/{id}`| staff_editor+ | Soft-deactivates (`is_active=False`), does not hard-delete. |
| GET/POST/PUT/DELETE | `/tags`, `/tags/{id}` | staff_editor+ (writes) | Mirrors the Categories pattern, soft-deactivate on delete, `409` on duplicate name. |

### Issues & Dashboard (`routes/issues.py`)

| Method | Endpoint                | Auth               | Logic Flow / Method Insight |
|--------|--------------------------|---------------------|------------------------------|
| POST   | `/issues`                | None (rate-limited) | Requires `resource_id` and `description` (`400` if either missing). `404` if `resource_id` doesn't exist. Anonymous calls are rate-limited using the same guard pattern as `/submissions`, `if not check_and_increment_rate_limit(ip_hash): return err(...), 429`. Authenticated calls bypass the limiter. |
| GET    | `/issues`                | moderator+          | Returns `{items: [...]}`. |
| PUT    | `/issues/{id}/resolve`   | moderator+          | Sets `status="resolved"` and `resolved_at`. `404` if issue doesn't exist. `422` if already resolved (idempotency guard). |
| GET    | `/dashboard/stats`       | moderator+          | Aggregates `published_resources`, `pending_submissions`, `total_users`, `open_issues`, `total_resources` in a single response. |

---

## Role-Based Permissions Architecture

`@require_roles()` intercepts requests, calls `verify_jwt_in_request()`, and checks the JWT identity against the `UserRole` join table:

- **Anonymous**: Rate-limited submission and issue creation; all public GET endpoints.
- **Contributor**: Authenticated baseline; no elevated write permissions on categories/resources.
- **Staff Editor**: Direct create/update on `Resources`, `Categories`, and `Tags`, bypasses the moderation queue entirely.
- **Moderator**: Access to `/dashboard/stats`, `/submissions` (list + review), and `/issues` (list + resolve). A `staff_editor` calling a moderator-only route correctly receives `403` (staff_editor is a lower privilege tier, not a superset).
- **Administrator**: Only role permitted to `DELETE /resources/{id}` (staff_editor is explicitly blocked with `403`).

---

## Backend Deployment & DevOps Note

Standard operation bridges through Docker Compose (`docker compose up -d`). The compose file starts `back` (Flask, built from `back/Dockerfile`) alongside `front` (Caddy) and `db` (MySQL 8). CI/CD, cluster orchestration, and cloud environments are handled by the DevOps team; this repo covers Flask architecture and MySQL modeling only.

## Testing Setup

Integration tests run against an in-memory SQLite sandbox, no MySQL connection required.

```bash
cd back
python -m pytest tests/test_app.py -v
```

**Fixture dependency**: `client` and `app` are defined in `tests/conftest.py`. If pytest reports `fixture 'client' not found`, confirm `conftest.py` exists in `back/tests/` and that you're running pytest from inside `back/` (or with `back` on the discovery path), running from the wrong working directory breaks conftest auto-discovery.

**Current suite status**: 87/87 passing after two fixes:
1. `routes/issues.py`, rate-limit guard was inverted (`if check_and_increment_rate_limit(...)` instead of `if not check_and_increment_rate_limit(...)`), causing every anonymous `POST /issues` to return `429` on the first call. Fixed; the corresponding `xfail(strict=True)` marker on `test_create_issue_anonymous_should_return_201` has been removed from the test file.
2. `routes/auth.py`, `login()` used `if not data:` on the parsed JSON body, causing a valid-but-empty `{}` payload to incorrectly return `400` instead of falling through to field validation and returning `422`. Fixed by changing the check to `if data is None:`.

**Known limitation (not a bug, by design)**: `TestingConfig.RATE_LIMIT_MAX_OVERRIDE = 999` has no effect because `utils.py` hardcodes `RATE_LIMIT_MAX_SUBMISSIONS = 5` and never reads Flask config. Tests relying on the default limit of 5 work correctly since each test gets a fresh DB (rate-limit counter resets per test function).