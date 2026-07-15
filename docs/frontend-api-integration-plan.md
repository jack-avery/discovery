# Frontend API Integration Plan

**Project:** RRCRC Community Asset Mapping Platform  
**Status:** Canonical reference for all future frontend–backend integration work  
**Last updated:** July 2026  
**Source of truth:**
- Backend API documentation (routes, models, utilities and API contracts) — production contract
- Discover Experience & Workspace Design Specification — authoritative UX document

---

## 1. Architecture Overview

### Current frontend architecture

The frontend is a **Vite + React 19 + React Router 7** single-page application organized by domain:

```
front/src/
├── app/           # Router, layouts, global providers (Search, Selection, Sidebar)
├── pages/         # Route entry points — wire hooks and layouts
├── features/      # Domain UI (discover, resources, submissions, filters, map)
├── hooks/         # React data hooks (loading / error / data state)
├── services/      # Backend access layer
├── types/         # Shared TypeScript DTOs
├── components/    # Shared UI primitives (no domain logic)
└── utils/         # Pure helpers (filter labels, empty-reason logic)
```

**Key architectural patterns already in place:**

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Route entry | `pages/` | Compose hooks, providers, and feature layouts per route |
| Domain UI | `features/` | Presentational and interactive components scoped to a feature |
| Data hooks | `hooks/` | Mount-time fetching, loading/error state, expose data to pages |
| API access | `services/` | HTTP calls, response handling, domain-specific fetch functions |
| HTTP client | `services/api.ts` | Generic `fetch` wrapper (`get`, `post`, `put`, `patch`, `delete`) |
| Client state | `app/providers/` | Cross-cutting UI state (`SearchProvider`, `SelectionProvider`, `SidebarProvider`) |
| Types | `types/` | Frontend interfaces consumed by hooks and components |

**Current integration status:** The layering is correct, but **no live backend calls are wired**. Categories, tags, and map pins load from mock files. Resources, resource detail, submissions, and auth are UI shells. `services/api.ts` exists but is **not imported by any runtime code**.

**Environment:** `VITE_API_URL` (default `http://localhost:5000`) is the backend base URL. Map tile configuration (`VITE_MAP_*`) is separate from the backend API.

### Current backend architecture

The backend is a **Flask 3.0 REST API** (documented in the API PDF; **not present in this repository**). The `docker-compose.yml` contains a `# TODO: develop and insert the backend here` placeholder. The `db/schema.sql` in this repo is a legacy placeholder schema and **does not reflect** the 18-table production model described in the API documentation.

**Backend stack (from API documentation):**

| Layer | Technology |
|-------|------------|
| Framework | Flask 3.0 |
| ORM | SQLAlchemy 2.0 + Flask-SQLAlchemy |
| Database | MySQL 8 |
| Auth | Flask-JWT-Extended (dual-token: 15-min access header + 7-day HttpOnly refresh cookie) |
| Passwords | Flask-Bcrypt |
| Migrations | Flask-Migrate (Alembic) |

**Backend structure:**

```
app/
├── __init__.py      # create_app, blueprint registration, /health
├── config.py        # JWT, DB URI
├── extensions.py    # db, jwt, bcrypt, migrate
├── models.py        # 18 ORM models
├── utils.py         # ok/err envelopes, paginate, slug, RBAC, rate limiting
└── routes/
    ├── auth.py
    ├── resources.py
    ├── categories.py  (+ tags blueprint)
    └── submissions.py
```

**Core backend patterns:**

- **Draft & versioning:** `Resource` is a thin shell with `current_approved_version_id` pointing to `ResourceVersion` content. Public reads always resolve the approved version.
- **Response envelope:** All routes return `{ status, message, data }` or `{ status, message, errors? }`.
- **RBAC:** `@require_roles()` decorator checks JWT identity against `staff_editor`, `moderator`, `administrator`.
- **Geospatial:** Haversine distance filtering on map queries (no PostGIS).
- **Rate limiting:** SHA-256 hashed IP, 5 anonymous submissions per hour.

**Route prefix:** Blueprints register at `/auth`, `/resources`, `/categories`, `/tags`, `/submissions`. There is **no `/api/v1` prefix** in the production contract. `VITE_API_URL` should point to the host root (e.g. `http://localhost:5000`), and service calls should use paths like `/resources/map`.

### Intended data flow

```
Backend API (Flask routes)
        ↓
API Service Layer (services/*.ts)
        ↓
React Hooks (hooks/use*.ts)
        ↓
State Management (providers + local component state)
        ↓
UI Components (features/*, pages/*, components/*)
```

| Layer | Responsibility | Where code lives |
|-------|----------------|------------------|
| **Backend API** | Persistence, validation, auth, business rules, pagination, geospatial queries | External Flask app (production contract in API PDF) |
| **API Service Layer** | Build URLs, attach auth headers/cookies, parse envelope, map backend shapes to frontend types, throw typed errors | `services/api.ts`, `services/resources/`, future `services/auth/`, `services/submissions/` |
| **React Hooks** | Trigger fetches, manage `isLoading` / `error` / data, re-fetch on filter changes, expose stable interface to pages | `hooks/useCategories.ts`, `useTags.ts`, `useResourceMap.ts`, `useResources.ts`, future hooks |
| **State Management** | Cross-route UI state (search query, selected resource, sidebar open, workspace stack) | `app/providers/`, page-level `useState`, future workspace persistence (URL params / sessionStorage per UX spec) |
| **UI Components** | Render data, handle user input, show loading/empty/error states | `features/`, `pages/`, `components/` |

**Rule:** Components and hooks must **never** call `fetch()` or `axios` directly. All HTTP goes through `services/`.

---

## 2. Endpoint Inventory

Base URL: `{VITE_API_URL}` (e.g. `http://localhost:5000`).  
All authenticated routes expect `Authorization: Bearer <access_token>` unless noted.

