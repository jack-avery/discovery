# RRCRC Community Asset Mapping Platform - API Documentation

**Project:** CST3116 Capstone Rideau-Rockcliffe Community Resource Centre

**Version 1:**  Braintorms main points from Project Plan and the backend, Co-authored by Claude to write the complex API documentation and access any flaws in the system I might have made.

---


## Table of Contents

1. Architecture Overview
2. Authentication Strategy
3. Common Conventions
4. Auth Endpoints
5. Resource Endpoints > Public
6. Resource Endpoints > Staff / Admin
7. Category Endpoints
8. Tag Endpoints
9. Submission Endpoints
10. Reported Issue Endpoints
11. Dashboard Endpoints
12. User Management Endpoints
13. Submission Approval Workflow
14. Rate Limiting
15. Role Permission Matrix
16. Database Table → Endpoint Mapping

## 1. Architecture Overview

The API follows a **resource-versioning architecture**. The key design principle is that the `resources` table stores only stable identity metadata, while all displayable content lives in `resource_versions`. Every community submission and every staff edit creates a new `resource_versions` row. The public map always reflects `resources.current_approved_version_id`,  pending edits are invisible to the public until a moderator approves them.

```
resources            ← stable identity, slug, active state
 └── resource_versions   ← versioned content (approved / pending / rejected)
       ├── resource_locations    ← address + POINT coordinates
       ├── resource_contacts     ← phone / email / website / social
       ├── resource_hours        ← operating hours by day
       ├── resource_version_categories
       └── resource_version_tags

submissions          ← community contribution workflow wrapper
 └── submission_reviews     ← full moderation decision history

reported_issues      ← lightweight issue flags (separate from full submissions)
resource_change_log  ← immutable audit trail of all approved changes
```

### Two Resource Creation Paths

| Path | Who | Tables touched |
|---|---|---|
| **Direct create** | `staff_editor`, `administrator` | `resources` → `resource_versions` → child tables → set `current_approved_version_id` immediately |
| **Community submission** | `contributor`, anonymous public | `resources` (shell) → `resource_versions` (pending) → `submissions` → moderator reviews → approval updates `current_approved_version_id` |

---

## 2. Authentication Strategy

The API uses **JWT (JSON Web Tokens)** with a dual-token pattern.

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| **Access token** | 15 minutes | Memory / `Authorization` header | Authenticates each request |
| **Refresh token** | 7 days | `HttpOnly` cookie | Issues new access tokens without re-login |

### Token Flow

```
POST /auth/login
  → returns: { access_token }  +  sets HttpOnly refresh_token cookie

Every protected request:
  Authorization: Bearer <access_token>

Access token expires:
  POST /auth/refresh  (uses HttpOnly cookie automatically)
  → returns new { access_token }

POST /auth/logout
  → clears refresh cookie on server + client
```

### Role Hierarchy

Roles are stored in the `roles` table and assigned via `user_roles` (many-to-many, a user can hold multiple roles).

```
administrator   → all operations
staff_editor    → create / edit / archive resources directly; manage categories/tags; review issues
moderator       → review and approve/reject submissions; resolve issues; read audit log
contributor     → submit new resources; submit updates; report issues; view own submissions
public          → read-only (no token required for GET endpoints)
```

---

## 3. Common Conventions

### Request Format
- All request bodies: `Content-Type: application/json`
- Date/time fields: ISO 8601 UTC - `"2026-06-01T14:30:00Z"`
- Coordinates: `{ "lat": 45.4215, "lng": -75.6972 }` (decimal degrees, WGS84)

### Response Envelope

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "No resource found with id 42"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK - successful GET / update |
| `201` | Created - successful POST that created a resource |
| `204` | No Content - successful DELETE |
| `400` | Bad Request - validation failure |
| `401` | Unauthorized - missing or invalid token |
| `403` | Forbidden - valid token but insufficient role |
| `404` | Not Found |
| `409` | Conflict - duplicate (e.g. slug already exists) |
| `422` | Unprocessable Entity - business rule violation |
| `429` | Too Many Requests - rate limit exceeded |
| `500` | Internal Server Error |

### Pagination

All list endpoints that can return multiple rows support:

```
?page=1&limit=20
```

