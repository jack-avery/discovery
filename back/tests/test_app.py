# tests/test_app.py
"""
Phase 9 — Automated Test Suite
RRCRC Community Asset Mapping Platform — Backend

Coverage map (Phase → Test class)
──────────────────────────────────
  Phase 1  →  TestHealth
  Phase 4  →  TestAuthRegister, TestAuthLogin, TestAuthTokenLifecycle
  Phase 3  →  TestRBAC
  Phase 6  →  TestCategories, TestTags
  Phase 5  →  TestResourcesPublic, TestResourcesStaffCRUD
  Phase 7  →  TestSubmissionsCreate, TestSubmissionReview
  Phase 8  →  TestIssues, TestDashboard
  Phase 3  →  TestRateLimit

Known bugs flagged inline
─────────────────────────
  BUG-1   issues.py ~line 30
          Rate-limit guard is INVERTED:
            BUGGY:   if check_and_increment_rate_limit(ip_hash):
            CORRECT: if not check_and_increment_rate_limit(ip_hash):
          Effect: every anonymous POST /issues immediately returns 429.
          Fix:    add "not" — one word change in routes/issues.py.
          Tests for anonymous issue creation are @pytest.mark.xfail(strict=True)
          and will turn green automatically once the bug is fixed.

  NOTE    TestingConfig sets JWT_ACCESS_TOKEN_EXPIRES = 5 s.
          All tests complete in < 2 s so this is safe, but any added test
          that sleeps or does heavy work should refresh its token.

  NOTE    RATELIMIT_MAX_OVERRIDE = 999 in TestingConfig has NO effect.
          utils.py hardcodes RATE_LIMIT_MAX_SUBMISSIONS = 5 and never reads
          Flask config. Each test gets a fresh DB so the rate-limit counter
          resets between tests. No test makes > 5 anonymous calls except
          TestRateLimit (which intentionally makes 6).

          To make RATELIMIT_MAX_OVERRIDE work, replace the constant in
          utils.py with:
              from flask import current_app
              limit = current_app.config.get("RATELIMIT_MAX_OVERRIDE", 5)
"""

import pytest