### Health (application factory, not blueprints)

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| GET | `/health` | Liveness check | None | — | None | Dev/ops health probe only | Low | Not integrated |
| GET | `/health/db` | Database connectivity check | None | — | None | Dev/ops health probe only | Low | Not integrated |

### Authentication — `/auth`

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| POST | `/auth/register` | Create user account | None | — | None | Optional staff self-registration (if enabled) | Low | Not integrated |
| POST | `/auth/login` | Issue access token + refresh cookie | None | — | `StaffSignInPage` (stub empty state) | Staff Sign In form → store access token, rely on HttpOnly refresh cookie | High | Not integrated |
| POST | `/auth/refresh` | Mint new access token from refresh cookie | Refresh cookie | — | None | Silent token refresh in API client on 401 | High | Not integrated |
| POST | `/auth/logout` | Clear refresh cookie | None | — | None | Staff sign-out action | Medium | Not integrated |

### Resources — `/resources`

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| GET | `/resources/map` | Geo-filtered map pins within radius | None | — | `useResourceMap` → `mapService.ts` (mock) | Discover map markers; requires `lat`, `lng`, optional `radius_km` | **Critical** | Mock only |
| GET | `/resources` | Paginated, filterable resource list | None | — | `useResources` (returns `[]`) | Discover results list, Resources page | **Critical** | Stub only |
| GET | `/resources/<resource_id>` | Full resource detail by ID | None | — | `ResourceDetailPanel` (empty state) | Resource detail on marker/list selection | **Critical** | Not integrated |
| GET | `/resources/slug/<slug>` | Full resource detail by slug | None | — | None | SEO-friendly detail URLs (future) | Medium | Not integrated |
| POST | `/resources` | Staff direct resource creation | JWT | `staff_editor`, `administrator` | None | Staff admin resource creation (post-auth) | Medium | Not integrated |
| PUT | `/resources/<resource_id>` | Staff direct resource update (new version) | JWT | `staff_editor`, `administrator` | None | Staff admin resource editing | Medium | Not integrated |
| DELETE | `/resources/<resource_id>` | Soft-delete resource | JWT | `administrator` | None | Staff admin deletion | Low | Not integrated |

**`GET /resources/map` query params:** `lat` (required), `lng` (required), `radius_km` (optional, default 10, max 50).

**`GET /resources` query params:** `category_id`, `tag_id`, `resource_type`, `search`, `page`, `per_page`.

### Categories — `/categories`

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| GET | `/categories` | Hierarchical active category tree | None | — | `useCategories` → `catalog.ts` (mock) | Category browser, filter dropdowns, quick chips, marker colors | **Critical** | Mock only |
| POST | `/categories` | Create category | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff category management | Low | Not integrated |
| PUT | `/categories/<id>` | Update category | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff category management | Low | Not integrated |
| DELETE | `/categories/<id>` | Soft-delete category (`is_active=0`) | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff category management | Low | Not integrated |

### Tags — `/tags`

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| GET | `/tags` | List active tags | None | — | `useTags` → `catalog.ts` (mock) | Advanced filters (tags dropdown) | **Critical** | Mock only |
| POST | `/tags` | Create tag | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff tag management | Low | Not integrated |
| PUT | `/tags/<id>` | Update tag | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff tag management | Low | Not integrated |
| DELETE | `/tags/<id>` | Soft-delete tag | JWT | `staff_editor`, `moderator`, `administrator` | None | Staff tag management | Low | Not integrated |

### Submissions — `/submissions`

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| POST | `/submissions` | Public community submission (rate-limited) | Optional JWT | — (anon rate-limited) | `SubmitResourcePanel`, `RequestResourceUpdatePanel` (stubs) | Submit Resource + Request Update forms | High | Not integrated |
| GET | `/submissions` | Paginated moderation queue | JWT | `moderator`, `administrator` | `SubmissionsPanel` (stub empty state) | Staff submissions queue on `/submissions` | High | Not integrated |
| GET | `/submissions/<id>` | Full submission with proposed version + review history | JWT | `moderator`, `administrator` | None | Submission detail / review screen | High | Not integrated |
| POST | `/submissions/<id>/review` | Approve or reject submission | JWT | `moderator`, `administrator` | None | Moderation approve/reject actions | High | Not integrated |
| DELETE | `/submissions/dev/flushratelimits` | Clear rate-limit table (dev only) | None | — | None | Local development/testing only | Low | Not integrated |

### Documented in README Backend.md but NOT in API PDF

These endpoints are referenced in supplementary documentation. The `ReportedIssue` model exists in the backend models, but **no route implementation appears in the API PDF**. Treat as **planned / unverified** until confirmed in a backend release.

| HTTP Method | Route | Purpose | Auth | Roles | Current Frontend Usage | Planned Frontend Usage | Priority | Status |
|-------------|-------|---------|------|-------|------------------------|------------------------|----------|--------|
| POST | `/issues` | Public issue report (rate-limited) | None | — | None | Report Issue (future UX spec workspace stack item) | Medium | **Not in API PDF** |
| GET | `/dashboard/stats` | Moderation dashboard aggregates | JWT | `moderator+` | None | Staff dashboard metrics | Low | **Not in API PDF** |

---

## 3. Frontend Feature Mapping

### Discover Map