Paginated responses include:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 183,
    "pages": 10
  }
}
```

### Slug Generation

Resource slugs are generated server-side on creation:  
`"RRCRC Food Bank"` → `"rrcrc-food-bank"` → if collision, append `-2`, `-3`, etc.  
Stored in `resources.slug`. Never editable after creation.

---

## 4. Auth Endpoints

### `POST /auth/register`

Registers a new user account. New accounts are assigned public role by default - an administrator must assign roles via `POST /users/{id}/roles`.

**Auth required:** None

**Request body:**
```json
{
  "email": "jane.smith@example.com",
  "password": "SecurePassword123!",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "email": "jane.smith@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "roles": [public]
  }
}
```

**Validation rules:** `email` unique; `password` minimum 8 characters.

---

### `POST /auth/login`

**Auth required:** None

**Request body:**
```json
{
  "email": "jane.smith@example.com",
  "password": "SecurePassword123!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 5,
      "email": "jane.smith@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "roles": ["moderator"]
    }
  }
}
```

Sets `HttpOnly` `refresh_token` cookie. Returns `401` if credentials invalid or account inactive.

---

### `POST /auth/refresh`

Issues a new access token using the refresh token cookie. No body required.

**Auth required:** Valid `HttpOnly` refresh_token cookie

**Response `200`:**
```json
{
  "success": true,
  "data": { "access_token": "eyJhbGci..." }
}
```

---

### `POST /auth/logout`

**Auth required:** Bearer token

Invalidates the refresh token cookie server-side and clears it on the client.

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### `POST /auth/password/reset-request`

Generates a password reset token and emails it to the user. Inserts a hashed token into `password_reset_tokens`. Token expires in 1 hour.

**Auth required:** None

**Request body:**
```json
{ "email": "jane.smith@example.com" }
```

**Response `200`:** Always returns success regardless of whether the email exists (prevents user enumeration).
```json
{ "success": true, "message": "If that email exists, a reset link has been sent." }
```

---

### `POST /auth/password/reset-confirm`

Consumes the reset token and updates the user's password hash. Sets `used_at` on the token row.

**Auth required:** None

**Request body:**
```json
{
  "token": "raw-token-from-email",
  "new_password": "NewSecurePassword456!"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Password updated successfully." }
```

Returns `400` if token is expired, already used, or not found.

---

## 5. Resource Endpoints - Public

These endpoints require **no authentication**. They only serve content from `resources` where `is_active = 1` AND `deleted_at IS NULL`, joined to `current_approved_version_id`.

---

### `GET /resources/map`

**Purpose:** Powers the interactive map. Returns a lightweight payload - only the fields needed to render map pins and the sidebar list. Intentionally excludes full description, hours, and contacts to keep payload small.

**Auth required:** None

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `lat` | float | Centre latitude for radius search |
| `lng` | float | Centre longitude for radius search |
| `radius` | int | Radius in metres (default: `5000`, max: `20000`) |
| `category` | int | Filter by `category_id` |
| `tags` | string | Comma-separated `tag_id` values e.g. `tags=1,5,9` |
| `type` | string | Filter by `resource_type` e.g. `type=Organization` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "resource_id": 12,
      "slug": "rrcrc-food-bank",
      "name": "RRCRC Food Bank",
      "resource_type": "Organization",
      "image_url": "/uploads/resources/rrcrc-food-bank.jpg",
      "primary_category": {
        "category_id": 1,
        "name": "Food",
        "color_hex": "#E53935",
        "icon_identifier": "utensils"
      },
      "location": {
        "lat": 45.4435,
        "lng": -75.6122,
        "is_virtual": 0,
        "distance_m": 1243
      }
    }
  ]
}
```

**DB query:** Executes `ST_Distance_Sphere()` on `resource_locations.coordinates`. Falls back to Haversine on `lat`/`lng` decimal columns if the POINT column is NULL.

---

### `GET /resources`

**Purpose:** Paginated list of all approved resources with full filtering. Used by the search/filter panel.

**Auth required:** None

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Full-text search on `name`, `description` |
| `category` | int | Filter by `category_id` |
| `tags` | string | Comma-separated `tag_id` values |
| `type` | string | Filter by `resource_type` |
| `lat`, `lng`, `radius` | float, float, int | Location filter (same as `/map`) |
| `page` | int | Default `1` |
| `limit` | int | Default `20`, max `100` |

**Response `200`:** Paginated list. Each item includes name, description excerpt (max 200 chars), primary category, primary location summary, and primary contact. Full details fetched via `GET /resources/{id}`.

---

### `GET /resources/{id}`

**Purpose:** Full resource detail view. Triggered when a user clicks a map pin or list item.

**Auth required:** None  
**Path parameter:** `id` - `resource_id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "resource_id": 12,
    "slug": "rrcrc-food-bank",
    "resource_version_id": 34,
    "resource_type": "Organization",
    "name": "RRCRC Food Bank",
    "description": "Provides non-perishable food items...",
    "eligibility": "Open to all Ward 13 residents.",
    "cost_description": "Free",
    "accessibility_notes": "Wheelchair accessible entrance. Parking available.",
    "general_notes": "Managed by RRCRC.",
    "image_url": "/uploads/resources/rrcrc-food-bank.jpg",
    "is_verified": true,
    "last_verified_at": "2026-04-01T09:00:00Z",
    "categories": [
      { "category_id": 1, "name": "Food", "is_primary": 1 }
    ],
    "tags": [
      { "tag_id": 1, "name": "Free" },
      { "tag_id": 3, "name": "Walk-in" }
    ],
    "locations": [
      {
        "location_id": 8,
        "location_name": "Main Office",
        "address_line1": "855 Notre Dame St",
        "city": "Ottawa",
        "province": "Ontario",
        "postal_code": "K1K 0A1",
        "lat": 45.4435,
        "lng": -75.6122,
        "is_primary": 1,
        "is_virtual": 0
      }
    ],
    "contacts": [
      { "contact_type": "Phone", "contact_value": "(613) 443-3848", "contact_label": "Main Line", "is_primary": 1 },
      { "contact_type": "Website", "contact_value": "https://rrcrc.on.ca/food-bank", "contact_label": null, "is_primary": 0 }
    ],
    "hours": [
      { "day_of_week": 1, "opens_at": "09:00", "closes_at": "16:00", "is_closed": 0, "by_appointment_only": 0 },
      { "day_of_week": 2, "opens_at": "09:00", "closes_at": "16:00", "is_closed": 0, "by_appointment_only": 0 },
      { "day_of_week": 6, "opens_at": null, "closes_at": null, "is_closed": 1, "by_appointment_only": 0 }
    ]
  }
}
```

---

### `GET /resources/{slug}`

Identical response to `GET /resources/{id}` but resolved by `resources.slug`. Supports SEO-friendly deep-links shared in RRCRC communications (e.g. `https://rrcrcmap.ca/resources/rrcrc-food-bank`).

**Auth required:** None

---

## 6. Resource Endpoints - Staff / Admin

These endpoints allow `staff_editor` and `administrator` to create and manage resources **directly**, bypassing the community submission workflow. Changes here go live immediately.

---

### `POST /resources`

Creates a new resource shell and an approved version in a single transaction.

**Auth required:** `staff_editor` or `administrator`

**Transaction sequence:**
1. Generate slug from `name`
2. `INSERT resources` (version = NULL)
3. `INSERT resource_versions` (status = `approved`, `approved_at = NOW()`)
4. `INSERT resource_locations`, `resource_contacts`, `resource_hours`
5. `INSERT resource_version_categories`, `resource_version_tags`
6. `UPDATE resources SET current_approved_version_id = new_version_id`
7. `INSERT resource_change_log` (change_type = `created`)

**Request body:**
```json
{
  "name": "Rideau Carleton Food Pantry",
  "resource_type": "Program",
  "description": "Weekly food distribution...",
  "eligibility": "Low-income households in K1K area.",
  "cost_description": "Free",
  "accessibility_notes": "Ground floor, accessible parking.",
  "general_notes": "",
  "image_url": "/uploads/resources/rcfp.jpg",
  "categories": [
    { "category_id": 1, "is_primary": 1 }
  ],
  "tags": [1, 3],
  "location": {
    "address_line1": "123 Example Ave",
    "city": "Ottawa",
    "province": "Ontario",
    "postal_code": "K1K 2B4",
    "lat": 45.4100,
    "lng": -75.6300,
    "is_virtual": 0
  },
  "contacts": [
    { "contact_type": "Phone", "contact_value": "613-555-0123", "contact_label": "Intake", "is_primary": 1 }
  ],
  "hours": [
    { "day_of_week": 3, "opens_at": "10:00", "closes_at": "14:00", "is_closed": 0, "by_appointment_only": 0 }
  ]
}
```

**Response `201`:** Returns the full resource detail object (same shape as `GET /resources/{id}`).

---

### `PUT /resources/{id}`

Updates an existing resource by creating a new approved `resource_versions` row and immediately pointing `current_approved_version_id` to it. The previous approved version is retained in the table for audit purposes.

**Auth required:** `staff_editor` or `administrator`

**Request body:** Same shape as `POST /resources` (full replacement of content fields).

**Transaction sequence:**
1. Verify resource exists and `deleted_at IS NULL`
2. `INSERT resource_versions` (status = `approved`)
3. `INSERT` child tables for new version
4. `UPDATE resources SET current_approved_version_id = new_version_id`
5. `INSERT resource_change_log` (change_type = `updated`)

**Response `200`:** Updated resource detail object.

---

### `PATCH /resources/{id}/verify`

Marks a resource as staff-verified. Updates `last_verified_at`, `last_verified_by_user_id`, and optionally `next_review_due_at` on the `resources` table. Supports the charter's data freshness / long-term sustainability requirement.

**Auth required:** `staff_editor` or `administrator`

**Request body:**
```json
{
  "next_review_due_at": "2026-12-01T00:00:00Z"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "resource_id": 12,
    "last_verified_at": "2026-06-01T10:00:00Z",
    "next_review_due_at": "2026-12-01T00:00:00Z"
  }
}
```

---

### `DELETE /resources/{id}`

**Soft delete only.** Sets `deleted_at = NOW()` and `is_active = 0` on the `resources` row. The resource disappears from all public endpoints. The row and all version history remain in the database and are recoverable.

**Auth required:** `administrator` only

**Response `200`:**
```json
{ "success": true, "message": "Resource soft-deleted. Data is recoverable." }
```

Inserts `resource_change_log` row (change_type = `deleted`).

---

### `PATCH /resources/{id}/restore`

Restores a soft-deleted resource. Sets `deleted_at = NULL`, `is_active = 1`.

**Auth required:** `administrator`

**Response `200`:**
```json
{ "success": true, "message": "Resource restored." }
```

---

## 7. Category Endpoints

### `GET /categories`

Returns all active categories including `icon_identifier`, `color_hex`, and `display_order` - the frontend uses these to render the map legend and filter panel.

**Auth required:** None

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "name": "Food",
      "slug": "food",
      "icon_identifier": "utensils",
      "color_hex": "#E53935",
      "display_order": 1,
      "parent_category_id": null
    }
  ]
}
```

---

### `POST /categories`

**Auth required:** `administrator`

**Request body:**
```json
{
  "name": "Legal Support",
  "slug": "legal-support",
  "description": "Legal information and advocacy services",
  "icon_identifier": "scale",
  "color_hex": "#546E7A",
  "display_order": 8,
  "parent_category_id": null
}
```

**Response `201`:** Created category object.

---

### `PUT /categories/{id}`

**Auth required:** `administrator` or `staff_editor`

**Request body:** Any subset of the category fields. Partial update supported.

**Response `200`:** Updated category object.

---

### `DELETE /categories/{id}`

Sets `is_active = 0` (soft deactivation). Does not delete the row - existing resources retain the category assignment in version history.

**Auth required:** `administrator`

**Response `200`:** Confirmation message.

---

## 8. Tag Endpoints

### `GET /tags`

Returns all active tags. Used by the frontend filter panel.

**Auth required:** None

**Response `200`:** Array of `{ tag_id, name, slug }` objects.

---

### `POST /tags`

**Auth required:** `staff_editor` or `administrator`

**Request body:** `{ "name": "Subsidized", "slug": "subsidized" }`

**Response `201`:** Created tag object.

---

### `DELETE /tags/{id}`

Soft deactivation (`is_active = 0`).

**Auth required:** `administrator`

**Response `200`:** Confirmation message.

---

## 9. Submission Endpoints

The submission system handles three types of community contributions:

| `submission_type` | Description | Creates new `resources` row? |
|---|---|---|
| `new_resource` | Propose a brand-new listing | Yes (shell with `current_approved_version_id = NULL`) |
| `update_resource` | Suggest changes to an existing listing | No (new version on existing `resource_id`) |
| `community_asset` | Skills, volunteer services, program ideas | Yes (shell; location optional) |

---

### `POST /submissions`

Creates a community submission. Available to authenticated contributors and **anonymous public users** (subject to rate limiting - see [Section 14](#14-rate-limiting)).

**Auth required:** None (anonymous allowed) - if authenticated, `submitted_by_user_id` is set from JWT.

**Transaction sequence for `new_resource`:**
1. Check rate limit on client IP
2. `INSERT resources` (shell, `current_approved_version_id = NULL`, `is_active = 0`)
3. Generate slug from `name`
4. `INSERT resource_versions` (status = `pending_review`)
5. `INSERT resource_locations`, `resource_contacts`, `resource_hours` (if provided)
6. `INSERT resource_version_categories`, `resource_version_tags`
7. `INSERT submissions` (`proposed_version_id` = new version)
8. Increment `submission_rate_limits` counter for IP

**Transaction sequence for `update_resource`:**
1. Check rate limit
2. Verify `resource_id` exists and `is_active = 1`
3. `INSERT resource_versions` (new pending row for same `resource_id`)
4. `INSERT` child tables for new version
5. `INSERT submissions` (`resource_id` = existing, `proposed_version_id` = new version)

**Request body - `new_resource`:**
```json
{
  "submission_type": "new_resource",
  "submitter_name": "Amira Hassan",
  "submitter_email": "amira@example.com",
  "submission_message": "This food pantry opened last month and isn't on the map yet.",
  "resource": {
    "name": "Vanier Community Pantry",
    "resource_type": "Program",
    "description": "Weekly grocery distribution every Thursday.",
    "eligibility": "All Vanier residents welcome.",
    "cost_description": "Free",
    "categories": [{ "category_id": 1, "is_primary": 1 }],
    "tags": [1, 3],
    "location": {
      "address_line1": "45 Barrette St",
      "city": "Ottawa",
      "postal_code": "K1L 5H7",
      "lat": 45.4370,
      "lng": -75.6492,
      "is_virtual": 0
    },
    "contacts": [
      { "contact_type": "Phone", "contact_value": "613-555-9876", "is_primary": 1 }
    ]
  }
}
```

**Request body - `community_asset` (no location required):**
```json
{
  "submission_type": "community_asset",
  "submitter_name": "Carlos Rivera",
  "submitter_email": "carlos@example.com",
  "submission_message": "I offer free tutoring in math for grades 7-9. Can come to the community centre.",
  "resource": {
    "name": "Free Math Tutoring (Grades 7–9)",
    "resource_type": "Volunteer Skill",
    "description": "Individual or small group tutoring in mathematics.",
    "eligibility": "Students in grades 7–9.",
    "cost_description": "Free",
    "categories": [{ "category_id": 3, "is_primary": 1 }],
    "tags": [1, 5]
  }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "submission_id": 7,
    "submission_type": "new_resource",
    "moderation_status": "pending_review",
    "proposed_resource_name": "Vanier Community Pantry",
    "created_at": "2026-06-01T14:22:00Z"
  },
  "message": "Thank you. Your submission is pending review by RRCRC staff."
}
```

---

### `GET /submissions`

Returns the moderation queue. Sortable and filterable.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | `pending_review` (default) \| `approved` \| `rejected` |
| `type` | string | `new_resource` \| `update_resource` \| `community_asset` |
| `page` | int | Default `1` |
| `limit` | int | Default `20` |

**Response `200`:** Paginated list. Each item includes `submission_id`, `submission_type`, `submitter_name`, proposed resource name, `moderation_status`, `created_at`.

---

### `GET /submissions/{id}`

Full detail of a single submission including the proposed version content and any existing review history.

**Auth required:** `moderator`, `staff_editor`, `administrator`, or the original `contributor` (own submissions only)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "submission_id": 7,
    "submission_type": "new_resource",
    "moderation_status": "pending_review",
    "submitter_name": "Amira Hassan",
    "submitter_email": "amira@example.com",
    "submission_message": "This food pantry opened last month...",
    "proposed_version": { "...full resource_version content..." },
    "review_history": []
  }
}
```

