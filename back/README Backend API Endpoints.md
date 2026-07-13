# RRCRC Asset Mapping Platform — Backend

Flask REST API backend for the Rideau-Rockcliffe Community Resource Asset Mapping Platform.

## Main Objectives & Core Application Logic

The primary objective of the RRCRC Asset Mapping Platform backend is to provide a robust, moderated, and version-controlled API for managing community resources in the Rideau-Rockcliffe area. It serves as the central data engine powering both a public-facing interactive map and a staff-only administrative dashboard.

### Core Workflows & Business Logic

1. **Community Submission & Moderation Flow**
   - **Public Submissions**: Community members (anonymous or authenticated) can submit new resources, propose updates to existing listings, or offer community assets (skills/programs).
   - **Spam Prevention**: Anonymous submissions are securely rate-limited based on a hashed IP tracking mechanism.
   - **Moderation Queue**: All community submissions initially land in a `pending_review` state. Moderators review these entries via the dashboard to either approve or reject them.

2. **Resource Versioning & Draft System**
   - To strictly preserve data integrity, the system employs a **Draft & Versioning Pattern**.
   - The `Resource` table acts as a thin permanent shell that holds a pointer (`current_approved_version_id`) to the active data.
   - When an update is suggested, a completely new `ResourceVersion` record is generated rather than mutating the original entry. Upon staff approval, the shell's pointer smoothly shifts to the new version. This isolates live public data from unauthorized tampering and maintains a full historical audit trail.

3. **Geospatial & Map Querying Flow**
   - The frontend's interactive map requires rapid delivery of geographic location pins.
   - The backend intercepts coordinate requests (latitude/longitude) and dynamically determines which active resources fall within a specific viewing radius. Using mathematical distance mapping (like Haversine formula approximation), it filters and dispatches highly optimized, lightweight payloads to render map nodes smoothly.

4. **Issue Ticketing Workflow**
   - Users who encounter map discrepancies (e.g., permanently closed locations, wrong hours) can submit an "Issue".
   - These reports generate organized tickets for the moderation team. Staff can investigate the claim, safely draft corrective updates against the resource, and resolve the ticket.

## Stack & Framework Details

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Framework   | Flask 3.0                                |
| ORM         | SQLAlchemy 2.0 + Flask-SQLAlchemy        |
| Database    | MySQL 8 (dev: SQLite via test config)    |
| Auth        | Flask-JWT-Extended (dual-token pattern)  |
| Passwords   | Flask-Bcrypt                             |
| Migrations  | Flask-Migrate (Alembic)                  |
| Deployment  | Docker + docker-compose (Handled by DevOps)|

This backend architecture operates exclusively on a Flask + SQLAlchemy ORM layer serving REST API endpoints. We handle all validation, database models, pagination, role-based access control, and routing logic before delivering serialized responses to clients. Given DevOps handles deployment, the backend developers are solely focused on Flask architecture and MySQL modeling.

---

## Detailed Project Structure & Files

The project follows a standard factory pattern structure using Blueprints for organization. 

```text
rrcrc_backend/
├── run.py                      # Application Entry Point
├── requirements.txt            # Dependency list (includes pytest)
├── .env.example                # Copy to .env and fill in secrets
├── pytest.ini                  # Pytest configuration
│
├── app/
│   ├── __init__.py             # Application factory `create_app` (initializes extensions, registers blueprints).
│   ├── config.py               # Development / Testing / Production configs (database URI, JWT configs).
│   ├── extensions.py           # Singletons matching the stack (db, jwt, bcrypt, migrate).
│   ├── models.py               # Defines all 18 SQLAlchemy ORM models covering Auth, Resources, & Workflow.
│   ├── utils.py                # Reusable logic: standardized response envelope, SLUG generation, decorators.
│   └── routes/
│       ├── __init__.py         # Gathers components and registers blueprints.
│       ├── auth.py             # Auth Blueprint: login, register, token refresh.
│       ├── resources.py        # Resources Blueprint: fetching map details, searching/filtering logic.
│       ├── categories.py       # Categories & Tags logic.
│       ├── submissions.py      # Community Submission workflows.
│       └── issues.py           # Ticket / Issues moderation + Admin Dashboard metrics.
│
└── tests/
    └── test_app.py             # Full integration test suite (uses SQLite in memory).
```

### Key Python Logic & Utilities (`app/utils.py`)
- **`ok()` and `err()` Envelopes**: Instead of building custom JSON objects in every route, these functions standardize the response so clients always expect a unified structured envelope. 
- **`paginate(query, page, limit)`**: Used extensively for search operations. Implements `query.paginate()` and caps the upper limit to prevent abusive querying against the MySQL database.
- **Role Decorators (`@require_roles`)**: Intercepts requests immediately checking the active JWT identity mapped over `User.query` to enforce functional permissions.
- **Slug Generation (`generate_unique_slug`)**: Recursively resolves string naming conflicts for resources (e.g. converting `Food Bank` to `food-bank-2` if duplicates exist).
- **Rate Limiting**: Hashed IP tracking blocks excessive unauthenticated operations on public submission endpoints.

---

## Quick Start (Local Development)

### 1. Clone and create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DB_*, SECRET_KEY, JWT_SECRET_KEY
```

### 3. Set up the Database

*Note: Production schemas and permissions are managed outside this repository in dedicated MySQL SQL Scripts.*

To start from scratch via Flask-Migrate using our SQLAlchemy models:

```bash
flask db init          # First time only
flask db migrate -m "Initial schema"
flask db upgrade       # Builds your 18 tables
```

### 4. Run the development server

```bash
FLASK_ENV=development python run.py
```

API is available at `http://localhost:5000/api/v1/`
Health check: `GET http://localhost:5000/health`

---