| Aspect | Detail |
|--------|--------|
| **Feature** | Interactive map with clustered markers |
| **Backend endpoint(s)** | `GET /resources/map` (`lat`, `lng`, `radius_km`) |
| **Models returned** | `data.pins[]` — `{ resource_id, slug, name, resource_type, lat, lng, is_virtual, category_name, color_hex, icon_identifier, distance_km }`; `data.count` |
| **Service file** | `services/resources/mapService.ts` |
| **Hook** | `hooks/useResourceMap.ts` |
| **Components** | `MapStage`, `MapContainer`, `LeafletMap`, `ResourceMapMarkers`, `MarkerClusterLayer` |
| **Current status** | Mock data via `mock-map-items.ts`. Filters (search, categories, tags) collected in `DiscoverPage` but **not passed** to map hook. |
| **Future improvements** | Pass map centre from viewport; re-fetch on pan/zoom; wire filter params once backend supports them on map endpoint; use `color_hex` / `icon_identifier` from API instead of `categoryIcons.ts` hardcoding |

### Discover Filters (Search, Categories, Tags)

| Aspect | Detail |
|--------|--------|
| **Feature** | Floating filter bar with search, multi-select categories, multi-select tags |
| **Backend endpoint(s)** | `GET /categories` (tree), `GET /tags` (list); filter application via `GET /resources` and `GET /resources/map` |
| **Models returned** | Category tree nodes; tag list items |
| **Service file** | `features/resources/catalog.ts` (today); should move to `services/categoryService.ts`, `services/tagService.ts` |
| **Hook** | `useCategories`, `useTags` |
| **Components** | `FilterBar`, `CategoryDropdown`, `TagsDropdown`, `SearchBar` |
| **Current status** | Categories/tags load from mock. Filter state is local to `DiscoverPage` and disconnected from data hooks. "Filters" button is a disabled placeholder. |
| **Future improvements** | Per UX spec: collapsed advanced filters, quick category chips when workspace collapsed; map slug-based filters must translate to backend `category_id` / `tag_id` |

### Discover Results List (UX spec — not yet built)

| Aspect | Detail |
|--------|--------|
| **Feature** | Virtualized results list below filters, synchronized with map |
| **Backend endpoint(s)** | `GET /resources` (`search`, `category_id`, `tag_id`, `resource_type`, `page`, `per_page`) |
| **Models returned** | `data.resources[]` (summary), `data.pagination` |
| **Service file** | Future `services/resourceService.ts` |
| **Hook** | `useResources` (stub) |
| **Components** | Not yet implemented in Discover workspace; `ResourceList` / `ResourceCard` exist on `/resources` page |
| **Current status** | UX spec requires results list in Discover workspace. `ResourceList` exists only on `/resources` route (not in spec nav). `useResources` returns empty array. |
| **Future improvements** | Build workspace results panel per UX spec; share `useResources` between Discover and `/resources` if `/resources` is retained |

### Resource Detail

| Aspect | Detail |
|--------|--------|
| **Feature** | Detail view on marker or list item selection |
| **Backend endpoint(s)** | `GET /resources/<resource_id>` or `GET /resources/slug/<slug>` |
| **Models returned** | `data.version` — full `to_dict_full()` with nested `categories[]`, `tags[]`, `locations[]`, `contacts[]`, `hours[]` |
| **Service file** | Future `services/resourceService.ts` |
| **Hook** | Future `useResourceDetail(resourceId)` |
| **Components** | `ResourceDetailPanel`, `SelectionProvider` |
| **Current status** | Panel opens on selection but shows empty state. No fetch by `selectedResourceId`. |
| **Future improvements** | Per UX spec: push onto workspace navigation stack (not overlay recreation); restore state on back |

### Resources Page (`/resources`)

| Aspect | Detail |
|--------|--------|
| **Feature** | Standalone paginated resource list with search and filters |
| **Backend endpoint(s)** | `GET /resources`, `GET /categories`, `GET /tags` |
| **Models returned** | Resource summaries + pagination; category tree; tag list |
| **Service file** | `catalog.ts`, future `resourceService.ts` |
| **Hook** | `useResources`, `useCategories`, `useTags` |
| **Components** | `ResourcesPage`, `ResourceList`, `ResourceCard`, `PageShell` |
| **Current status** | Page exists but not linked in sidebar. List always empty. `ResourceCard` "View details" button is non-functional. |
| **Future improvements** | Decide whether to keep this route (not in UX spec nav) or fold into Discover workspace results list |

### Submit Resource

| Aspect | Detail |
|--------|--------|
| **Feature** | Public form to submit a new community resource (logical multi-contribution submission) |
| **Backend endpoint(s)** | `POST /submissions` (one request per contribution; orchestrated by `submissionService`) |
| **Models returned** | `data.{ submission_id, resource_id, proposed_version_id }` |
| **Service file** | `services/submissionService.ts` |
| **Mappers** | `features/submissions/mappers/` (Existing Resource, Skills/Services, Event) |
| **Hook** | UI calls `submitSubmission(draft)` from the review sheet (no dedicated hook required) |
| **Components** | `SubmitResourcePage`, `SubmitResourceExperience`, contribution editors, review + success panels |
| **Current status** | Connected to public POST. Fallback field mapping documented in `docs/submit-resource-backend-recommendations.md`. |
| **Future improvements** | Batch submission API; first-class Event fields; persist consent / preferred contact; PDF / email summary |

### Request Resource Update

| Aspect | Detail |
|--------|--------|
| **Feature** | Public form to propose edits to an existing resource |
| **Backend endpoint(s)** | `POST /submissions` (`submission_type: "update_resource"`, requires `resource_id`) |
| **Models returned** | Same as submit |
| **Service file** | Future `services/submissionService.ts` |
| **Hook** | Future `useRequestUpdate()` |
| **Components** | `RequestResourceUpdatePage`, `RequestResourceUpdatePanel` |
| **Current status** | Stub empty state: "Update request form coming soon" |
| **Future improvements** | Resource lookup/search to populate `resource_id`; diff-style form for changed fields |

### Staff Sign In