---

### `POST /submissions/{id}/review`

A moderator approves or rejects a submission. This is the most complex endpoint - it executes a multi-table transaction. See [Section 13](#13-submission-approval-workflow) for the full transaction logic.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Request body:**
```json
{
  "decision": "approved",
  "review_comment": "Verified with RRCRC staff. Good addition."
}
```

`decision` must be `"approved"` or `"rejected"`.

**On `approved` - transaction:**
1. `UPDATE resource_versions SET moderation_status='approved', approved_at=NOW(), reviewed_by_user_id=<mod>, reviewed_at=NOW()`
2. `UPDATE resources SET current_approved_version_id=<version_id>, is_active=1`
3. `UPDATE submissions SET moderation_status='approved'`
4. `INSERT submission_reviews`
5. `INSERT resource_change_log` (change_type = `approved_submission`)

**On `rejected` - transaction:**
1. `UPDATE resource_versions SET moderation_status='rejected'`
2. `UPDATE submissions SET moderation_status='rejected'`
3. `INSERT submission_reviews`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "submission_id": 7,
    "decision": "approved",
    "review_comment": "Verified with RRCRC staff. Good addition.",
    "resource_id": 15,
    "resource_slug": "vanier-community-pantry"
  }
}
```

---

### `GET /submissions/mine`

Authenticated contributor views their own submission history.

**Auth required:** Any authenticated user

**Response `200`:** Paginated list of the user's own submissions with status.

---

## 10. Reported Issue Endpoints

Issue reports are lighter-weight than full submissions. A user flags a problem ("phone number is wrong") without proposing a complete replacement. A moderator reads it and decides whether a full `update_resource` submission is warranted.

---

### `POST /issues`

**Auth required:** None (anonymous allowed - subject to rate limiting)

**Request body:**
```json
{
  "resource_id": 12,
  "reporter_name": "John Doe",
  "reporter_email": "john@example.com",
  "issue_type": "wrong_info",
  "description": "The phone number listed is no longer in service. The correct number is 613-555-0001."
}
```

`issue_type` values: `wrong_info` | `permanently_closed` | `hours_changed` | `other`

**Response `201`:**
```json
{
  "success": true,
  "data": { "issue_id": 3, "status": "open" },
  "message": "Your report has been submitted. Thank you for helping keep our data accurate."
}
```

---

### `GET /issues`

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Query parameters:** `status` (`open` default | `in_review` | `resolved` | `dismissed`), `resource_id`, `page`, `limit`

**Response `200`:** Paginated issue list. Each item includes `issue_id`, `resource_id`, resource name, `issue_type`, `description`, `status`, `created_at`.

---

### `GET /issues/{id}`

Full issue detail.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

---

### `PATCH /issues/{id}/resolve`

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Request body:**
```json
{
  "status": "resolved",
  "resolution_notes": "Confirmed with RRCRC. Phone number updated via separate staff edit."
}
```

`status` values: `resolved` | `dismissed` | `in_review`

Sets `resolved_by_user_id`, `resolved_at`, `resolution_notes` on the `reported_issues` row.

**Response `200`:** Updated issue object.

---

## 11. Dashboard Endpoints

Used by the moderator/staff dashboard shown in Appendix A of the project plan.

---

### `GET /dashboard/stats`

Returns the four count cards displayed at the top of the dashboard.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "total_resources": 246,
    "pending_submissions": 18,
    "approved_this_month": 10,
    "open_issues": 7
  }
}
```