from app.extensions import db, bcrypt
from app.models import (
    Resource,
    ResourceChangeLog,
    ResourceVersion,
    Role,
    Submission,
    SubmissionReview,
    ReportedIssue,
    User,
    UserRole,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Shared helper functions  (plain functions, NOT pytest fixtures)
# ═══════════════════════════════════════════════════════════════════════════════

def make_user(email, password="Password1!", role_name=None,
              first_name="Test", last_name="User"):
    """
    Insert a User directly into the active DB session and optionally assign
    a role by name.

    Bypasses POST /auth/register intentionally — tests that are not about
    registration should not depend on that endpoint working correctly.

    Must be called inside an active app context (guaranteed when the `client`
    or `app` fixture is in scope, because conftest.py wraps the yield inside
    `with flask_app.app_context()`).

    Returns the committed User ORM object.
    """
    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(
        email=email, # type: ignore
        password_hash=pw_hash, # type: ignore
        first_name=first_name, # type: ignore
        last_name=last_name, # type: ignore
        is_active=1, # type: ignore
    )
    db.session.add(user)
    db.session.flush()  # obtain user_id before the FK insert below

    if role_name:
        role = Role.query.filter_by(role_name=role_name).first()
        assert role is not None, (
            f"Role '{role_name}' not found — did conftest.py seed roles correctly?"
        )
        db.session.add(UserRole(user_id=user.user_id, role_id=role.role_id)) # type: ignore

    db.session.commit()
    return user


def get_token(client, email, password="Password1!"):
    """
    Log in via POST /auth/login and return the JWT access_token string.

    Asserts 200 so a login failure surfaces immediately with a clear message
    rather than a confusing KeyError on the next line.
    """
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, (
        f"Login failed for {email} — got {resp.status_code}: {resp.get_json()}"
    )
    return resp.get_json()["data"]["access_token"]


def auth(token):
    """
    Return the Authorization header dict expected by @jwt_required()
    and @require_roles().
    Usage:  client.get("/some/route", headers=auth(token))
    """
    return {"Authorization": f"Bearer {token}"}


def create_resource_api(client, token, name="Test Resource", resource_type="Service"):
    """
    Create an approved, immediately published resource via POST /resources
    (staff-only endpoint that bypasses the moderation queue).

    Returns the 'data' dict from the 201 response.
    Used as a convenience setup step by multiple test classes.
    """
    resp = client.post(
        "/resources",
        json={"name": name, "resource_type": resource_type},
        headers=auth(token),
    )
    assert resp.status_code == 201, (
        f"create_resource_api failed: {resp.status_code} — {resp.get_json()}"
    )
    return resp.get_json()["data"]


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1 — Health checks
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """
    Verify the application factory boots and the DB connection is live.
    These are the Phase 1 checkpoints from the build plan.
    """

    def test_health_returns_200(self, client):
        """GET /health → 200 and status 'ok'. Proves Flask booted correctly."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"

    def test_health_db_returns_200(self, client):
        """
        GET /health/db → 200.
        Proves SQLAlchemy can open a connection and execute SELECT 1
        against the in-memory SQLite test database.
        """
        resp = client.get("/health/db")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Auth: registration
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthRegister:

    def test_register_success_returns_201(self, client):
        """
        Valid payload → 201.
        User data appears in response body.
        password_hash must never be exposed in any response.
        """
        resp = client.post("/auth/register", json={
            "email":      "jane@example.com",
            "password":   "Password1!",
            "first_name": "Jane",
            "last_name":  "Doe",
        })
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["email"] == "jane@example.com"
        assert "password_hash" not in data  # never leak the bcrypt hash

    def test_register_missing_email_returns_422(self, client):
        """
        Missing required field 'email' → 422 with a field-level errors dict.
        Verifies the input validation layer in routes/auth.py.
        """
        resp = client.post("/auth/register", json={
            "password": "Password1!", "first_name": "Jane", "last_name": "Doe",
        })
        assert resp.status_code == 422
        assert "email" in resp.get_json().get("errors", {})

    def test_register_missing_password_returns_422(self, client):
        """Missing 'password' field → 422."""
        resp = client.post("/auth/register", json={
            "email": "nopw@example.com", "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_invalid_email_format_returns_422(self, client):
        """Email string without '@' and domain → 422."""
        resp = client.post("/auth/register", json={
            "email": "notanemail", "password": "Password1!",
            "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_short_password_returns_422(self, client):
        """Password shorter than 8 chars → 422."""
        resp = client.post("/auth/register", json={
            "email": "short@example.com", "password": "abc",
            "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_duplicate_email_returns_409(self, client):
        """
        Registering the same email address twice → 409 Conflict.
        The second request must not silently overwrite the first user.
        """
        payload = {
            "email": "dup@example.com", "password": "Password1!",
            "first_name": "Dup", "last_name": "User",
        }
        client.post("/auth/register", json=payload)          # first  — succeeds
        resp = client.post("/auth/register", json=payload)   # second — collision
        assert resp.status_code == 409

    def test_register_no_json_body_returns_400(self, client):
        """POST /auth/register with a non-JSON body → 400."""
        resp = client.post(
            "/auth/register",
            data="not json",
            content_type="text/plain",
        )
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Auth: login
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthLogin:

    def test_login_success_returns_token_and_cookie(self, client):
        """
        Valid credentials → 200.
        access_token is in the JSON response body (for the Authorization header).
        refresh_token_cookie is in the Set-Cookie header (HttpOnly, for refresh).
        This is the dual-token pattern described in the README.
        """
        make_user("login@example.com", "Password1!")
        resp = client.post("/auth/login", json={
            "email": "login@example.com", "password": "Password1!",
        })
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "access_token" in data
        assert "user" in data
        # Confirm the HttpOnly refresh cookie was set in the response headers
        assert "refresh_token_cookie" in resp.headers.get("Set-Cookie", "")

    def test_login_wrong_password_returns_401(self, client):
        """Correct email, wrong password → 401."""
        make_user("wrongpw@example.com", "CorrectPass!")
        resp = client.post("/auth/login", json={
            "email": "wrongpw@example.com", "password": "WrongPass!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        """
        Email not in DB → 401.
        The dummy-hash path in routes/auth.py ensures the response time is
        identical to a real failed login, preventing user enumeration.
        """
        resp = client.post("/auth/login", json={
            "email": "ghost@example.com", "password": "AnyPassword1!",
        })
        assert resp.status_code == 401

    def test_login_empty_body_returns_422(self, client):
        """POST /auth/login with an empty JSON object → 422."""
        resp = client.post("/auth/login", json={})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Auth: token lifecycle (refresh + logout)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthTokenLifecycle:

    def test_refresh_with_valid_cookie_returns_new_token(self, client):
        """
        POST /auth/login sets the refresh cookie in the test client's cookie jar.
        Subsequent POST /auth/refresh sends that cookie automatically → 200
        with a fresh access_token.
        """
        make_user("refresh@example.com", "Password1!")
        # Login stores the refresh cookie in the test client's cookie jar.
        login_resp = client.post("/auth/login", json={
            "email": "refresh@example.com", "password": "Password1!",
        })
        assert login_resp.status_code == 200

        # Refresh — the test client replays the cookie from its jar.
        refresh_resp = client.post("/auth/refresh")
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.get_json()["data"]

    def test_refresh_without_cookie_returns_401_or_422(self, client):
        """
        A brand-new test client has no cookies (no prior login in this test).
        POST /auth/refresh must be rejected — no cookie means no refresh token.
        Flask-JWT-Extended returns 401 or 422 depending on configuration.
        """
        # client fixture is function-scoped → no cookies from any prior test
        resp = client.post("/auth/refresh")
        assert resp.status_code in (401, 422)

    def test_logout_returns_200_and_clears_cookie(self, client):
        """
        POST /auth/logout → 200.
        unset_refresh_cookies() emits a clearing Set-Cookie header
        (cookie set with expiry in the past or max-age=0).
        """
        make_user("logout@example.com", "Password1!")
        client.post("/auth/login", json={
            "email": "logout@example.com", "password": "Password1!",
        })
        resp = client.post("/auth/logout")
        assert resp.status_code == 200
        # The clearing Set-Cookie must reference the same cookie name
        assert "refresh_token_cookie" in resp.headers.get("Set-Cookie", "")


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3 — RBAC decorator enforcement
# ═══════════════════════════════════════════════════════════════════════════════

class TestRBAC:
    """
    Validates that @require_roles() blocks callers at the correct HTTP status.
    README canonical example: 'Unauthorized user attempts admin action → 403.'
    """

    def test_no_token_returns_401(self, client):
        """
        GET /dashboard/stats with no Authorization header → 401.
        @require_roles internally calls verify_jwt_in_request() which raises
        NoAuthorizationError when no token is present.
        """
        resp = client.get("/dashboard/stats")
        assert resp.status_code == 401

    def test_wrong_role_returns_403(self, client):
        """
        'contributor' role calling a moderator-only endpoint → 403.
        This is the exact scenario described in the README.
        """
        make_user("contrib@example.com", role_name="contributor")
        token = get_token(client, "contrib@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 403

    def test_no_role_assigned_returns_403(self, client):
        """
        Authenticated user with zero roles → 403.
        An empty UserRole table means no role matches the allowed set.
        """
        make_user("norole@example.com")  # no role_name → no UserRole row inserted
        token = get_token(client, "norole@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 403

    def test_correct_role_passes(self, client):
        """Moderator calling /dashboard/stats → 200."""
        make_user("mod@example.com", role_name="moderator")
        token = get_token(client, "mod@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 200

    def test_staff_editor_blocked_from_moderator_route(self, client):
        """
        staff_editor is a lower-privilege role than moderator.
        Calling /dashboard/stats (requires moderator+) → 403.
        """
        make_user("staffonly@example.com", role_name="staff_editor")
        token = get_token(client, "staffonly@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 6 — Categories
# ═══════════════════════════════════════════════════════════════════════════════

class TestCategories:

    def _staff_token(self, client):
        """
        Create a staff_editor user and return their token.
        Each test gets a fresh DB so the same email can be reused across tests.
        """
        make_user("cat_staff@example.com", role_name="staff_editor")
        return get_token(client, "cat_staff@example.com")

    def test_list_categories_public_returns_200(self, client):
        """GET /categories is a public endpoint → 200 with empty list."""
        resp = client.get("/categories")
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["data"], list)

    def test_create_category_without_auth_returns_401(self, client):
        """POST /categories with no Authorization header → 401."""
        resp = client.post("/categories", json={"name": "Food", "slug": "food"})
        assert resp.status_code == 401

    def test_create_category_contributor_forbidden_returns_403(self, client):
        """
        'contributor' is not in the allowed role set for POST /categories → 403.
        Verifies that the categories route RBAC guard is enforced.
        """
        make_user("cat_contrib@example.com", role_name="contributor")
        token = get_token(client, "cat_contrib@example.com")
        resp = client.post(
            "/categories",
            json={"name": "Food", "slug": "food"},
            headers=auth(token),
        )
        assert resp.status_code == 403

    def test_create_category_staff_editor_returns_201(self, client):
        """staff_editor creates a category → 201 with the slug in the response."""
        token = self._staff_token(client)
        resp = client.post(
            "/categories",
            json={"name": "Food Security", "slug": "food-security"},
            headers=auth(token),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["slug"] == "food-security"

    def test_create_category_duplicate_name_returns_409(self, client):
        """Submitting the same category name twice → 409 Conflict."""
        token = self._staff_token(client)
        h = auth(token)
        client.post("/categories", json={"name": "Housing", "slug": "housing"}, headers=h)
        resp = client.post("/categories", json={"name": "Housing", "slug": "housing-2"}, headers=h)
        assert resp.status_code == 409

    def test_update_category_returns_200_with_new_name(self, client):
        """PUT /categories/<id> updates the name field → 200."""
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/categories", json={"name": "Old Name", "slug": "old-name"}, headers=h)
        cat_id = cr.get_json()["data"]["category_id"]

        resp = client.put(f"/categories/{cat_id}", json={"name": "New Name"}, headers=h)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "New Name"

    def test_delete_category_soft_deactivates(self, client):
        """DELETE /categories/<id> sets is_active=False (soft delete, not hard delete)."""
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/categories", json={"name": "Temp", "slug": "temp"}, headers=h)
        cat_id = cr.get_json()["data"]["category_id"]

        resp = client.delete(f"/categories/{cat_id}", headers=h)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_active"] is False

    def test_circular_parent_reference_returns_422(self, client):
        """
        Setting a category's parent_category_id to its own category_id → 422.
        Verifies the circular-reference guard in routes/categories.py.
        """
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/categories", json={"name": "Circ", "slug": "circ"}, headers=h)
        cat_id = cr.get_json()["data"]["category_id"]

        resp = client.put(f"/categories/{cat_id}", json={"parent_category_id": cat_id}, headers=h)
        assert resp.status_code == 422

    def test_update_nonexistent_category_returns_404(self, client):
        """PUT /categories/99999 (does not exist) → 404."""
        token = self._staff_token(client)
        resp = client.put("/categories/99999", json={"name": "X"}, headers=auth(token))
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 6 — Tags
# ═══════════════════════════════════════════════════════════════════════════════

class TestTags:

    def _staff_token(self, client):
        make_user("tag_staff@example.com", role_name="staff_editor")
        return get_token(client, "tag_staff@example.com")

    def test_list_tags_public_returns_200(self, client):
        """GET /tags is a public endpoint → 200."""
        assert client.get("/tags").status_code == 200

    def test_create_tag_returns_201(self, client):
        """staff_editor creates a tag → 201 with name in response."""
        token = self._staff_token(client)
        resp = client.post("/tags", json={"name": "Free", "slug": "free"}, headers=auth(token))
        assert resp.status_code == 201
        assert resp.get_json()["data"]["name"] == "Free"

    def test_create_tag_duplicate_name_returns_409(self, client):
        """Same tag name submitted twice → 409 Conflict."""
        token = self._staff_token(client)
        h = auth(token)
        client.post("/tags", json={"name": "Youth", "slug": "youth"}, headers=h)
        resp = client.post("/tags", json={"name": "Youth", "slug": "youth-2"}, headers=h)
        assert resp.status_code == 409

    def test_update_tag_returns_200_with_new_name(self, client):
        """PUT /tags/<id> updates the name → 200."""
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/tags", json={"name": "Old Tag", "slug": "old-tag"}, headers=h)
        tag_id = cr.get_json()["data"]["tag_id"]

        resp = client.put(f"/tags/{tag_id}", json={"name": "New Tag"}, headers=h)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "New Tag"

    def test_delete_tag_sets_is_active_false(self, client):
        """DELETE /tags/<id> soft-deactivates the tag (is_active=False)."""
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/tags", json={"name": "Seniors", "slug": "seniors"}, headers=h)
        tag_id = cr.get_json()["data"]["tag_id"]

        resp = client.delete(f"/tags/{tag_id}", headers=h)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_active"] is False


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 5 — Resources: public endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class TestResourcesPublic:

    def test_map_missing_lat_lng_returns_400(self, client):
        """GET /resources/map with no query params → 400 (lat/lng are required)."""
        assert client.get("/resources/map").status_code == 400

    def test_map_empty_db_returns_zero_pins(self, client):
        """
        Valid lat/lng provided but no resources in DB → 200 with empty pins.
        Verifies the map endpoint handles an empty dataset without crashing.
        """
        resp = client.get("/resources/map?lat=45.42&lng=-75.69")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["count"] == 0
        assert data["pins"] == []

    def test_map_returns_pin_within_radius(self, client):
        """
        Staff-created resource at Ottawa lat/lng appears in map pins when
        queried from the same coordinates within a 5 km radius.
        """
        make_user("map_staff@example.com", role_name="staff_editor")
        token = get_token(client, "map_staff@example.com")
        client.post("/resources", headers=auth(token), json={
            "name": "Ottawa Food Bank",
            "resource_type": "Service",
            "locations": [{
                "address_line1": "123 Main St",
                "lat": 45.434,
                "lng": -75.622,
                "is_primary": 1,
            }],
        })

        resp = client.get("/resources/map?lat=45.434&lng=-75.622&radius_km=5")
        assert resp.status_code == 200
        pins = resp.get_json()["data"]["pins"]
        assert len(pins) == 1
        assert pins[0]["name"] == "Ottawa Food Bank"

    def test_map_excludes_resource_outside_radius(self, client):
        """
        Resource at Vancouver coordinates does not appear when the query
        is centred on Ottawa with radius_km=50.
        Verifies the Haversine filter is actually rejecting distant points.
        """
        make_user("map_far@example.com", role_name="staff_editor")
        token = get_token(client, "map_far@example.com")
        client.post("/resources", headers=auth(token), json={
            "name": "Vancouver Clinic",
            "resource_type": "Service",
            "locations": [{
                "lat": 49.246,    # Vancouver — ~3 400 km from Ottawa
                "lng": -123.116,
                "is_primary": 1,
            }],
        })

        resp = client.get("/resources/map?lat=45.434&lng=-75.622&radius_km=50")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["count"] == 0

    def test_list_resources_empty_db_returns_empty_list(self, client):
        """GET /resources with no published resources → 200 with empty list."""
        resp = client.get("/resources")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["resources"] == []

    def test_list_resources_returns_published_resource(self, client):
        """
        A staff-created (immediately approved) resource appears in the
        public resource list.
        """
        make_user("list_staff@example.com", role_name="staff_editor")
        token = get_token(client, "list_staff@example.com")
        create_resource_api(client, token, name="Visible Resource")

        resp = client.get("/resources")
        names = [r["name"] for r in resp.get_json()["data"]["resources"]]
        assert "Visible Resource" in names

    def test_get_by_slug_returns_full_detail(self, client):
        """
        GET /resources/slug/<slug> returns the current approved version with
        moderation_status='approved'.
        """
        make_user("slug_staff@example.com", role_name="staff_editor")
        token = get_token(client, "slug_staff@example.com")
        create_resource_api(client, token, name="Slug Detail Test")

        resp = client.get("/resources/slug/slug-detail-test")
        assert resp.status_code == 200
        version = resp.get_json()["data"]["version"]
        assert version["name"] == "Slug Detail Test"
        assert version["moderation_status"] == "approved"

    def test_get_by_slug_not_found_returns_404(self, client):
        """GET /resources/slug/does-not-exist → 404."""
        assert client.get("/resources/slug/does-not-exist").status_code == 404

    def test_get_by_id_not_found_returns_404(self, client):
        """GET /resources/99999 → 404."""
        assert client.get("/resources/99999").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 5 — Resources: staff CRUD
# ═══════════════════════════════════════════════════════════════════════════════

class TestResourcesStaffCRUD:

    def test_create_no_auth_returns_401(self, client):
        """
        POST /resources with no token → 401.
        @require_roles calls verify_jwt_in_request() which raises
        NoAuthorizationError when the header is absent.
        """
        resp = client.post("/resources", json={"name": "X", "resource_type": "Service"})
        assert resp.status_code == 401

    def test_create_contributor_role_returns_403(self, client):
        """
        'contributor' is not in the allowed set for POST /resources → 403.
        Only staff_editor and administrator can create resources directly.
        """
        make_user("res_contrib@example.com", role_name="contributor")
        token = get_token(client, "res_contrib@example.com")
        resp = client.post(
            "/resources",
            json={"name": "X", "resource_type": "Service"},
            headers=auth(token),
        )
        assert resp.status_code == 403

    def test_create_resource_returns_201_with_slug(self, client):
        """
        staff_editor creates a resource → 201.
        Response contains resource_id and the auto-generated slug.
        """
        make_user("res_staff@example.com", role_name="staff_editor")
        token = get_token(client, "res_staff@example.com")
        resp = client.post(
            "/resources",
            json={"name": "Rideau Food Bank", "resource_type": "Service"},
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert "resource_id" in data
        assert data["slug"] == "rideau-food-bank"

    def test_create_resource_missing_name_returns_422(self, client):
        """POST /resources without the required 'name' field → 422."""
        make_user("res_staff2@example.com", role_name="staff_editor")
        token = get_token(client, "res_staff2@example.com")
        resp = client.post(
            "/resources",
            json={"resource_type": "Service"},
            headers=auth(token),
        )
        assert resp.status_code == 422

    def test_update_creates_second_version_and_repoints_pointer(self, client, app):
        """
        PUT /resources/<id> must NOT mutate the existing ResourceVersion.
        It must create a new row and update current_approved_version_id.
        This is the core draft-and-versioning invariant from the README.

        DB assertions (direct ORM queries after HTTP calls):
          - Two ResourceVersion rows for the same resource_id
          - Resource.current_version.name == the NEW name
        """
        make_user("upd_staff@example.com", role_name="staff_editor")
        token = get_token(client, "upd_staff@example.com")
        resource_id = create_resource_api(client, token, name="Original Name")["resource_id"]

        update_resp = client.put(
            f"/resources/{resource_id}",
            json={"name": "Updated Name", "resource_type": "Organization"},
            headers=auth(token),
        )
        assert update_resp.status_code == 200

        # Force SQLAlchemy to re-fetch from DB (not use cached session state)
        db.session.expire_all()

        versions = ResourceVersion.query.filter_by(resource_id=resource_id).all()
        assert len(versions) == 2  # original + updated

        resource = Resource.query.get(resource_id)
        assert resource.current_version.name == "Updated Name" # type: ignore

    def test_delete_soft_deletes_and_hides_from_public(self, client, app):
        """
        DELETE /resources/<id> (administrator only) sets deleted_at timestamp.
        The resource disappears from public endpoints but the DB row is preserved.
        README: soft-delete via deleted_at field.
        """
        make_user("del_admin@example.com", role_name="administrator")
        token = get_token(client, "del_admin@example.com")
        resource_id = create_resource_api(client, token, name="To Be Deleted")["resource_id"]

        del_resp = client.delete(f"/resources/{resource_id}", headers=auth(token))
        assert del_resp.status_code == 200

        # Public endpoint can no longer locate it
        assert client.get(f"/resources/{resource_id}").status_code == 404

        # Row still exists in DB with deleted_at set (audit trail intact)
        db.session.expire_all()
        resource = Resource.query.get(resource_id)
        assert resource is not None
        assert resource.deleted_at is not None

    def test_delete_requires_administrator_not_staff_editor(self, client):
        """
        staff_editor calling DELETE /resources/<id> → 403.
        Only administrator is in the allowed set for the delete route.
        """
        make_user("del_staff@example.com", role_name="staff_editor")
        token = get_token(client, "del_staff@example.com")
        resource_id = create_resource_api(client, token, name="Not For Staff To Delete")["resource_id"]

        resp = client.delete(f"/resources/{resource_id}", headers=auth(token))
        assert resp.status_code == 403

    def test_duplicate_name_generates_slug_with_suffix(self, client):
        """
        Two resources with the same name → first gets 'food-bank', second gets
        'food-bank-2'. Validates generate_unique_slug() recursive collision handling.
        """
        make_user("slug_coll@example.com", role_name="staff_editor")
        token = get_token(client, "slug_coll@example.com")

        d1 = create_resource_api(client, token, name="Food Bank")
        d2 = create_resource_api(client, token, name="Food Bank")

        assert d1["slug"] == "food-bank"
        assert d2["slug"] == "food-bank-2"


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 7 — Submissions: create  (Flow A and Flow B)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSubmissionsCreate:

    def test_flow_a_new_resource_returns_201(self, client, app):
        """
        Flow A — anonymous submits a new_resource.
        Expected DB state:
          Resource.is_active                    = 0  (not published yet)
          ResourceVersion.moderation_status     = 'pending_review'
        README example: 'Create new resource → Resource stored with Pending status'
        """
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Community Kitchen",
            "resource_type":   "Program",
            "submitter_name":  "Alice Smith",
        })
        assert resp.status_code == 201
        d = resp.get_json()["data"]

        # Verify the DB state directly (not just the HTTP response)
        resource = Resource.query.get(d["resource_id"])
        version  = ResourceVersion.query.get(d["proposed_version_id"])
        assert resource.is_active == 0 # type: ignore
        assert version.moderation_status == "pending_review" # type: ignore

    def test_flow_a_community_asset_returns_201(self, client):
        """'community_asset' is a valid Flow A submission_type → 201."""
        resp = client.post("/submissions", json={
            "submission_type": "community_asset",
            "name":            "Volunteer Knitters",
            "resource_type":   "Volunteer Skill",
        })
        assert resp.status_code == 201

    def test_missing_submission_type_returns_400(self, client):
        """No submission_type field → 400."""
        resp = client.post("/submissions", json={"name": "Something"})
        assert resp.status_code == 400

    def test_invalid_submission_type_returns_400(self, client):
        """submission_type not in the valid enum → 400."""
        resp = client.post("/submissions", json={
            "submission_type": "hack_the_planet",
            "name":            "Something",
        })
        assert resp.status_code == 400

    def test_missing_name_returns_400(self, client):
        """Valid submission_type but 'name' missing → 400."""
        resp = client.post("/submissions", json={"submission_type": "new_resource"})
        assert resp.status_code == 400

    def test_flow_b_missing_resource_id_returns_400(self, client):
        """update_resource without resource_id → 400 (required for Flow B)."""
        resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "name":            "Update Attempt",
        })
        assert resp.status_code == 400

    def test_flow_b_nonexistent_resource_returns_404(self, client):
        """update_resource with a resource_id that does not exist → 404."""
        resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "name":            "Update Attempt",
            "resource_id":     999999,
        })
        assert resp.status_code == 404

    def test_get_submissions_without_auth_returns_401(self, client):
        """GET /submissions with no token → 401."""
        assert client.get("/submissions").status_code == 401

    def test_moderator_sees_pending_submission_in_queue(self, client):
        """
        After a public anonymous submission, a moderator querying
        GET /submissions sees it with moderation_status='pending_review'.
        """
        client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Pending Resource",
            "resource_type":   "Service",
        })
        make_user("q_mod@example.com", role_name="moderator")
        token = get_token(client, "q_mod@example.com")

        resp = client.get("/submissions", headers=auth(token))
        assert resp.status_code == 200
        items = resp.get_json()["data"]["items"]
        assert len(items) >= 1
        assert all(i["moderation_status"] == "pending_review" for i in items)


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 7 — Submission review: the 5-table atomic transaction
# ═══════════════════════════════════════════════════════════════════════════════

class TestSubmissionReview:
    """
    These tests verify the most critical block in the entire backend:
    the review_submission() function that commits 5 table changes atomically.

    APPROVE path side-effects verified:
      1. ResourceVersion.moderation_status   → 'approved'
      2. ResourceVersion.approved_at         → timestamp set
      3. Resource.current_approved_version_id → points to the approved version
      4. Resource.is_active                  → 1  (for new_resource / community_asset)
      5. Submission.moderation_status        → 'approved'
      6. SubmissionReview row inserted
      7. ResourceChangeLog row with change_type='approved_submission'
    """

    # ── internal helpers ──────────────────────────────────────────────────────

    def _submit_new(self, client, name="Test Org"):
        """
        POST /submissions (anonymous, Flow A) and return
        (submission_id, resource_id, proposed_version_id).
        """
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            name,
            "resource_type":   "Organization",
        })
        assert resp.status_code == 201, resp.get_json()
        d = resp.get_json()["data"]
        return d["submission_id"], d["resource_id"], d["proposed_version_id"]

    def _mod_token(self, client):
        """Create a moderator user and return their JWT."""
        make_user("rev_mod@example.com", role_name="moderator")
        return get_token(client, "rev_mod@example.com")

    # ── approve path ──────────────────────────────────────────────────────────

    def test_approve_publishes_resource_and_writes_all_rows(self, client, app):
        """
        Full approval lifecycle — asserts all 7 DB side-effects listed above.
        README example: 'Approve resource → Status updated to Published.'
        """
        sub_id, res_id, ver_id = self._submit_new(client, "Approve Me")
        token = self._mod_token(client)

        resp = client.post(
            f"/submissions/{sub_id}/review",
            json={"decision": "approved", "notes": "Looks good"},
            headers=auth(token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["decision"] == "approved"

        # Force a fresh DB read — don't rely on SQLAlchemy's identity map cache
        db.session.expire_all()

        version  = ResourceVersion.query.get(ver_id)
        resource = Resource.query.get(res_id)
        sub      = Submission.query.get(sub_id)

        assert version.moderation_status == "approved"           # pyright: ignore[reportOptionalMemberAccess] # side-effect 1
        assert version.approved_at is not None                   # type: ignore # side-effect 2
        assert resource.current_approved_version_id == ver_id   # pyright: ignore[reportOptionalMemberAccess] # side-effect 3
        assert resource.is_active == 1                           # pyright: ignore[reportOptionalMemberAccess] # side-effect 4
        assert sub.moderation_status == "approved"               # type: ignore # side-effect 5

        reviews = SubmissionReview.query.filter_by(submission_id=sub_id).all()
        assert len(reviews) == 1                                  # side-effect 6

        logs = ResourceChangeLog.query.filter_by(resource_id=res_id).all()
        assert any(log.change_type == "approved_submission" for log in logs)  # side-effect 7

    def test_approve_makes_resource_appear_in_public_list(self, client):
        """After approval, resource is visible in GET /resources."""
        sub_id, _, _ = self._submit_new(client, "Listed After Approval")
        token = self._mod_token(client)
        client.post(f"/submissions/{sub_id}/review",
                    json={"decision": "approved"}, headers=auth(token))

        names = [r["name"] for r in client.get("/resources").get_json()["data"]["resources"]]
        assert "Listed After Approval" in names

    def test_approve_with_location_shows_pin_on_map(self, client):
        """
        End-to-end map test:
          Submit with lat/lng → Approve → pin returned by GET /resources/map.
        """
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Mapped After Approval",
            "resource_type":   "Service",
            "locations": [{
                "address": "1 Main",
                "city":    "Ottawa",
                "lat":     45.434,
                "lng":     -75.622,
            }],
        })
        sub_id = resp.get_json()["data"]["submission_id"]

        make_user("map_mod@example.com", role_name="moderator")
        token = get_token(client, "map_mod@example.com")
        client.post(f"/submissions/{sub_id}/review",
                    json={"decision": "approved"}, headers=auth(token))

        pins = client.get(
            "/resources/map?lat=45.434&lng=-75.622&radius_km=5"
        ).get_json()["data"]["pins"]
        assert any(p["name"] == "Mapped After Approval" for p in pins)

    # ── reject path ───────────────────────────────────────────────────────────

    def test_reject_leaves_resource_inactive(self, client, app):
        """
        Submit → Reject.
        Resource stays is_active=0.
        current_approved_version_id stays None (pointer not touched).
        version.moderation_status = 'rejected'.
        """
        sub_id, res_id, ver_id = self._submit_new(client, "Reject Me")
        token = self._mod_token(client)

        resp = client.post(
            f"/submissions/{sub_id}/review",
            json={"decision": "rejected", "notes": "Duplicate listing"},
            headers=auth(token),
        )
        assert resp.status_code == 200

        db.session.expire_all()

        resource = Resource.query.get(res_id)
        version  = ResourceVersion.query.get(ver_id)
        sub      = Submission.query.get(sub_id)

        assert resource.is_active == 0 # type: ignore
        assert resource.current_approved_version_id is None # type: ignore
        assert version.moderation_status == "rejected" # type: ignore
        assert sub.moderation_status == "rejected" # type: ignore

    # ── guard tests ───────────────────────────────────────────────────────────

    def test_double_review_returns_422(self, client):
        """
        Attempting to review a submission that is already reviewed → 422.
        The endpoint must check the current moderation_status before acting.
        """
        sub_id, _, _ = self._submit_new(client, "Double Review")
        token = self._mod_token(client)

        client.post(f"/submissions/{sub_id}/review",
                    json={"decision": "approved"}, headers=auth(token))
        resp = client.post(f"/submissions/{sub_id}/review",
                           json={"decision": "rejected"}, headers=auth(token))
        assert resp.status_code == 422

    def test_invalid_decision_string_returns_400(self, client):
        """decision must be 'approved' or 'rejected'. Any other string → 400."""
        sub_id, _, _ = self._submit_new(client, "Bad Decision")
        token = self._mod_token(client)
        resp = client.post(f"/submissions/{sub_id}/review",
                           json={"decision": "maybe"}, headers=auth(token))
        assert resp.status_code == 400

    def test_review_nonexistent_submission_returns_404(self, client):
        """POST /submissions/99999/review → 404."""
        make_user("ghost_mod@example.com", role_name="moderator")
        token = get_token(client, "ghost_mod@example.com")
        resp = client.post("/submissions/99999/review",
                           json={"decision": "approved"}, headers=auth(token))
        assert resp.status_code == 404

    def test_review_requires_moderator_role(self, client):
        """contributor calling POST /submissions/<id>/review → 403."""
        sub_id, _, _ = self._submit_new(client, "Role Guard Test")
        make_user("rev_contrib@example.com", role_name="contributor")
        token = get_token(client, "rev_contrib@example.com")
        resp = client.post(f"/submissions/{sub_id}/review",
                           json={"decision": "approved"}, headers=auth(token))
        assert resp.status_code == 403

    # ── Flow B end-to-end ─────────────────────────────────────────────────────

    def test_flow_b_approve_moves_version_pointer(self, client, app):
        """
        Full Flow B lifecycle:
          1. Staff creates a resource directly → v1 approved, resource active.
          2. Public submits an update via POST /submissions → v2 pending.
          3. Moderator approves → current_approved_version_id moves v1 → v2.
          4. Public detail endpoint returns the v2 name.
        """
        # Step 1: staff creates resource (immediately approved, no queue)
        make_user("fb_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "fb_staff@example.com")
        resource_id = create_resource_api(client, staff_token, name="Flow B Original")["resource_id"]

        db.session.expire_all()
        v1_id = Resource.query.get(resource_id).current_approved_version_id # type: ignore

        # Step 2: public submits an update for the existing resource
        update_resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "resource_id":     resource_id,
            "name":            "Flow B Updated",
            "resource_type":   "Organization",
        })
        assert update_resp.status_code == 201
        sub_id = update_resp.get_json()["data"]["submission_id"]
        v2_id  = update_resp.get_json()["data"]["proposed_version_id"]

        # Step 3: moderator approves the update
        make_user("fb_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "fb_mod@example.com")
        client.post(f"/submissions/{sub_id}/review",
                    json={"decision": "approved"}, headers=auth(mod_token))

        db.session.expire_all()
        resource_after = Resource.query.get(resource_id)
        assert resource_after.current_approved_version_id == v2_id   # type: ignore # pointer moved
        assert resource_after.current_approved_version_id != v1_id   # type: ignore # old pointer gone

        # Step 4: public detail reflects the new name
        detail = client.get(f"/resources/{resource_id}").get_json()["data"]
        assert detail["version"]["name"] == "Flow B Updated"


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 8 — Issues
# ═══════════════════════════════════════════════════════════════════════════════

class TestIssues:
    """
    BUG-1 — routes/issues.py (rate-limit guard is inverted)
    ──────────────────────────────────────────────────────────────────────────
    BUGGY code (current):
        if check_and_increment_rate_limit(ip_hash):
            return err("Rate limit exceeded. Try again later.", 429)

    check_and_increment_rate_limit() returns True when the request IS allowed
    and False when it IS denied. The condition above therefore fires 429 when
    the request is allowed and passes when it is denied — the exact opposite of
    the intended behaviour.

    CORRECT code (matching submissions.py):
        if not check_and_increment_rate_limit(ip_hash):
            return err("Rate limit exceeded. Try again later.", 429)

    Fix: add the word "not" — a one-character change in routes/issues.py.

    Impact: every anonymous POST /issues immediately returns 429.
    Tests for anonymous creation are marked @pytest.mark.xfail(strict=True).
    strict=True means pytest will report XPASS (unexpected pass) and fail the
    suite if the test starts passing, reminding you to remove the marker.
    Authenticated issue creation is unaffected and tested without xfail.
    ──────────────────────────────────────────────────────────────────────────
    """

    def _published_resource(self, client):
        """
        Create and return the resource_id of a staff-created published resource.
        Staff_editor creates resources that are immediately approved (no queue).
        """
        make_user("iss_staff@example.com", role_name="staff_editor")
        token = get_token(client, "iss_staff@example.com")
        return create_resource_api(client, token, name="Issue Target")["resource_id"]

    def test_create_issue_authenticated_returns_201(self, client):
        """
        Authenticated users bypass the anonymous rate-limiter entirely.
        Valid issue against a real resource → 201 with issue_id.
        """
        res_id = self._published_resource(client)
        make_user("reporter@example.com")
        token = get_token(client, "reporter@example.com")

        resp = client.post("/issues", json={
            "resource_id": res_id,
            "description": "The phone number listed is wrong.",
            "issue_type":  "wrong_info",
        }, headers=auth(token))
        assert resp.status_code == 201
        assert "issue_id" in resp.get_json()["data"]


    def test_create_issue_anonymous_should_return_201(self, client):
        """
        EXPECTED correct behaviour (currently broken by BUG-1):
        An anonymous caller with no prior rate-limit hits reports an issue → 201.
        Currently returns 429 on the very first call due to the inverted guard.
        """
        res_id = self._published_resource(client)
        resp = client.post("/issues", json={
            "resource_id": res_id,
            "description": "This location has permanently closed.",
        })
        assert resp.status_code == 201  # fails until BUG-1 is fixed

    def test_create_issue_missing_resource_id_returns_400(self, client):
        """POST /issues without resource_id → 400."""
        make_user("miss_res@example.com")
        token = get_token(client, "miss_res@example.com")
        resp = client.post("/issues",
                           json={"description": "Something wrong"},
                           headers=auth(token))
        assert resp.status_code == 400

    def test_create_issue_missing_description_returns_400(self, client):
        """POST /issues without description → 400."""
        res_id = self._published_resource(client)
        make_user("miss_desc@example.com")
        token = get_token(client, "miss_desc@example.com")
        resp = client.post("/issues",
                           json={"resource_id": res_id},
                           headers=auth(token))
        assert resp.status_code == 400

    def test_create_issue_nonexistent_resource_returns_404(self, client):
        """Reporting against a resource_id that does not exist → 404."""
        make_user("ghost_rep@example.com")
        token = get_token(client, "ghost_rep@example.com")
        resp = client.post("/issues",
                           json={"resource_id": 999999, "description": "Doesn't exist"},
                           headers=auth(token))
        assert resp.status_code == 404

    def test_list_issues_without_auth_returns_401(self, client):
        """GET /issues with no Authorization header → 401."""
        assert client.get("/issues").status_code == 401

    def test_list_issues_moderator_returns_200(self, client):
        """Moderator can GET /issues → 200 with an 'items' key in data."""
        make_user("list_mod@example.com", role_name="moderator")
        token = get_token(client, "list_mod@example.com")
        resp = client.get("/issues", headers=auth(token))
        assert resp.status_code == 200
        assert "items" in resp.get_json()["data"]

    def test_resolve_issue_sets_status_and_resolved_at(self, client, app):
        """
        Moderator resolves an issue.
        Expected DB state: status='resolved', resolved_at is not None.
        """
        res_id = self._published_resource(client)
        make_user("res_rep@example.com")
        rep_token = get_token(client, "res_rep@example.com")

        issue_id = client.post("/issues", json={
            "resource_id": res_id,
            "description": "Hours listed are wrong.",
        }, headers=auth(rep_token)).get_json()["data"]["issue_id"]

        make_user("res_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "res_mod@example.com")
        resp = client.put(
            f"/issues/{issue_id}/resolve",
            json={"resolution_notes": "Hours have been corrected."},
            headers=auth(mod_token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["status"] == "resolved"

        # Verify in DB
        db.session.expire_all()
        issue = ReportedIssue.query.get(issue_id)
        assert issue.status == "resolved" # type: ignore
        assert issue.resolved_at is not None # type: ignore

    def test_resolve_already_resolved_returns_422(self, client):
        """Resolving an issue that is already resolved → 422 Unprocessable Entity."""
        res_id = self._published_resource(client)
        make_user("dup_rep@example.com")
        rep_token = get_token(client, "dup_rep@example.com")

        issue_id = client.post("/issues", json={
            "resource_id": res_id, "description": "Dup resolve test",
        }, headers=auth(rep_token)).get_json()["data"]["issue_id"]

        make_user("dup_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "dup_mod@example.com")
        client.put(f"/issues/{issue_id}/resolve", json={}, headers=auth(mod_token))  # first  — ok
        resp = client.put(f"/issues/{issue_id}/resolve", json={}, headers=auth(mod_token))  # second — conflict
        assert resp.status_code == 422

    def test_resolve_nonexistent_issue_returns_404(self, client):
        """PUT /issues/99999/resolve → 404."""
        make_user("res404_mod@example.com", role_name="moderator")
        token = get_token(client, "res404_mod@example.com")
        resp = client.put("/issues/99999/resolve", json={}, headers=auth(token))
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 8 — Dashboard stats
# ═══════════════════════════════════════════════════════════════════════════════

class TestDashboard:

    def test_dashboard_requires_auth(self, client):
        """GET /dashboard/stats with no token → 401."""
        assert client.get("/dashboard/stats").status_code == 401

    def test_dashboard_contributor_returns_403(self, client):
        """'contributor' role is below moderator threshold → 403."""
        make_user("dash_contrib@example.com", role_name="contributor")
        token = get_token(client, "dash_contrib@example.com")
        assert client.get("/dashboard/stats", headers=auth(token)).status_code == 403

    def test_dashboard_staff_editor_returns_403(self, client):
        """'staff_editor' role is also below moderator threshold → 403."""
        make_user("dash_staff@example.com", role_name="staff_editor")
        token = get_token(client, "dash_staff@example.com")
        assert client.get("/dashboard/stats", headers=auth(token)).status_code == 403

    def test_dashboard_administrator_returns_200(self, client):
        """'administrator' satisfies the moderator+ requirement → 200."""
        make_user("d_admin@example.com", role_name="administrator")
        token = get_token(client, "d_admin@example.com")
        assert client.get("/dashboard/stats", headers=auth(token)).status_code == 200

    def test_dashboard_stats_reflect_known_data(self, client):
        """
        Create a known dataset, then verify each dashboard counter is accurate.
          1 published resource  → published_resources >= 1
          1 pending submission  → pending_submissions >= 1
          2 users created       → total_users >= 2
          Keys 'open_issues' and 'total_resources' must be present.
        """
        make_user("d_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "d_mod@example.com")

        make_user("d_creator@example.com", role_name="staff_editor")
        staff_token = get_token(client, "d_creator@example.com")

        # One published resource (staff direct-create bypasses queue → is_active=1)
        create_resource_api(client, staff_token, name="Dashboard Resource")

        # One pending submission (anonymous Flow A → pending_review)
        client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Pending Org",
            "resource_type":   "Organization",
        })

        resp = client.get("/dashboard/stats", headers=auth(mod_token))
        assert resp.status_code == 200
        stats = resp.get_json()["data"]

        assert stats["published_resources"] >= 1
        assert stats["pending_submissions"] >= 1
        assert stats["total_users"]         >= 2
        assert "open_issues"     in stats
        assert "total_resources" in stats


# ═══════════════════════════════════════════════════════════════════════════════
# Rate limiting  (Phase 3 utility + Phase 7 submissions gate)
# ═══════════════════════════════════════════════════════════════════════════════

class TestRateLimit:
    """
    RATE_LIMIT_MAX_SUBMISSIONS = 5 is hardcoded in utils.py.
    TestingConfig's RATELIMIT_MAX_OVERRIDE = 999 is not read by the application
    code and therefore has no effect (see module docstring for fix).

    Each test has a fresh DB so the rate-limit counter (submission_rate_limits
    table) starts at 0 for every test function. The Flask test client always
    sends requests from 127.0.0.1, so all anonymous calls in one test share
    the same IP hash.
    """

    def test_sixth_anonymous_submission_returns_429(self, client):
        """
        Submissions 1-5 (same anonymous IP) → 201 each.
        Submission 6                         → 429 Too Many Requests.
        Confirms the submissions.py guard ('if not check_and_increment…') works.
        """
        for i in range(1, 6):
            resp = client.post("/submissions", json={
                "submission_type": "new_resource",
                "name":            f"Rate Limit Resource {i}",
                "resource_type":   "Service",
            })
            assert resp.status_code == 201, (
                f"Submission {i}/5 unexpectedly failed: {resp.get_json()}"
            )

        # 6th call from the same IP hash must be blocked
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Rate Limit Resource 6",
            "resource_type":   "Service",
        })
        assert resp.status_code == 429

    def test_authenticated_user_bypasses_rate_limit(self, client):
        """
        Authenticated users are not subject to the anonymous IP rate limiter.
        7 consecutive authenticated submissions → all 201, none blocked.
        """
        make_user("power_user@example.com")
        token = get_token(client, "power_user@example.com")

        for i in range(1, 8):  # 7 calls — two more than the anonymous limit of 5
            resp = client.post("/submissions", json={
                "submission_type": "new_resource",
                "name":            f"Auth Submission {i}",
                "resource_type":   "Service",
            }, headers=auth(token))
            assert resp.status_code == 201, (
                f"Authenticated submission {i}/7 was unexpectedly blocked: {resp.get_json()}"
            )