| Aspect | Detail |
|--------|--------|
| **Feature** | Staff authentication |
| **Backend endpoint(s)** | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| **Models returned** | `data.{ access_token, user }` + HttpOnly refresh cookie |
| **Service file** | Future `services/authService.ts` |
| **Hook** | Future `useAuth()` |
| **Components** | `StaffSignInPage` |
| **Current status** | Stub empty state: "Staff authentication not available" |
| **Future improvements** | Auth provider; protected routes for `/submissions`; conditional staff nav |

### Submissions Moderation (`/submissions`)

| Aspect | Detail |
|--------|--------|
| **Feature** | Staff moderation queue |
| **Backend endpoint(s)** | `GET /submissions`, `GET /submissions/<id>`, `POST /submissions/<id>/review` |
| **Models returned** | Paginated submission summaries; full submission with `proposed_version` + `review_history` |
| **Service file** | Future `services/submissionService.ts` |
| **Hook** | Future `useSubmissions()`, `useSubmissionDetail()` |
| **Components** | `SubmissionsPage`, `SubmissionsPanel` |
| **Current status** | Route exists but not in sidebar nav. Stub empty state. No auth gate. |
| **Future improvements** | Protected route; approve/reject UI; link from staff nav after sign-in |

### Legacy Map Page (`/map`)

| Aspect | Detail |
|--------|--------|
| **Feature** | Alternate map view with single-select category chip filter |
| **Backend endpoint(s)** | Same as Discover Map |
| **Service file** | `mapService.ts` |
| **Hook** | `useResourceMap`, `useCategories` |
| **Components** | `MapPage`, `CategoryFilter` |
| **Current status** | Legacy route, not in sidebar or UX spec. Category filter state not applied to map data. |
| **Future improvements** | Deprecate or redirect to Discover once workspace is complete |

### Home Page (UX spec — not yet built)

| Aspect | Detail |
|--------|--------|
| **Feature** | Landing / onboarding page at `/` |
| **Backend endpoint(s)** | None required (static content); optional CMS endpoint in future |
| **Current status** | Not implemented. Discover currently occupies `/`. |
| **Future improvements** | Implement per UX spec Phase 1; move Discover to `/discover` |

---

## 4. Mock Data Inventory

| File | Mock Object | Backend Replacement | Removal Strategy | Dependency Order |
|------|-------------|---------------------|------------------|------------------|
| `features/resources/mock-data.ts` | `mockCategories` (8 flat categories) | `GET /categories` (hierarchical tree) | Replace `catalog.ts` fetcher; delete file after categories integration verified | **1** — no downstream dependency |
| `features/resources/mock-data.ts` | `mockTags` (8 tags) | `GET /tags` | Replace `catalog.ts` fetcher; delete file after tags integration verified | **1** — parallel with categories |
| `services/resources/mock-map-items.ts` | `mockMapItems` (8 Ottawa-area pins) | `GET /resources/map` | Replace `mapService.ts` body; delete file after map integration verified | **2** — depends on categories for filter translation |
| `features/map/categoryIcons.ts` | Hardcoded slug → hex color map (8 entries) | `GET /categories` (`color_hex`, `icon_identifier` per node) | Use API-provided `color_hex` / `icon_identifier` on map pins; keep file as fallback only if API field missing | **2** — after categories integration |
| `features/map/config/mapBehaviour.ts` | Hardcoded map centre `[45.4445, -75.6392]` | Map centre from user viewport / `lat`+`lng` query params | Retain as **initial default** only; derive live centre from Leaflet map instance | **2** — used alongside map integration |
| `hooks/useResources.ts` | Returns `[]` (no mock resources) | `GET /resources` | Implement real fetch in hook via `resourceService.ts` | **3** — after categories/tags for ID translation |
| `features/resources/catalog.ts` | Pass-through to mock files | `GET /categories`, `GET /tags` | Rewrite fetchers to call API; move to `services/` | **1** |
| `services/resources/mapService.ts` | Pass-through to mock | `GET /resources/map` | Rewrite fetcher to call API with map centre + radius | **2** |

**No mock data exists for:** submissions, auth, resource detail, or staff moderation.

**Removal order summary:**

1. Categories + tags (unblocks filter ID translation)
2. Map pins (unblocks Discover visualization)
3. Resource list + detail (unblocks results and detail panel)
4. Submissions + auth (staff workflows)

---

## 5. Frontend Service Architecture

### Current structure

```
services/
├── api.ts                          # Generic HTTP client (unused at runtime)
└── resources/
    ├── mapService.ts               # Map pin fetcher (mock)
    └── mock-map-items.ts           # Mock data (to be removed)
```

`features/resources/catalog.ts` acts as an informal service layer for categories/tags but lives outside `services/`.

### Recommended structure

```
services/
├── api.ts                  # HTTP client + envelope parsing + auth injection
├── authService.ts          # login, logout, refresh, token storage helpers
├── categoryService.ts      # GET /categories (tree flattening if needed)
├── tagService.ts           # GET /tags
├── resourceService.ts      # GET /resources, GET /resources/:id, GET /resources/slug/:slug
├── mapService.ts           # GET /resources/map (move from resources/ subfolder)
└── submissionService.ts    # POST /submissions, GET /submissions, review actions
```

### Responsibilities

| File | Responsibility |
|------|----------------|
| `api.ts` | Base `fetch` wrapper; `VITE_API_URL` prefix; JSON serialization; `ApiError` on non-2xx; **envelope unwrapping** (`status === "success"` → return `data`); query-string `params` support; `credentials: 'include'` for refresh cookie; optional Bearer header injection; 401 → refresh → retry |
| `authService.ts` | `login(email, password)`, `logout()`, `refreshAccessToken()`; in-memory access token storage; expose `getAccessToken()` for api client |
| `categoryService.ts` | `fetchCategories()` → call `GET /categories`; optionally flatten tree for dropdown components while preserving `category_id` |
| `tagService.ts` | `fetchTags()` → call `GET /tags` |
| `resourceService.ts` | `fetchResources(filters)`, `fetchResourceById(id)`, `fetchResourceBySlug(slug)`; map frontend slug filters to `category_id`/`tag_id` before request |
| `mapService.ts` | `fetchMapResources({ lat, lng, radiusKm, ...filters })` → call `GET /resources/map`; adapt pin shape to `ResourceMapItem` at service boundary |
| `submissionService.ts` | `submitResource(payload)`, `requestUpdate(payload)`, `fetchSubmissions(filters)`, `fetchSubmission(id)`, `reviewSubmission(id, decision)` |