**DB queries:**
```sql
SELECT COUNT(*) FROM resources   WHERE is_active = 1 AND deleted_at IS NULL;
SELECT COUNT(*) FROM submissions  WHERE moderation_status = 'pending_review';
SELECT COUNT(*) FROM resources    WHERE is_active = 1 AND deleted_at IS NULL
                               AND current_approved_version_id IN (
                                 SELECT resource_version_id FROM resource_versions
                                 WHERE approved_at >= DATE_FORMAT(NOW(),'%Y-%m-01')
                               );
SELECT COUNT(*) FROM reported_issues WHERE status = 'open';
```

---

### `GET /dashboard/categories`

Returns resource counts per category for the dashboard pie chart.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "category_id": 1, "name": "Food", "color_hex": "#E53935", "count": 98 },
    { "category_id": 2, "name": "Housing", "color_hex": "#1E88E5", "count": 66 }
  ]
}
```

---

### `GET /dashboard/pending-submissions`

Returns the most recent pending submissions for the dashboard queue panel.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Query parameters:** `limit` (default `10`), `page`

**Response `200`:** Paginated list of pending submissions ordered by `created_at ASC` (oldest first - FIFO moderation queue).

---

### `GET /dashboard/activity`

Returns recent entries from `resource_change_log` for the activity feed.

**Auth required:** `moderator`, `staff_editor`, or `administrator`

**Query parameters:** `limit` (default `20`), `page`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "change_id": 44,
      "resource_id": 12,
      "resource_name": "RRCRC Food Bank",
      "changed_by": "Jane Smith",
      "change_type": "approved_submission",
      "change_summary": "Community update approved: hours corrected.",
      "changed_at": "2026-06-01T14:35:00Z"
    }
  ]
}
```