## Database Models & Relationships (`app/models.py`)

The application models 18 tables across three major domains:

### Domain 1: Authentication & Users 
- **`Role`** & **`User`** & **`UserRole`**: Forms a many-to-many relationship defining functional authorization levels (contributor, staff_editor, moderator, administrator). 
- **`PasswordResetToken`**: Tracks reset request links and hash expiry.

### Domain 2: Core Resources & Lookup 
- **`Resource`** & **`ResourceVersion`**: Implements a "Draft & Versioning" mechanism. The `Resource` table is a thin shell holding the latest `current_approved_version_id` while `ResourceVersion` contains actual fields (name, description). 
- **`ResourceLocation`**: Supports decimal Point latitude and longitude to hook into Haversine-based distance sphere filtering. Includes relationships to Contacts and Hours.
- **`Category`** & **`Tag`**: Organizes and references approved `ResourceVersions`.

### Domain 3: Workflows & Submissions
- **`Submission`**: Users submit updates or community assets, generating a version tagged `pending_review`.
- **`SubmissionReview`**: Captures who approved or rejected the listing and audit logs comment feedback.
- **`ReportedIssue`**: A ticketing system for mapping out inaccuracies. 

---

## Comprehensive API Overview

All routing is prefixed by `/api/v1/`.

### Authentication (`routes/auth.py`)
Uses the Dual-Token Pattern: a short lived (15 min) JWT `access_token` returned in JSON payload for Headers, and a 7-day `refresh_token` stored natively in an `HttpOnly` secure cookie.

| Method | Endpoint                          | Auth     | Role           | Logic Flow / Method Insight |
|--------|-----------------------------------|----------|----------------|------------------------------|
| POST   | `/auth/register`                  | None     | None           | Hashes via Bcrypt and stores a new User. Defaults with no RBAC roles assigned. |
| POST   | `/auth/login`                     | None     | None           | Generates auth cookie + JSON token block. Prevents enumeration queries. |
| POST   | `/auth/refresh`                   | Cookie   | None           | Uses cookie JWT validation to mint new access token. |
| POST   | `/auth/logout`                    | JWT      | None           | Issues signal to clear `HttpOnly` token logic on client domain. |

### Resource Management (`routes/resources.py`)
Public endpoints leverage extensive Haversine distance querying and Match-Against Boolean text searches.

| Method | Endpoint                          | Auth            | Logic Flow / Method Insight |
|--------|-----------------------------------|-----------------|------------------------------|
| GET    | `/resources/map`                  | None            | Calculates distance via `ST_Distance_Sphere` or fallback Haversine on lat/long yielding lightweight pointer lists. |
| GET    | `/resources`                      | None            | Filters out paginated views using categories, tags, types, or radial distances. |
| GET    | `/resources/slug/{slug}`          | None            | Extracts `ResourceVersion` details heavily optimized for public facing SEO pages. |
| POST   | `/resources`                      | staff_editor+   | Bypasses queue—direct creation of active Listing entities. |
| PUT    | `/resources/{id}`                 | staff_editor+   | Generates a replacement `ResourceVersion` pushing old models out. |
| DELETE | `/resources/{id}`                 | administrator   | Soft-delete flagged via `deleted_at` timestamp. |

### Moderation Submissions (`routes/submissions.py`)
Submissions branch dynamically: `new_resource` creates shells while `update_resource` generates diffs over existing `Resource` constraints.

| Method | Endpoint                          | Auth            | Logic Flow / Method Insight |
|--------|-----------------------------------|-----------------|------------------------------|
| POST   | `/submissions`                    | None (rate-ltd) | Anonymous submits get IP blocked if threshold breached (via `/utils/increment_rate_limit`). Models entered as `pending_review`. |
| GET    | `/submissions`                    | moderator+      | Pulls pending tasks across all categories. |
| POST   | `/submissions/{id}/review`        | moderator+      | Shifts payload to active, assigning `current_approved_version_id` to master `Resource` and mapping it. |

### Categories, Issues, & Dashboard (`routes/categories.py`, `issues.py`)
| Method | Endpoint                          | Auth            | Logic Flow / Method Insight |
|--------|-----------------------------------|-----------------|------------------------------|
| GET/POST/PUT | `/categories`               | staff_editor+   | Administers the foundational hierarchical lookups and icons. |
| POST   | `/issues`                         | None (rate-ltd) | Rate limited ticketing tracking bugs to resource map endpoints. |
| GET    | `/dashboard/stats`                | moderator+      | Complex Aggregation over SQL: computes stats for frontend analytical renders. |

---

## Role Based Permissions Architecture

We utilize an extensive decorator model relying on `@require_roles()` dynamically linked to the `users` and `roles` SQL tables:

- **Anonymous**: Rate-limited reads, submission ticket filing, and issue reporting.
- **Contributor**: Standard auth login, can view own submission queue metadata.
- **Staff Editor**: Can silently push live approved resources and categories mapping instantly over moderation queues.
- **Moderator**: Access to `/dashboard/` endpoints and can `Approve`/`Reject` tickets using the `submissions/<id>/review` routing logic payload.
- **Administrator**: Executes hard/soft deletes (Admin-Only API), manages User Role attachments, revokes/grants tokens.

---

## Backend Deployment & DevOps Note
Standard operation commands involve bridging Docker configurations `docker-compose up --build`. The compose file starts up `web` (Flask + Gunicorn scaling workers) and `db` (MySQL 8). Note that advanced deployment strategy, CI/CD, cluster mapping, or cloud environments are handled exclusively by the corresponding DevOps teams.

## Testing Setup
Unit testing uses integration pipelines routed through an in-memory SQLite sandbox bypassing MySQL bindings entirely.
```bash
FLASK_ENV=testing pytest tests/test_app.py -v
```