### Recommended improvements (genuinely beneficial only)

1. **Envelope adapter in `api.ts`** — The backend uses `{ status: "success"|"error", message, data }`. The frontend `types/api.ts` currently defines `{ ok: true|false }`. Add an unwrapping helper in the service layer that normalizes the backend contract. Do **not** change backend responses.

2. **Query params in `api.ts`** — Comments in `useResources.ts` and `mapService.ts` reference `{ params: filters }` but the client does not implement this. Add `URLSearchParams` serialization.

3. **Move `catalog.ts` into `services/`** — `features/` should contain UI only. Category/tag fetchers belong in `categoryService.ts` / `tagService.ts`.

4. **Adapter functions at service boundary** — Backend uses numeric `resource_id`/`category_id`/`tag_id`; frontend types use string `id` fields and slug-based filters. Convert at the service layer so components remain unchanged during early integration.

5. **Do not split `api.ts` into a separate `apiClient.ts`** — Renaming adds churn with no functional benefit. Extend the existing file.

---

## 6. Type Mapping

This section documents how backend models map to existing frontend interfaces. **No new types are proposed here.**

### API envelope

| Backend (API PDF) | Frontend (`types/api.ts`) | Where used |
|-------------------|---------------------------|------------|
| `{ status: "success", message, data }` | `ApiSuccess<T>` with `ok: true, data: T` | **Mismatch** — `api.ts` not wired; envelope shape differs |
| `{ status: "error", message, errors? }` | `ApiErrorBody` with `ok: false, error: string` | **Mismatch** — field names differ (`message` vs `error`; backend has optional `errors` object) |

**Action required at integration:** Normalize in `api.ts` unwrapping layer. Do not duplicate envelope types in feature code.

### Category

| Backend (`Category` model / `GET /categories` tree node) | Frontend (`types/category.ts`) | Where used |
|----------------------------------------------------------|-------------------------------|------------|
| `category_id` (int) | `id` (string) | `CategoryDropdown`, `CategoryFilter`, `FilterBar`, `ResourceCard` |
| `slug` | `slug` | Filter state (`selectedCategories` stores slugs) |
| `name` | `name` | Display labels |
| `parent_category_id` | — (not modeled) | Backend returns hierarchical tree; frontend expects flat list |
| `icon_identifier`, `color_hex`, `display_order`, `description`, `children[]` | — (not modeled) | Available from API; needed for map markers and UX spec category browser |

**Consolidation:** Single `Category` interface in `types/category.ts`. Extend with optional fields only when a consuming component needs them (at implementation time, not preemptively).

### Tag

| Backend (`Tag` model / `GET /tags`) | Frontend (`types/tag.ts`) | Where used |
|-------------------------------------|---------------------------|------------|
| `tag_id` (int) | `id` (string) | `TagsDropdown`, `TagFilter`, `ResourceCard` |
| `slug` | `slug` | Filter state (`selectedTags` stores slugs) |
| `name` | `name` | Display labels |
| `is_active` | — (not modeled) | Backend filters to active; frontend does not check |

### Resource (list / summary)

| Backend (`to_dict_summary()` / `GET /resources` item) | Frontend (`types/resource.ts`) | Where used |
|-------------------------------------------------------|-------------------------------|------------|
| `resource_id` (int) | `id` (string) | `ResourceList`, `ResourceCard` |
| `name` | `name` | Display |
| `slug` | — (not on `Resource`) | Available from API; used in map/detail |
| `resource_type` | — (not modeled) | Backend enum: Organization, Program, Service, etc. |
| `image_url` | — (not modeled) | Card thumbnails (future) |
| `is_active`, `last_verified_at` | — (not modeled) | Trust indicators (future) |
| `categoryId` (single string) | `categoryId` | **Mismatch** — backend summary does not include category; detail version has `categories[]` |
| `description`, `address`, `hours`, `phone` | same fields | List card display; summary endpoint may not include all |
| `tagIds` | `tagIds` | **Mismatch** — not in summary; in detail `tags[]` |
| `status` / `moderation_status` | `ResourceStatus` | **Mismatch** — backend uses `pending_review`, `approved`, `rejected`, `needs_clarification`; frontend uses `published`, `pending`, `rejected` |

### Resource map pin

| Backend (`GET /resources/map` pin) | Frontend (`types/resource-map.ts`) | Where used |
|------------------------------------|-----------------------------------|------------|
| `resource_id` (int) | `id` (string) | `ResourceMapMarkers`, `SelectionProvider` |
| `slug` | `slug` | Detail fetch (future) |
| `name` | `name` | Marker popup / tooltip |
| `lat`, `lng` (flat) | `location.latitude`, `location.longitude` | **Structural mismatch** — nested vs flat |
| `category_name` | `categorySlug` | **Semantic mismatch** — name vs slug |
| `color_hex`, `icon_identifier` | — (uses `categoryIcons.ts` instead) | Marker styling |
| `distance_km` | `distanceMeters` | **Unit mismatch** — km vs metres |
| `resource_type`, `is_virtual` | — (not modeled) | Detail / popup (future) |

### Resource detail (no dedicated frontend type)