---

## 12. User Management Endpoints

Admin-only endpoints for managing platform users.

---

### `GET /users`

**Auth required:** `administrator`

**Query parameters:** `search` (name/email), `role`, `is_active`, `page`, `limit`

**Response `200`:** Paginated user list. Each item: `user_id`, `email`, `first_name`, `last_name`, `roles[]`, `is_active`, `created_at`.

---

### `GET /users/{id}`

**Auth required:** `administrator`, or the user themselves

**Response `200`:** Full user profile with roles.

---

### `POST /users/{id}/roles`

Assigns a role to a user. Inserts into `user_roles` with `assigned_by_user_id` set to the requesting admin's ID.

**Auth required:** `administrator`

**Request body:**
```json
{ "role_name": "moderator" }
```

**Response `201`:**
```json
{
  "success": true,
  "data": { "user_id": 5, "roles": ["moderator"] }
}
```

---

### `DELETE /users/{id}/roles/{role_name}`

Removes a role from a user.

**Auth required:** `administrator`

**Response `200`:** Updated roles list for the user.

---

### `PATCH /users/{id}/deactivate`

Sets `is_active = 0` on the user. The user cannot log in but their data (submissions, change log) is preserved.

**Auth required:** `administrator`

**Response `200`:**
```json
{ "success": true, "message": "User account deactivated." }
```