| Backend (`to_dict_full()` on `GET /resources/<id>`) | Frontend | Where used |
|-----------------------------------------------------|----------|------------|
| Full version fields + nested `categories[]`, `tags[]`, `locations[]`, `contacts[]`, `hours[]` | No dedicated detail interface; `Resource` is a flat partial | `ResourceDetailPanel` (stub) |

**Note:** Detail integration will require either extending `Resource` or introducing a detail type at implementation time. This plan does not define that type.

### Duplicate / divergent interfaces to consolidate

| Issue | Files involved | Recommendation |
|-------|----------------|----------------|
| Map pin vs resource list identity | `ResourceMapItem.id` vs `Resource.id` | Both represent `resource_id`; ensure `SelectionProvider` uses consistent ID format (stringified int) |
| Category slug in filters vs category ID in API | `DiscoverPage` state (slugs) vs `GET /resources` params (`category_id`) | Service-layer slug → ID lookup using categories cache |
| Tag slug in filters vs tag ID in API | Same pattern | Service-layer slug → ID lookup using tags cache |
| `catalog.ts` vs `types/category.ts` | Informal duplication of fetch + type | Move fetch to `services/`; single type source in `types/` |
| `ResourceStatus` vs backend `moderation_status` | `types/resource.ts` | Align values at integration time; do not maintain two enums |

---

## 7. Integration Roadmap

Each phase is independently deployable: the app remains functional (with graceful empty/error states) at every step.

### Phase 1 — Foundation + Read-Only Discovery Data

**Scope:** API client hardening, categories, tags, map pins, resource list.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Extend `api.ts` (envelope, params, credentials) | All | Every subsequent integration |
| Wire categories | `GET /categories` | Filter dropdowns, slug→ID translation |
| Wire tags | `GET /tags` | Tag filter dropdown |
| Wire map pins | `GET /resources/map` | Discover map with real data |
| Wire resource list | `GET /resources` | Results list, `/resources` page |
| Remove mock files | — | `mock-data.ts`, `mock-map-items.ts` |

**Why first:** Read-only public endpoints require no auth. Unblocks the primary user journey (discover resources on map). Establishes the service → hook → component pattern and flushes out type-mapping issues early.

**Deployable state:** Discover shows real markers; filters can be wired incrementally; list may show results on `/resources`.

### Phase 2 — Resource Detail + Filter Wiring

**Scope:** Detail panel, connect filter state to API, map re-fetch on viewport change.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Wire resource detail | `GET /resources/<id>` | `ResourceDetailPanel` content |
| Connect Discover filters to map + list | `GET /resources/map`, `GET /resources` | Search/category/tag affect results |
| Map centre from viewport | `GET /resources/map` (`lat`, `lng`, `radius_km`) | Accurate geo queries |
| Use API `color_hex` / `icon_identifier` | `GET /categories`, map pins | Remove `categoryIcons.ts` dependency |

**Why second:** Depends on Phase 1 data (category/tag ID translation, working API client). Detail fetch only needs a `resource_id` from map/list selection.

**Deployable state:** Full read-only discovery loop: filter → map updates → select → see details.

### Phase 3 — Public Submissions

**Scope:** Submit Resource and Request Update forms.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Submit new resource form | `POST /submissions` (`new_resource`) | `/submit` page |
| Request update form | `POST /submissions` (`update_resource`) | `/request-update` page |
| Rate-limit error handling | 429 responses | User feedback on anonymous limits |

**Why third:** Forms are independent of discovery data flow. Public POST endpoints require no auth. Can ship before staff workflows.

**Deployable state:** Community members can submit resources and update requests.

### Phase 4 — Staff Authentication

**Scope:** Login, token management, protected routes.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Staff sign-in form | `POST /auth/login` | Access token + refresh cookie |
| Token refresh | `POST /auth/refresh` | Session persistence |
| Sign out | `POST /auth/logout` | Clean session end |
| Auth provider + protected routes | — | Gate `/submissions` |

**Why fourth:** Auth is needed for moderation but not for public discovery or submissions. Implementing auth before submissions moderation would add complexity without user-visible value.

**Deployable state:** Staff can sign in; protected routes enforced.

### Phase 5 — Staff Moderation

**Scope:** Submissions queue, review actions.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Submissions list | `GET /submissions` | `/submissions` page |
| Submission detail | `GET /submissions/<id>` | Review screen |
| Approve / reject | `POST /submissions/<id>/review` | Moderation actions |

**Why fifth:** Requires auth (Phase 4). Completes the community submission → moderation loop.

**Deployable state:** Full submission lifecycle.

### Phase 6 — UX Spec Shell (Phase 1 per UX document)

**Scope:** Navigation rail, workspace stack, Home page, route changes.

| Task | Endpoints | Enables |
|------|-----------|---------|
| Home page at `/` | None (static) | Onboarding |
| Move Discover to `/discover` | Existing read endpoints | UX spec routing |
| Collapsible nav rail | None | UX spec navigation |
| Workspace navigation stack | Existing read endpoints | State-preserving detail push/pop |
| Quick category chips | `GET /categories` | Collapsed workspace UX |
| Results list in workspace | `GET /resources` | UX spec results panel |

**Why last:** Per UX spec: "No functionality changes beyond wiring existing interactions into the new shell." Backend integration should be stable before restructuring navigation and layout. Minimizes refactor risk.

**Deployable state:** UX spec-compliant shell with fully integrated backend.

### Phase 7 — Staff Admin + Future Features (deferred)

| Task | Endpoints | Notes |
|------|-----------|-------|
| Staff direct resource CRUD | `POST/PUT/DELETE /resources` | Staff editor/admin flows |
| Category/tag admin | `POST/PUT/DELETE /categories`, `/tags` | Staff management |
| Report Issue | `POST /issues` (if/when backend ships) | UX spec future stack item |
| Dashboard stats | `GET /dashboard/stats` (if/when backend ships) | Staff analytics |

---

## 8. Backend Gaps

Only gaps that materially affect scalability, performance, or frontend simplicity are listed.

### Required before implementation

| Limitation | Why it matters | Suggested change | Priority |
|------------|----------------|------------------|----------|
| **Map endpoint requires centre point + radius, not viewport bounds** | UX spec requires querying visible map area on pan/zoom. Radius-from-centre is imprecise for rectangular viewports and forces re-fetch logic that does not match user perception. | Add optional `north`, `south`, `east`, `west` (or `bbox`) params to `GET /resources/map` as an alternative to `radius_km`. Keep `radius_km` for backward compatibility. | **High** — confirm with backend team before building viewport re-fetch |
| **`GET /resources` accepts single `category_id` and `tag_id`, not arrays** | UX spec requires multi-select categories and tags. Frontend filter state is multi-select by design. | Add `category_ids[]` and `tag_ids[]` query params (OR semantics). Alternatively, confirm whether repeated params (`category_id=1&category_id=2`) are supported. | **High** — blocks multi-select filters without client-side over-fetch + filter |
| **`GET /resources` filter uses numeric IDs, not slugs** | Frontend filter state stores slugs. Requires categories/tags to be loaded first and cached for translation. Acceptable if documented, but adds client complexity and coupling. | **Option A (frontend-only):** Slug→ID translation in service layer (no backend change). **Option B (backend):** Accept `category_slug` / `tag_slug` params. Option A is sufficient for launch; Option B reduces frontend complexity at scale. | Medium — solvable on frontend; backend change is a simplification, not a blocker |
| **API envelope mismatch** | Frontend `types/api.ts` does not match backend `status`/`message`/`data` contract. | **Frontend fix only** (normalize in `api.ts`). No backend change needed. | **High** — must fix in Phase 1 |

### Nice-to-have future improvements

| Limitation | Why it matters | Suggested change | Priority |
|------------|----------------|------------------|----------|
| **`GET /resources/map` does not accept `search`, `category_id`, or `tag_id`** | Map and list can show different results under active filters. Requires client-side filtering of pins or separate list-only results. | Add filter params to map endpoint so map and list stay synchronized. | Medium |
| **No `POST /issues` route in API PDF** | UX spec lists Report Issue as a future workspace stack item. `ReportedIssue` model exists. | Implement `POST /issues` per README Backend.md contract. | Low (future feature) |
| **No `GET /dashboard/stats` route in API PDF** | Staff analytics mentioned in README. | Implement when staff dashboard UI is scoped. | Low |
| **Resource list summary lacks category/tag info** | `ResourceCard` resolves category/tag names by ID lookup. Works but requires categories/tags cache on every list render. | Include primary `category_name` and `tag_names[]` in `to_dict_summary()`. | Low |
| **No `/api/v1` version prefix** | If API versioning is needed for future breaking changes. | Add version prefix at reverse proxy or blueprint level. Not needed for initial launch. | Low |
| **Advanced filters in UX spec** (Accessibility, Languages, Cost, Availability, Audience, Open Now) | Not modeled as filter params on `GET /resources`. Tags may partially cover this. | Add facet/filter params or dedicated metadata endpoint when data model supports them. | Low (UX spec collapsed-by-default; defer until data exists) |

---

## 9. Technical Debt

Only items evidenced by the current repository and documentation.

### Frontend technical debt

| Item | Evidence | Impact |
|------|----------|--------|
| `api.ts` unused at runtime | No imports outside `api.ts` itself | Integration layer not exercised; envelope/params/auth gaps undiscovered |
| Mock data for categories, tags, map | `mock-data.ts`, `mock-map-items.ts`, `catalog.ts` | App appears functional but shows fake data |
| `useResources` stub returns `[]` | `hooks/useResources.ts` | Resources page and future results list always empty |
| Filter state disconnected from data | `DiscoverPage` collects filters but does not pass to `useResourceMap` | User interactions have no effect on displayed data |
| `ResourceDetailPanel` empty stub | No fetch by `selectedResourceId` | Marker click opens empty panel |
| Response envelope type mismatch | `types/api.ts` uses `ok`; backend uses `status` | Will cause silent parsing failures on integration |
| `categoryIcons.ts` hardcoded colors | Duplicates `color_hex` available from API | Marker colors diverge from admin-configured categories |
| Legacy routes not in UX spec | `/map`, `/resources`, `/submissions` in router but not in sidebar/spec | Confusion about canonical routes; `/submissions` has no auth gate |
| Discover at `/` instead of UX spec `/discover` | `routes.tsx` index route | Route mismatch with UX spec (deferred to Phase 6) |
| `Resource.categoryId` vs `ResourceMapItem.categorySlug` | Different field semantics across types | Integration must bridge ID/slug/name consistently |
| `ResourceStatus` enum does not match backend | `published` vs `approved`; missing `needs_clarification` | Status badges will be wrong without alignment |
| Disabled "Filters" placeholder button | `FilterBar.tsx` | UX spec advanced filters not started |
| No results list in Discover workspace | UX spec requirement | Core discovery workflow incomplete |
| No auth provider or protected routes | `StaffSignInPage` stub; `/submissions` unprotected | Security risk when moderation is wired |
| `catalog.ts` in `features/` not `services/` | Misplaced data access layer | Blurs UI/domain boundaries |
| Comments reference `/api/v1/` paths | `mapService.ts` | Incorrect path prefix; will 404 against real backend |

### Backend technical debt

| Item | Evidence | Impact |
|------|----------|--------|
| Backend not in this repository | `docker-compose.yml` TODO comment | Frontend developers cannot integration-test against a local backend from this repo alone |
| `db/schema.sql` does not match API models | Legacy `users`/`sessions`/`events` tables vs 18-model API PDF | Misleading schema reference for frontend developers |
| `/issues` and `/dashboard/stats` in README but not in API PDF | Supplementary README Backend.md | Uncertain contract for future features |
| `DELETE /submissions/dev/flushratelimits` unauthenticated | API PDF | Dev endpoint must not ship to production |
| Single `category_id` / `tag_id` on list filter | API PDF `GET /resources` params | Complicates multi-select UX |