---

## 13. Submission Approval Workflow

The approval of a community submission is the most complex database operation in the system. It must execute as a **single atomic transaction** - if any step fails, all changes roll back.

### New Resource Approval

```
BEGIN TRANSACTION

  -- 1. Approve the pending version
  UPDATE resource_versions
     SET moderation_status    = 'approved',
         approved_at          = NOW(),
         reviewed_by_user_id  = :moderator_user_id,
         reviewed_at          = NOW(),
         review_comment       = :comment
   WHERE resource_version_id  = :proposed_version_id;

  -- 2. Make the resource public and link to the approved version
  UPDATE resources
     SET current_approved_version_id = :proposed_version_id,
         is_active                   = 1
   WHERE resource_id = :resource_id;

  -- 3. Update the submission status
  UPDATE submissions
     SET moderation_status = 'approved',
         updated_at        = NOW()
   WHERE submission_id = :submission_id;

  -- 4. Log the moderator's decision (full review history)
  INSERT INTO submission_reviews
    (submission_id, reviewed_by_user_id, moderation_status, review_comment)
  VALUES
    (:submission_id, :moderator_user_id, 'approved', :comment);

  -- 5. Write the immutable audit log
  INSERT INTO resource_change_log
    (resource_id, changed_by_user_id, change_type, change_summary, submission_id)
  VALUES
    (:resource_id, :moderator_user_id, 'approved_submission',
     CONCAT('Approved new resource: ', :resource_name), :submission_id);

COMMIT
```