### Integration technical debt

| Item | Evidence | Impact |
|------|----------|--------|
| No slug→ID translation layer | Frontend uses slugs; backend uses numeric IDs | Must be built in service layer before filters work |
| No map centre/radius passed to map service | `useResourceMap` calls `fetchMapResources()` with no args | Map endpoint requires `lat`/`lng`; will fail on first real call |
| No pagination handling in frontend | `useResources` returns flat array; backend returns `{ resources, pagination }` | List views will not scale without pagination support |
| No `credentials: 'include'` in api client | `api.ts` fetch options | Refresh cookie auth will not work for staff |
| `VITE_API_URL` has no path suffix guidance | `.env.example` shows `http://localhost:5000` | Developers may incorrectly append `/api/v1` |

---

## 10. Final Recommendations

### Overall architecture quality

The frontend has a **sound layered architecture** that aligns well with the intended integration pattern. Separation of pages, features, hooks, services, and types is clean and will scale. The backend contract is **well-structured** with consistent envelopes, versioning, RBAC, and clear public vs staff endpoint boundaries.

The primary gap is not architectural — it is **wiring**. The app is UI-ready but operates on mock data and stubs.

### Strengths

- **Centralized API client scaffold** (`services/api.ts`) ready for extension
- **Hook pattern** with loading/error states already established in `useCategories`, `useTags`, `useResourceMap`
- **Empty/loading/error UI** components exist (`EmptyState`, loading overlays in `MapContainer`, `ResourceList`)
- **Provider-based client state** (`SearchProvider`, `SelectionProvider`) matches UX spec direction for shared filter state
- **Map infrastructure** (Leaflet, clustering, basemap providers, resize handling) is production-quality and independent of backend
- **Backend versioning pattern** protects data integrity and supports the submission/moderation workflow cleanly

### Risks

| Risk | Mitigation |
|------|------------|
| Type mismatches cause silent failures on first integration | Fix envelope parsing in Phase 1; add adapter functions at service boundary; test against live backend early |
| Multi-select filters incompatible with single `category_id`/`tag_id` params | Confirm backend OR-semantics or plan client-side over-fetch; escalate per Section 8 if needed |
| Map viewport UX spec vs radius-based API | Clarify backend bbox support before building pan/zoom re-fetch |
| Backend not in repo blocks local integration testing | Coordinate backend deployment or add backend to docker-compose for dev |
| UX spec route changes (`/` → Home, `/discover`) refactor routing | Defer to Phase 6 after backend integration is stable |
| Auth cookie + CORS configuration | Ensure `credentials: 'include'` and backend CORS `supports_credentials` are aligned before Phase 4 |

### What should never be changed

- **Backend response envelope** (`status`/`message`/`data`) — adapt on the frontend, do not invent alternatives
- **Resource versioning model** (shell + `ResourceVersion`) — frontend should read approved versions, never assume mutable resources
- **RBAC role names** (`staff_editor`, `moderator`, `administrator`) — gate staff UI to these roles
- **UX spec interaction model** — workspace navigation stack, state preservation, map-primary discovery (implement as specified, not redesigned)
- **Service layer rule** — no direct `fetch()` in components or hooks
- **Submission moderation flow** — public POST → `pending_review` → staff review; do not bypass queue on frontend

### Guiding principles for future development

1. **Backend API is the production contract.** Every endpoint, field name, and envelope shape comes from the API documentation unless explicitly approved otherwise.
2. **Discover Experience spec is the UX contract.** Layout, navigation, and interaction patterns follow the specification.
3. **Integrate before you embellish.** Wire real data and error handling before adding UI polish or new features.
4. **Adapt at the service boundary.** Convert backend shapes to frontend types in `services/`, not in components.
5. **Every feature ships with loading, empty, and error states.** No silent failures, no blank screens.
6. **Flag backend gaps; do not work around them without approval.** Document the limitation, propose the change, wait.
7. **Remove mocks immediately after verification.** Do not maintain parallel mock and live code paths.
8. **Phases are deployable.** Each integration phase leaves the app in a working, testable state.

---

## Appendix A — Backend Model Reference (18 tables)

For quick cross-reference during implementation. Field details are in the API PDF `models.py`.

| Domain | Models |
|--------|--------|
| Auth | `Role`, `User`, `UserRole`, `PasswordResetToken` |
| Lookup | `Category`, `Tag` |
| Core resource | `Resource`, `ResourceVersion`, `ResourceLocation`, `ResourceContact`, `ResourceHour`, `ResourceVersionCategory`, `ResourceVersionTag` |
| Workflow | `Submission`, `SubmissionReview`, `ReportedIssue` |
| Ops | `ResourceChangeLog`, `SubmissionRateLimit` |

## Appendix B — Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:5000`) | Yes |
| `VITE_MAP_PROVIDER` | Map tile provider (`maptiler` \| `openstreetmap`) | Yes |
| `VITE_MAPTILER_API_KEY` | MapTiler API key | When provider is `maptiler` |
| `VITE_MAP_STYLE` | Basemap style identifier | Yes |

## Appendix C — Document References

| Document | Role |
|----------|------|
| Backend API documentation (routes, models, utilities and API contracts) | Production API contract |
| Discover Experience & Workspace Design Specification | Authoritative UX document |
| README Backend.md (supplementary) | High-level backend overview; may describe endpoints not yet in API PDF |
| `front/README.md` | Frontend environment and map configuration |
| `docs/frontend-api-integration-plan.md` (this document) | Canonical integration reference |