### Update Resource Approval

Same transaction, but `is_active` is already `1`. Only step 2 differs:

```sql
UPDATE resources
   SET current_approved_version_id = :proposed_version_id
 WHERE resource_id = :resource_id;
-- previous approved version is retained in resource_versions for history
```

### Rejection

```
BEGIN TRANSACTION
  UPDATE resource_versions SET moderation_status = 'rejected' WHERE ...;
  UPDATE submissions SET moderation_status = 'rejected' WHERE ...;
  INSERT INTO submission_reviews (..., 'rejected', :comment);
COMMIT
-- No resource_change_log entry on rejection (resource was never public)
```

---

## 14. Rate Limiting

Anonymous public users submitting to `POST /submissions` and `POST /issues` are subject to IP-based rate limiting. This prevents spam from flooding the moderation queue.

**Limit:** 5 submissions per IP per 1-hour rolling window.

**Flask middleware logic:**
```python
# On every anonymous POST to /submissions or /issues:
ip_hash = sha256(request.remote_addr).hexdigest()
window  = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

# Check current count
row = db.execute(
    "SELECT count FROM submission_rate_limits "
    "WHERE ip_hash = %s AND window_start = %s",
    (ip_hash, window)
).fetchone()

if row and row['count'] >= 5:
    abort(429, "Rate limit exceeded. Please try again later.")

# Increment counter (insert or update)
db.execute(
    "INSERT INTO submission_rate_limits (ip_hash, window_start, count) "
    "VALUES (%s, %s, 1) "
    "ON DUPLICATE KEY UPDATE count = count + 1",
    (ip_hash, window)
)
```

Authenticated `contributor` accounts are not subject to this limit.

---

## 15. Role Permission Matrix

| Endpoint | Public | Contributor | Moderator | Staff Editor | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| `GET /resources/map` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /resources` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /resources/{id}` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /resources` | - | - | - | ✓ | ✓ |
| `PUT /resources/{id}` | - | - | - | ✓ | ✓ |
| `PATCH /resources/{id}/verify` | - | - | - | ✓ | ✓ |
| `DELETE /resources/{id}` | - | - | - | - | ✓ |
| `PATCH /resources/{id}/restore` | - | - | - | - | ✓ |
| `GET /categories` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /categories` | - | - | - | - | ✓ |
| `PUT /categories/{id}` | - | - | - | ✓ | ✓ |
| `DELETE /categories/{id}` | - | - | - | - | ✓ |
| `GET /tags` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /tags` | - | - | - | ✓ | ✓ |
| `DELETE /tags/{id}` | - | - | - | - | ✓ |
| `POST /submissions` | ✓* | ✓ | ✓ | ✓ | ✓ |
| `GET /submissions` | - | - | ✓ | ✓ | ✓ |
| `GET /submissions/{id}` | - | own only | ✓ | ✓ | ✓ |
| `POST /submissions/{id}/review` | - | - | ✓ | ✓ | ✓ |
| `GET /submissions/mine` | - | ✓ | ✓ | ✓ | ✓ |
| `POST /issues` | ✓* | ✓ | ✓ | ✓ | ✓ |
| `GET /issues` | - | - | ✓ | ✓ | ✓ |
| `PATCH /issues/{id}/resolve` | - | - | ✓ | ✓ | ✓ |
| `GET /dashboard/*` | - | - | ✓ | ✓ | ✓ |
| `GET /users` | - | - | - | - | ✓ |
| `POST /users/{id}/roles` | - | - | - | - | ✓ |
| `DELETE /users/{id}/roles/{role}` | - | - | - | - | ✓ |
| `PATCH /users/{id}/deactivate` | - | - | - | - | ✓ |

`✓*` = anonymous allowed, subject to rate limiting

---

## 16. Database Table → Endpoint Mapping

Every table in the schema is covered by at least one endpoint. This table confirms full coverage.

| Table | Primary Endpoint(s) |
|---|---|
| `roles` | `GET /users/{id}`, `POST /users/{id}/roles` |
| `users` | `POST /auth/register`, `POST /auth/login`, `GET /users` |
| `user_roles` | `POST /users/{id}/roles`, `DELETE /users/{id}/roles/{role}` |
| `password_reset_tokens` | `POST /auth/password/reset-request`, `POST /auth/password/reset-confirm` |
| `categories` | `GET /categories`, `POST /categories`, `PUT /categories/{id}` |
| `tags` | `GET /tags`, `POST /tags`, `DELETE /tags/{id}` |
| `resources` | `GET /resources`, `POST /resources`, `DELETE /resources/{id}` |
| `resource_versions` | `GET /resources/{id}`, `POST /resources`, `PUT /resources/{id}` |
| `resource_locations` | `GET /resources/map`, `GET /resources/{id}` |
| `resource_contacts` | `GET /resources/{id}` |
| `resource_hours` | `GET /resources/{id}` |
| `resource_version_categories` | `GET /resources?category=`, `GET /dashboard/categories` |
| `resource_version_tags` | `GET /resources?tags=` |
| `submissions` | `POST /submissions`, `GET /submissions`, `POST /submissions/{id}/review` |
| `submission_reviews` | `POST /submissions/{id}/review`, `GET /submissions/{id}` |
| `reported_issues` | `POST /issues`, `GET /issues`, `PATCH /issues/{id}/resolve` |
| `resource_change_log` | `GET /dashboard/activity` (written by approval/update/delete transactions) |
| `submission_rate_limits` | Rate limit middleware on `POST /submissions`, `POST /issues` |

---

*End of API Documentation - RRCRC Community Asset Mapping Platform*  
*Next step: Flask application structure, SQLAlchemy models, and environment setup.*
