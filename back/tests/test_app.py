# pyright: ignore[reportCallIssue, reportOptionalMemberAccess, reportCallIssue]
# type: ignore
"""
Phase 9, Automated Test Suite
RRCRC Community Asset Mapping Platform, Backend

Coverage map (Phase -> Test class)
-----------------------------------
  Phase 1  ->  TestHealth
  Phase 4  ->  TestAuthRegister, TestAuthLogin, TestAuthTokenLifecycle, TestAuthMe
  Phase 3  ->  TestRBAC
  Phase 6  ->  TestCategories, TestTags
  Phase 5  ->  TestResourcesPublic, TestResourcesStaffCRUD, TestResourceFilters,
               TestResourceUpdateGuards
  Phase 7  ->  TestSubmissionsCreate, TestSubmissionReview, TestSubmissionComparison
  Phase 8  ->  TestIssues, TestDashboard
  Phase 3  ->  TestRateLimit

"""
import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db, bcrypt
from app.models import (
    Category,
    PasswordResetToken,
    ReportedIssue,
    Resource,
    ResourceChangeLog,
    ResourceVersion,
    ResourceVersionCategory,
    Role,
    SkillsFollowUp,
    Submission,
    SubmissionReview,
    User,
    UserRole,
)


# =================================================================================
# Shared helper functions  (plain functions, NOT pytest fixtures)
# =================================================================================

def make_user(email, password="Password1!", role_name=None,
              first_name="Test", last_name="User"):
    """
    Insert a User directly into the active DB session and optionally assign
    a role by name.

    Bypasses POST /auth/register intentionally, tests that are not about
    registration should not depend on that endpoint working correctly.

    Must be called inside an active app context (guaranteed when the `client`
    or `app` fixture is in scope, because conftest.py wraps the yield inside
    `with flask_app.app_context()`).

    Returns the committed User ORM object.
    """
    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(
        email=email,  # type: ignore
        password_hash=pw_hash,  # type: ignore
        first_name=first_name,  # type: ignore
        last_name=last_name,  # type: ignore
        is_active=1,  # type: ignore
    )
    db.session.add(user)
    db.session.flush()  # obtain user_id before the FK insert below

    if role_name:
        role = Role.query.filter_by(role_name=role_name).first()
        assert role is not None, (
            f"Role '{role_name}' not found, did conftest.py seed roles correctly?"
        )
        db.session.add(UserRole(user_id=user.user_id, role_id=role.role_id))  # type: ignore

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
        f"Login failed for {email}, got {resp.status_code}: {resp.get_json()}"
    )
    return resp.get_json()["data"]["access_token"]


def auth(token):
    """
    Return the Authorization header dict expected by @jwt_required()
    and @require_roles().
    Usage:  client.get("/some/route", headers=auth(token))
    """
    return {"Authorization": f"Bearer {token}"}


def create_resource_api(client, token, name="Test Resource", resource_type="Service", **extra):
    """
    Create an approved, immediately published resource via POST /resources
    (staff-only endpoint that bypasses the moderation queue).

    Returns the 'data' dict from the 201 response.
    Used as a convenience setup step by multiple test classes.
    """
    payload = {"name": name, "resource_type": resource_type, **extra}
    resp = client.post("/resources", json=payload, headers=auth(token))
    assert resp.status_code == 201, (
        f"create_resource_api failed: {resp.status_code}, {resp.get_json()}"
    )
    return resp.get_json()["data"]


# =================================================================================
# Phase 1, Health checks
# =================================================================================

class TestHealth:
    """
    Verify the application factory boots and the DB connection is live.
    These are the Phase 1 checkpoints from the build plan.
    """

    def test_health_returns_200(self, client):
        """GET /health -> 200 and status 'ok'. Proves Flask booted correctly."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"

    def test_health_db_returns_200(self, client):
        """
        GET /health/db -> 200.
        Proves SQLAlchemy can open a connection and execute SELECT 1
        against the in-memory SQLite test database.
        """
        resp = client.get("/health/db")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"


# =================================================================================
# Phase 4, Auth: registration
# =================================================================================

class TestAuthRegister:

    def test_register_success_returns_201(self, client):
        """
        Valid payload -> 201.
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
        Missing required field 'email' -> 422 with a field-level errors dict.
        Verifies the input validation layer in routes/auth.py.
        """
        resp = client.post("/auth/register", json={
            "password": "Password1!", "first_name": "Jane", "last_name": "Doe",
        })
        assert resp.status_code == 422
        assert "email" in resp.get_json().get("errors", {})

    def test_register_missing_password_returns_422(self, client):
        """Missing 'password' field -> 422."""
        resp = client.post("/auth/register", json={
            "email": "nopw@example.com", "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_invalid_email_format_returns_422(self, client):
        """Email string without '@' and domain -> 422."""
        resp = client.post("/auth/register", json={
            "email": "notanemail", "password": "Password1!",
            "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_short_password_returns_422(self, client):
        """Password shorter than 8 chars -> 422."""
        resp = client.post("/auth/register", json={
            "email": "short@example.com", "password": "abc",
            "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 422

    def test_register_duplicate_email_returns_409(self, client):
        """
        Registering the same email address twice -> 409 Conflict.
        The second request must not silently overwrite the first user.
        """
        payload = {
            "email": "dup@example.com", "password": "Password1!",
            "first_name": "Dup", "last_name": "User",
        }
        client.post("/auth/register", json=payload)          # first , succeeds
        resp = client.post("/auth/register", json=payload)   # second, collision
        assert resp.status_code == 409

    def test_register_no_json_body_returns_400(self, client):
        """POST /auth/register with a non-JSON body -> 400."""
        resp = client.post(
            "/auth/register",
            data="not json",
            content_type="text/plain",
        )
        assert resp.status_code == 400


# =================================================================================
# Phase 4, Auth: login
# =================================================================================

class TestAuthLogin:

    def test_login_success_returns_token_and_cookie(self, client):
        """
        Valid credentials -> 200.
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
        """Correct email, wrong password -> 401."""
        make_user("wrongpw@example.com", "CorrectPass!")
        resp = client.post("/auth/login", json={
            "email": "wrongpw@example.com", "password": "WrongPass!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        """
        Email not in DB -> 401.
        The dummy-hash path in routes/auth.py ensures the response time is
        identical to a real failed login, preventing user enumeration.
        """
        resp = client.post("/auth/login", json={
            "email": "ghost@example.com", "password": "AnyPassword1!",
        })
        assert resp.status_code == 401

    def test_login_empty_body_returns_422(self, client):
        """POST /auth/login with an empty JSON object -> 422."""
        resp = client.post("/auth/login", json={})
        assert resp.status_code == 422


# =================================================================================
# Phase 4, Auth: token lifecycle (refresh + logout)
# =================================================================================

class TestAuthTokenLifecycle:

    def test_refresh_with_valid_cookie_returns_new_token(self, client):
        """
        POST /auth/login sets the refresh cookie in the test client's cookie jar.
        Subsequent POST /auth/refresh sends that cookie automatically -> 200
        with a fresh access_token.
        """
        make_user("refresh@example.com", "Password1!")
        # Login stores the refresh cookie in the test client's cookie jar.
        login_resp = client.post("/auth/login", json={
            "email": "refresh@example.com", "password": "Password1!",
        })
        assert login_resp.status_code == 200

        # Refresh, the test client replays the cookie from its jar.
        refresh_resp = client.post("/auth/refresh")
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.get_json()["data"]

    def test_refresh_without_cookie_returns_401_or_422(self, client):
        """
        A brand-new test client has no cookies (no prior login in this test).
        POST /auth/refresh must be rejected, no cookie means no refresh token.
        Flask-JWT-Extended returns 401 or 422 depending on configuration.
        """
        # client fixture is function-scoped -> no cookies from any prior test
        resp = client.post("/auth/refresh")
        assert resp.status_code in (401, 422)

    def test_logout_returns_200_and_clears_cookie(self, client):
        """
        POST /auth/logout -> 200.
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


# =================================================================================
# Phase 4, Auth: GET /auth/me  (D2, new)
# =================================================================================

class TestAuthMe:
    """
    D2: lets the frontend reconstruct profile/roles after a reload using
    only the access token, instead of forcing a full re-login.
    """

    def test_me_without_token_returns_401(self, client):
        """GET /auth/me with no Authorization header -> 401."""
        assert client.get("/auth/me").status_code == 401

    def test_me_with_malformed_token_returns_401(self, client):
        """A garbage bearer token -> 401 via the JWT error handler, not a 500."""
        resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert resp.status_code == 401

    def test_me_returns_current_user_with_roles(self, client):
        """Valid access token -> 200 with user_id, email, and roles; no password_hash."""
        make_user("me@example.com", "Password1!", role_name="staff_editor")
        token = get_token(client, "me@example.com")
        resp = client.get("/auth/me", headers=auth(token))
        assert resp.status_code == 200
        user = resp.get_json()["data"]["user"]
        assert user["email"] == "me@example.com"
        assert "staff_editor" in user["roles"]
        assert "password_hash" not in user

    def test_me_after_refresh_still_works(self, client):
        """
        The exact frontend scenario D2 exists for: log in, refresh, then call
        /auth/me using only the freshly minted access token.
        """
        make_user("refreshme@example.com", "Password1!")
        client.post("/auth/login", json={
            "email": "refreshme@example.com", "password": "Password1!",
        })
        new_token = client.post("/auth/refresh").get_json()["data"]["access_token"]
        resp = client.get("/auth/me", headers=auth(new_token))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["user"]["email"] == "refreshme@example.com"


# =================================================================================
# Phase 3, RBAC decorator enforcement
# =================================================================================

class TestRBAC:
    """
    Validates that @require_roles() blocks callers at the correct HTTP status.
    README canonical example: 'Unauthorized user attempts admin action -> 403.'
    """

    def test_no_token_returns_401(self, client):
        """
        GET /dashboard/stats with no Authorization header -> 401.
        @require_roles internally calls verify_jwt_in_request() which raises
        NoAuthorizationError when no token is present.
        """
        resp = client.get("/dashboard/stats")
        assert resp.status_code == 401

    def test_wrong_role_returns_403(self, client):
        """
        'contributor' role calling a moderator-only endpoint -> 403.
        This is the exact scenario described in the README.
        """
        make_user("contrib@example.com", role_name="contributor")
        token = get_token(client, "contrib@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 403

    def test_no_role_assigned_returns_403(self, client):
        """
        Authenticated user with zero roles -> 403.
        An empty UserRole table means no role matches the allowed set.
        """
        make_user("norole@example.com")  # no role_name -> no UserRole row inserted
        token = get_token(client, "norole@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 403

    def test_correct_role_passes(self, client):
        """Moderator calling /dashboard/stats -> 200."""
        make_user("mod@example.com", role_name="moderator")
        token = get_token(client, "mod@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 200

    def test_staff_editor_can_access_moderator_route(self, client):
        """
        staff_editor is a lower-privilege role than moderator.
        Calling /dashboard/stats (requires moderator+) -> 403.
        """
        make_user("staffonly@example.com", role_name="staff_editor")
        token = get_token(client, "staffonly@example.com")
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == 200


# =================================================================================
# Phase 6, Categories
# =================================================================================

class TestCategories:

    def _staff_token(self, client):
        """
        Create a staff_editor user and return their token.
        Each test gets a fresh DB so the same email can be reused across tests.
        """
        make_user("cat_staff@example.com", role_name="staff_editor")
        return get_token(client, "cat_staff@example.com")

    def test_list_categories_public_returns_200(self, client):
        """GET /categories is a public endpoint -> 200 with empty list."""
        resp = client.get("/categories")
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["data"], list)

    def test_create_category_without_auth_returns_401(self, client):
        """POST /categories with no Authorization header -> 401."""
        resp = client.post("/categories", json={"name": "Food", "slug": "food"})
        assert resp.status_code == 401

    def test_create_category_contributor_forbidden_returns_403(self, client):
        """
        'contributor' is not in the allowed role set for POST /categories -> 403.
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
        """staff_editor creates a category -> 201 with the slug in the response."""
        token = self._staff_token(client)
        resp = client.post(
            "/categories",
            json={"name": "Food Security", "slug": "food-security"},
            headers=auth(token),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["slug"] == "food-security"

    def test_create_category_duplicate_name_returns_409(self, client):
        """Submitting the same category name twice -> 409 Conflict."""
        token = self._staff_token(client)
        h = auth(token)
        client.post("/categories", json={"name": "Housing", "slug": "housing"}, headers=h)
        resp = client.post("/categories", json={"name": "Housing", "slug": "housing-2"}, headers=h)
        assert resp.status_code == 409

    def test_update_category_returns_200_with_new_name(self, client):
        """PUT /categories/<id> updates the name field -> 200."""
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
        Setting a category's parent_category_id to its own category_id -> 422.
        Verifies the circular-reference guard in routes/categories.py.
        """
        token = self._staff_token(client)
        h = auth(token)
        cr = client.post("/categories", json={"name": "Circ", "slug": "circ"}, headers=h)
        cat_id = cr.get_json()["data"]["category_id"]

        resp = client.put(f"/categories/{cat_id}", json={"parent_category_id": cat_id}, headers=h)
        assert resp.status_code == 422

    def test_update_nonexistent_category_returns_404(self, client):
        """PUT /categories/99999 (does not exist) -> 404."""
        token = self._staff_token(client)
        resp = client.put("/categories/99999", json={"name": "X"}, headers=auth(token))
        assert resp.status_code == 404


# =================================================================================
# Phase 6, Tags
# =================================================================================

class TestTags:

    def _staff_token(self, client):
        make_user("tag_staff@example.com", role_name="staff_editor")
        return get_token(client, "tag_staff@example.com")

    def test_list_tags_public_returns_200(self, client):
        """GET /tags is a public endpoint -> 200."""
        assert client.get("/tags").status_code == 200

    def test_create_tag_returns_201(self, client):
        """staff_editor creates a tag -> 201 with name in response."""
        token = self._staff_token(client)
        resp = client.post("/tags", json={"name": "Free", "slug": "free"}, headers=auth(token))
        assert resp.status_code == 201
        assert resp.get_json()["data"]["name"] == "Free"

    def test_create_tag_duplicate_name_returns_409(self, client):
        """Same tag name submitted twice -> 409 Conflict."""
        token = self._staff_token(client)
        h = auth(token)
        client.post("/tags", json={"name": "Youth", "slug": "youth"}, headers=h)
        resp = client.post("/tags", json={"name": "Youth", "slug": "youth-2"}, headers=h)
        assert resp.status_code == 409

    def test_update_tag_returns_200_with_new_name(self, client):
        """PUT /tags/<id> updates the name -> 200."""
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


# =================================================================================
# Phase 5, Resources: public endpoints
# =================================================================================

class TestResourcesPublic:

    def test_map_missing_lat_lng_returns_400(self, client):
        """GET /resources/map with no query params -> 400 (lat/lng are required)."""
        assert client.get("/resources/map").status_code == 400

    def test_map_empty_db_returns_zero_pins(self, client):
        """
        Valid lat/lng provided but no resources in DB -> 200 with empty pins.
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
                "lat": 49.246,    # Vancouver, ~3 400 km from Ottawa
                "lng": -123.116,
                "is_primary": 1,
            }],
        })

        resp = client.get("/resources/map?lat=45.434&lng=-75.622&radius_km=50")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["count"] == 0

    def test_list_resources_empty_db_returns_empty_list(self, client):
        """GET /resources with no published resources -> 200 with empty list."""
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
        """GET /resources/slug/does-not-exist -> 404."""
        assert client.get("/resources/slug/does-not-exist").status_code == 404

    def test_get_by_id_not_found_returns_404(self, client):
        """GET /resources/99999 -> 404."""
        assert client.get("/resources/99999").status_code == 404


# =================================================================================
# Phase 5, Resources: staff CRUD
# =================================================================================

class TestResourcesStaffCRUD:

    def test_create_no_auth_returns_401(self, client):
        """
        POST /resources with no token -> 401.
        @require_roles calls verify_jwt_in_request() which raises
        NoAuthorizationError when the header is absent.
        """
        resp = client.post("/resources", json={"name": "X", "resource_type": "Service"})
        assert resp.status_code == 401

    def test_create_contributor_role_returns_403(self, client):
        """
        'contributor' is not in the allowed set for POST /resources -> 403.
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
        staff_editor creates a resource -> 201.
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
        """POST /resources without the required 'name' field -> 422."""
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
        assert resource.current_version.name == "Updated Name"  # type: ignore

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

    def test_staff_editor_can_delete_resource(self, client):
        """
        staff_editor calling DELETE /resources/<id> -> 403.
        Only administrator is in the allowed set for the delete route.
        """
        make_user("del_staff@example.com", role_name="staff_editor")
        token = get_token(client, "del_staff@example.com")
        resource_id = create_resource_api(client, token, name="Not For Staff To Delete")["resource_id"]

        resp = client.delete(f"/resources/{resource_id}", headers=auth(token))
        assert resp.status_code == 200

    def test_duplicate_name_generates_slug_with_suffix(self, client):
        """
        Two resources with the same name -> first gets 'food-bank', second gets
        'food-bank-2'. Validates generate_unique_slug() recursive collision handling.
        """
        make_user("slug_coll@example.com", role_name="staff_editor")
        token = get_token(client, "slug_coll@example.com")

        d1 = create_resource_api(client, token, name="Food Bank")
        d2 = create_resource_api(client, token, name="Food Bank")

        assert d1["slug"] == "food-bank"
        assert d2["slug"] == "food-bank-2"


# =================================================================================
# Phase 5, Resources: filters (D3/D4, new)
# =================================================================================

class TestResourceFilters:
    """
    D3: repeated category_id/tag_id query params, OR-within-type / AND-across-type.
    D4: GET /resources and GET /resources/map share the same filter semantics.
    """

    def _setup(self, client):
        make_user("filt_staff@example.com", role_name="staff_editor")
        token = get_token(client, "filt_staff@example.com")
        h = auth(token)

        cat_a = client.post("/categories", json={"name": "Cat A", "slug": "cat-a"}, headers=h).get_json()["data"]["category_id"]
        cat_b = client.post("/categories", json={"name": "Cat B", "slug": "cat-b"}, headers=h).get_json()["data"]["category_id"]
        tag_x = client.post("/tags", json={"name": "Tag X", "slug": "tag-x"}, headers=h).get_json()["data"]["tag_id"]

        r1 = create_resource_api(client, token, name="Res With Cat A",
                                  category_ids=[cat_a], tag_ids=[tag_x])
        r2 = create_resource_api(client, token, name="Res With Cat B",
                                  category_ids=[cat_b])
        r3 = create_resource_api(client, token, name="Res With Neither")
        return {"cat_a": cat_a, "cat_b": cat_b, "tag_x": tag_x, "r1": r1, "r2": r2, "r3": r3}

    def test_single_category_filters_correctly(self, client):
        """?category_id=<A> returns only the resource tagged with category A."""
        ctx = self._setup(client)
        resp = client.get(f"/resources?category_id={ctx['cat_a']}")
        names = [r["name"] for r in resp.get_json()["data"]["resources"]]
        assert names == ["Res With Cat A"]

    def test_repeated_category_id_is_or_within_type(self, client):
        """?category_id=A&category_id=B returns resources matching EITHER."""
        ctx = self._setup(client)
        resp = client.get(f"/resources?category_id={ctx['cat_a']}&category_id={ctx['cat_b']}")
        names = {r["name"] for r in resp.get_json()["data"]["resources"]}
        assert names == {"Res With Cat A", "Res With Cat B"}

    def test_category_and_tag_combine_with_and(self, client):
        """category_id + tag_id together require BOTH to match (AND across types)."""
        ctx = self._setup(client)
        resp = client.get(f"/resources?category_id={ctx['cat_b']}&tag_id={ctx['tag_x']}")
        # Cat B resource has no Tag X, and the Tag X resource has Cat A not Cat B:
        # nothing satisfies both simultaneously.
        assert resp.get_json()["data"]["resources"] == []

        resp2 = client.get(f"/resources?category_id={ctx['cat_a']}&tag_id={ctx['tag_x']}")
        names = [r["name"] for r in resp2.get_json()["data"]["resources"]]
        assert names == ["Res With Cat A"]

    def test_invalid_category_id_returns_400(self, client):
        """A non-integer category_id fails predictably instead of being silently dropped."""
        resp = client.get("/resources?category_id=not-a-number")
        assert resp.status_code == 400

    def test_no_duplicate_rows_when_resource_matches_multiple_filtered_tags(self, client):
        """
        A resource with two of the selected tags must appear exactly once
        (validates the .distinct() call in build_public_resource_query()).
        """
        make_user("dup_staff@example.com", role_name="staff_editor")
        token = get_token(client, "dup_staff@example.com")
        h = auth(token)
        tag1 = client.post("/tags", json={"name": "T1", "slug": "t1"}, headers=h).get_json()["data"]["tag_id"]
        tag2 = client.post("/tags", json={"name": "T2", "slug": "t2"}, headers=h).get_json()["data"]["tag_id"]
        create_resource_api(client, token, name="Double Tagged", tag_ids=[tag1, tag2])

        resp = client.get(f"/resources?tag_id={tag1}&tag_id={tag2}")
        names = [r["name"] for r in resp.get_json()["data"]["resources"]]
        assert names.count("Double Tagged") == 1

    def test_map_and_list_agree_on_filtered_resource_set(self, client):
        """
        D4: with the same category filter and a resource inside the search
        radius, GET /resources and GET /resources/map return the same
        resource_id, list and map can't silently disagree.
        """
        make_user("parity_staff@example.com", role_name="staff_editor")
        token = get_token(client, "parity_staff@example.com")
        h = auth(token)
        cat = client.post("/categories", json={"name": "Parity Cat", "slug": "parity-cat"}, headers=h).get_json()["data"]["category_id"]
        created = create_resource_api(
            client, token, name="Parity Resource", category_ids=[cat],
            locations=[{"lat": 45.4, "lng": -75.6, "is_primary": 1}],
        )

        list_resp = client.get(f"/resources?category_id={cat}")
        list_ids = {r["resource_id"] for r in list_resp.get_json()["data"]["resources"]}

        map_resp = client.get(f"/resources/map?lat=45.4&lng=-75.6&radius_km=5&category_id={cat}")
        map_ids = {p["resource_id"] for p in map_resp.get_json()["data"]["pins"]}

        assert list_ids == map_ids == {created["resource_id"]}

    def test_map_invalid_category_id_returns_400(self, client):
        """Same validation applies on the map endpoint (D4 parity)."""
        resp = client.get("/resources/map?lat=45.4&lng=-75.6&category_id=nope")
        assert resp.status_code == 400


# =================================================================================
# Phase 5, Resources: update guards (new)
# =================================================================================

class TestResourceUpdateGuards:

    def test_empty_put_body_returns_400(self, client):
        """PUT /resources/<id> with {} -> 400 (falsy body, caught before the field check)."""
        make_user("guard_staff@example.com", role_name="staff_editor")
        token = get_token(client, "guard_staff@example.com")
        resource_id = create_resource_api(client, token, name="Guard Target")["resource_id"]

        resp = client.put(f"/resources/{resource_id}", json={}, headers=auth(token))
        assert resp.status_code == 400

    def test_put_with_no_recognized_fields_returns_422(self, client):
        """
        A non-empty body containing zero editable fields must not silently
        create a pointless duplicate version (confirmed correctness fix).
        """
        make_user("guard_staff2@example.com", role_name="staff_editor")
        token = get_token(client, "guard_staff2@example.com")
        resource_id = create_resource_api(client, token, name="Guard Target 2")["resource_id"]

        resp = client.put(f"/resources/{resource_id}", json={"unrelated_field": "x"}, headers=auth(token))
        assert resp.status_code == 422

        # And confirm no duplicate version was actually created.
        db.session.expire_all()
        versions = ResourceVersion.query.filter_by(resource_id=resource_id).all()
        assert len(versions) == 1

    def test_invalid_day_of_week_returns_422(self, client):
        """An hours[] entry with an unparseable day_of_week -> 422, not a DB error."""
        make_user("hours_staff@example.com", role_name="staff_editor")
        token = get_token(client, "hours_staff@example.com")
        resp = client.post("/resources", json={
            "name": "Bad Hours Resource",
            "resource_type": "Service",
            "hours": [{"day_of_week": "Funday", "opens_at": "09:00", "closes_at": "17:00"}],
        }, headers=auth(token))
        assert resp.status_code == 422

    def test_day_of_week_accepts_name_and_int(self, client):
        """day_of_week accepts both a weekday name and an equivalent int (centralized parser)."""
        make_user("hours_staff2@example.com", role_name="staff_editor")
        token = get_token(client, "hours_staff2@example.com")
        resp = client.post("/resources", json={
            "name": "Good Hours Resource",
            "resource_type": "Service",
            "hours": [
                {"day_of_week": "Monday", "opens_at": "09:00", "closes_at": "17:00"},
                {"day_of_week": 2, "opens_at": "09:00", "closes_at": "17:00"},  # Tuesday
            ],
        }, headers=auth(token))
        assert resp.status_code == 201

    def test_deactivated_resource_hidden_from_both_id_and_slug_lookup(self, client, app):
        """
        Slug lookup fix: is_active=0 must hide a resource from BOTH
        GET /resources/<id> and GET /resources/slug/<slug> consistently.
        """
        make_user("deact_admin@example.com", role_name="administrator")
        token = get_token(client, "deact_admin@example.com")
        created = create_resource_api(client, token, name="Deactivate Me")

        resource = Resource.query.get(created["resource_id"])
        resource.is_active = 0 # type: ignore
        db.session.commit()

        assert client.get(f"/resources/{created['resource_id']}").status_code == 404
        assert client.get(f"/resources/slug/{created['slug']}").status_code == 404


# =================================================================================
# Phase 7, Submissions: create  (Flow A and Flow B)
# =================================================================================

class TestSubmissionsCreate:

    def test_flow_a_new_resource_returns_201(self, client, app):
        """
        Flow A, anonymous submits a new_resource.
        Expected DB state:
          Resource.is_active                    = 0  (not published yet)
          ResourceVersion.moderation_status     = 'pending_review'
        README example: 'Create new resource -> Resource stored with Pending status'
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
        assert resource.is_active == 0  # type: ignore
        assert version.moderation_status == "pending_review"  # type: ignore

    def test_flow_a_community_asset_returns_201(self, client):
        """'community_asset' is a valid Flow A submission_type -> 201."""
        resp = client.post("/submissions", json={
            "submission_type": "community_asset",
            "name":            "Volunteer Knitters",
            "resource_type":   "Volunteer Skill",
        })
        assert resp.status_code == 201

    def test_missing_submission_type_returns_400(self, client):
        """No submission_type field -> 400."""
        resp = client.post("/submissions", json={"name": "Something"})
        assert resp.status_code == 400

    def test_invalid_submission_type_returns_400(self, client):
        """submission_type not in the valid enum -> 400."""
        resp = client.post("/submissions", json={
            "submission_type": "hack_the_planet",
            "name":            "Something",
        })
        assert resp.status_code == 400

    def test_missing_name_returns_400(self, client):
        """Valid submission_type but 'name' missing -> 400."""
        resp = client.post("/submissions", json={"submission_type": "new_resource"})
        assert resp.status_code == 400

    def test_flow_b_missing_resource_id_returns_400(self, client):
        """update_resource without resource_id -> 400 (required for Flow B)."""
        resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "name":            "Update Attempt",
        })
        assert resp.status_code == 400

    def test_flow_b_nonexistent_resource_returns_404(self, client):
        """update_resource with a resource_id that does not exist -> 404."""
        resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "name":            "Update Attempt",
            "resource_id":     999999,
        })
        assert resp.status_code == 404

    def test_get_submissions_without_auth_returns_401(self, client):
        """GET /submissions with no token -> 401."""
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


# =================================================================================
# Phase 7, Submission review: the 5-table atomic transaction
# =================================================================================

class TestSubmissionReview:
    """
    These tests verify the most critical block in the entire backend:
    the review_submission() function that commits 5 table changes atomically.

    APPROVE path side-effects verified:
      1. ResourceVersion.moderation_status   -> 'approved'
      2. ResourceVersion.approved_at         -> timestamp set
      3. Resource.current_approved_version_id -> points to the approved version
      4. Resource.is_active                  -> 1  (for new_resource / community_asset)
      5. Submission.moderation_status        -> 'approved'
      6. SubmissionReview row inserted
      7. ResourceChangeLog row with change_type='approved_submission'
    """

    # -- internal helpers --------------------------------------------------------

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

    # -- approve path -------------------------------------------------------------

    def test_approve_publishes_resource_and_writes_all_rows(self, client, app):
        """
        Full approval lifecycle, asserts all 7 DB side-effects listed above.
        README example: 'Approve resource -> Status updated to Published.'
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

        # Force a fresh DB read, don't rely on SQLAlchemy's identity map cache
        db.session.expire_all()

        version  = ResourceVersion.query.get(ver_id)
        resource = Resource.query.get(res_id)
        sub      = Submission.query.get(sub_id)

        assert version.moderation_status == "approved"            # type: ignore # side-effect 1
        assert version.approved_at is not None                    # type: ignore # side-effect 2
        assert resource.current_approved_version_id == ver_id     # type: ignore # side-effect 3
        assert resource.is_active == 1                            # type: ignore # side-effect 4
        assert sub.moderation_status == "approved"                # type: ignore # side-effect 5

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
          Submit with lat/lng -> Approve -> pin returned by GET /resources/map.
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

    # -- reject path ----------------------------------------------------------------

    def test_reject_leaves_resource_inactive(self, client, app):
        """
        Submit -> Reject.
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

        assert resource.is_active == 0  # type: ignore
        assert resource.current_approved_version_id is None  # type: ignore
        assert version.moderation_status == "rejected"  # type: ignore
        assert sub.moderation_status == "rejected"  # type: ignore

    # -- guard tests ------------------------------------------------------------------

    def test_double_review_returns_422(self, client):
        """
        Attempting to review a submission that is already reviewed -> 422.
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
        """decision must be 'approved' or 'rejected'. Any other string -> 400."""
        sub_id, _, _ = self._submit_new(client, "Bad Decision")
        token = self._mod_token(client)
        resp = client.post(f"/submissions/{sub_id}/review",
                           json={"decision": "maybe"}, headers=auth(token))
        assert resp.status_code == 400

    def test_review_nonexistent_submission_returns_404(self, client):
        """POST /submissions/99999/review -> 404."""
        make_user("ghost_mod@example.com", role_name="moderator")
        token = get_token(client, "ghost_mod@example.com")
        resp = client.post("/submissions/99999/review",
                           json={"decision": "approved"}, headers=auth(token))
        assert resp.status_code == 404

    def test_review_requires_moderator_role(self, client):
        """contributor calling POST /submissions/<id>/review -> 403."""
        sub_id, _, _ = self._submit_new(client, "Role Guard Test")
        make_user("rev_contrib@example.com", role_name="contributor")
        token = get_token(client, "rev_contrib@example.com")
        resp = client.post(f"/submissions/{sub_id}/review",
                           json={"decision": "approved"}, headers=auth(token))
        assert resp.status_code == 403

    # -- Flow B end-to-end ------------------------------------------------------------

    def test_flow_b_approve_moves_version_pointer(self, client, app):
        """
        Full Flow B lifecycle:
          1. Staff creates a resource directly -> v1 approved, resource active.
          2. Public submits an update via POST /submissions -> v2 pending.
          3. Moderator approves -> current_approved_version_id moves v1 -> v2.
          4. Public detail endpoint returns the v2 name.
        """
        # Step 1: staff creates resource (immediately approved, no queue)
        make_user("fb_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "fb_staff@example.com")
        resource_id = create_resource_api(client, staff_token, name="Flow B Original")["resource_id"]

        db.session.expire_all()
        v1_id = Resource.query.get(resource_id).current_approved_version_id  # type: ignore

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


# =================================================================================
# Phase 7, Submission comparison payload (D6, new)
# =================================================================================

class TestSubmissionComparison:
    """
    D6: GET /submissions/<id> must return current_approved_resource so a
    moderator UI can diff a pending update against what's currently live
    without a second request.
    """

    def _mod_token(self, client):
        make_user("cmp_mod@example.com", role_name="moderator")
        return get_token(client, "cmp_mod@example.com")

    def test_new_resource_submission_has_null_current_approved_resource(self, client):
        """Flow A (new_resource): nothing is live yet -> current_approved_resource is null."""
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name":            "Brand New Thing",
            "resource_type":   "Service",
        })
        sub_id = resp.get_json()["data"]["submission_id"]

        token = self._mod_token(client)
        detail = client.get(f"/submissions/{sub_id}", headers=auth(token)).get_json()["data"]
        assert detail["current_approved_resource"] is None
        assert detail["proposed_version"]["name"] == "Brand New Thing"

    def test_update_submission_includes_live_comparison_resource(self, client):
        """
        Flow B (update_resource): current_approved_resource must reflect the
        resource's CURRENTLY approved version, not the pending proposal.
        """
        make_user("cmp_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "cmp_staff@example.com")
        resource_id = create_resource_api(client, staff_token, name="Live Version")["resource_id"]

        resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "resource_id":     resource_id,
            "name":            "Proposed New Name",
            "resource_type":   "Organization",
        })
        sub_id = resp.get_json()["data"]["submission_id"]

        token = self._mod_token(client)
        detail = client.get(f"/submissions/{sub_id}", headers=auth(token)).get_json()["data"]

        assert detail["proposed_version"]["name"] == "Proposed New Name"
        assert detail["current_approved_resource"]["resource_id"] == resource_id
        assert detail["current_approved_resource"]["version"]["name"] == "Live Version"
        assert "review_history" in detail

    def test_get_submission_without_auth_returns_401(self, client):
        """GET /submissions/<id> with no token -> 401 (unchanged existing contract)."""
        resp = client.post("/submissions", json={
            "submission_type": "new_resource", "name": "X", "resource_type": "Service",
        })
        sub_id = resp.get_json()["data"]["submission_id"]
        assert client.get(f"/submissions/{sub_id}").status_code == 401


# =================================================================================
# Phase 8, Issues
# =================================================================================

class TestIssues:
    """
    Anonymous issue creation is rate-limited the same way anonymous
    submissions are (see app/utils.py check_and_increment_rate_limit).
    Authenticated issue creation bypasses the anonymous limiter entirely.
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
        Valid issue against a real resource -> 201 with issue_id.
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

    def test_create_issue_anonymous_returns_201(self, client):
        """
        An anonymous caller with no prior rate-limit hits reports an issue -> 201.
        (Verified the guard was already correct in this source, see the
        module docstring above.)
        """
        res_id = self._published_resource(client)
        resp = client.post("/issues", json={
            "resource_id": res_id,
            "description": "This location has permanently closed.",
        })
        assert resp.status_code == 201

    def test_create_issue_missing_resource_id_returns_400(self, client):
        """POST /issues without resource_id -> 400."""
        make_user("miss_res@example.com")
        token = get_token(client, "miss_res@example.com")
        resp = client.post("/issues",
                           json={"description": "Something wrong"},
                           headers=auth(token))
        assert resp.status_code == 400

    def test_create_issue_missing_description_returns_400(self, client):
        """POST /issues without description -> 400."""
        res_id = self._published_resource(client)
        make_user("miss_desc@example.com")
        token = get_token(client, "miss_desc@example.com")
        resp = client.post("/issues",
                           json={"resource_id": res_id},
                           headers=auth(token))
        assert resp.status_code == 400

    def test_create_issue_nonexistent_resource_returns_404(self, client):
        """Reporting against a resource_id that does not exist -> 404."""
        make_user("ghost_rep@example.com")
        token = get_token(client, "ghost_rep@example.com")
        resp = client.post("/issues",
                           json={"resource_id": 999999, "description": "Doesn't exist"},
                           headers=auth(token))
        assert resp.status_code == 404

    def test_list_issues_without_auth_returns_401(self, client):
        """GET /issues with no Authorization header -> 401."""
        assert client.get("/issues").status_code == 401

    def test_list_issues_moderator_returns_200(self, client):
        """Moderator can GET /issues -> 200 with an 'items' key in data."""
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
        assert issue.status == "resolved"  # type: ignore
        assert issue.resolved_at is not None  # type: ignore

    def test_resolve_already_resolved_returns_422(self, client):
        """Resolving an issue that is already resolved -> 422 Unprocessable Entity."""
        res_id = self._published_resource(client)
        make_user("dup_rep@example.com")
        rep_token = get_token(client, "dup_rep@example.com")

        issue_id = client.post("/issues", json={
            "resource_id": res_id, "description": "Dup resolve test",
        }, headers=auth(rep_token)).get_json()["data"]["issue_id"]

        make_user("dup_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "dup_mod@example.com")
        client.put(f"/issues/{issue_id}/resolve", json={}, headers=auth(mod_token))  # first , ok
        resp = client.put(f"/issues/{issue_id}/resolve", json={}, headers=auth(mod_token))  # second, conflict
        assert resp.status_code == 422

    def test_resolve_nonexistent_issue_returns_404(self, client):
        """PUT /issues/99999/resolve -> 404."""
        make_user("res404_mod@example.com", role_name="moderator")
        token = get_token(client, "res404_mod@example.com")
        resp = client.put("/issues/99999/resolve", json={}, headers=auth(token))
        assert resp.status_code == 404


# =================================================================================
# Phase 8, Dashboard stats
# =================================================================================

class TestDashboard:

    def test_dashboard_requires_auth(self, client):
        """GET /dashboard/stats with no token -> 401."""
        assert client.get("/dashboard/stats").status_code == 401

    def test_dashboard_contributor_returns_403(self, client):
        """'contributor' role is below moderator threshold -> 403."""
        make_user("dash_contrib@example.com", role_name="contributor")
        token = get_token(client, "dash_contrib@example.com")
        assert client.get("/dashboard/stats", headers=auth(token)).status_code == 403

    def test_dashboard_administrator_returns_200(self, client):
        """'administrator' satisfies the moderator+ requirement -> 200."""
        make_user("d_admin@example.com", role_name="administrator")
        token = get_token(client, "d_admin@example.com")
        assert client.get("/dashboard/stats", headers=auth(token)).status_code == 200

    def test_dashboard_stats_reflect_known_data(self, client):
        """
        Create a known dataset, then verify each dashboard counter is accurate.
          1 published resource  -> published_resources >= 1
          1 pending submission  -> pending_submissions >= 1
          2 users created       -> total_users >= 2
          Keys 'open_issues' and 'total_resources' must be present.
        """
        make_user("d_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "d_mod@example.com")

        make_user("d_creator@example.com", role_name="staff_editor")
        staff_token = get_token(client, "d_creator@example.com")

        # One published resource (staff direct-create bypasses queue -> is_active=1)
        create_resource_api(client, staff_token, name="Dashboard Resource")

        # One pending submission (anonymous Flow A -> pending_review)
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


# =================================================================================
# Rate limiting  (Phase 3 utility + Phase 7 submissions gate)
# =================================================================================

class TestRateLimit:
    """
    RATELIMIT_MAX_OVERRIDE = 5 in TestingConfig (app/config.py) and is now
    actually read by app/utils.py's check_and_increment_rate_limit().

    Each test has a fresh DB so the rate-limit counter (submission_rate_limits
    table) starts at 0 for every test function. The Flask test client always
    sends requests from 127.0.0.1, so all anonymous calls in one test share
    the same IP hash.
    """

    def test_sixth_anonymous_submission_returns_429(self, client):
        """
        Submissions 1-5 (same anonymous IP) -> 201 each.
        Submission 6                         -> 429 Too Many Requests.
        Confirms the submissions.py guard ('if not check_and_increment...') works.
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
        7 consecutive authenticated submissions -> all 201, none blocked.
        """
        make_user("power_user@example.com")
        token = get_token(client, "power_user@example.com")

        for i in range(1, 8):  # 7 calls, two more than the anonymous limit of 5
            resp = client.post("/submissions", json={
                "submission_type": "new_resource",
                "name":            f"Auth Submission {i}",
                "resource_type":   "Service",
            }, headers=auth(token))
            assert resp.status_code == 201, (
                f"Authenticated submission {i}/7 was unexpectedly blocked: {resp.get_json()}"
            )

    def test_rejected_submission_does_not_consume_rate_limit_slot(self, client):
        """
        Confirmed correctness fix (atomicity): a request rejected by
        pre-transaction validation (invalid submission_type) rolls back its
        rate-limit increment, so it must not "spend" one of the 5 anonymous
        slots.
        """
        for _ in range(5):
            resp = client.post("/submissions", json={"submission_type": "not_valid", "name": "x"})
            assert resp.status_code == 400

        # None of the 5 invalid calls should have consumed a rate-limit slot,
        # so a 6th, VALID call must still succeed.
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Should Still Work",
            "resource_type": "Service",
        })
        assert resp.status_code == 201

def test_trusted_contributor_bypasses_rate_limit(client):
    """trusted_contributor role bypasses anonymous rate limiter (same as any authenticated user)."""
    make_user("tc@example.com", role_name="trusted_contributor")
    token = get_token(client, "tc@example.com")
    for i in range(1, 8):  # 7 submissions, above the anonymous cap of 5
        resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": f"TC Submission {i}",
            "resource_type": "Service",
        }, headers=auth(token))
        assert resp.status_code == 201, f"Submission {i}/7 blocked unexpectedly"

def test_trusted_contributor_cannot_access_staff_routes(client):
    """trusted_contributor gets 403 on all staff-gated endpoints."""
    make_user("tc2@example.com", role_name="trusted_contributor")
    token = get_token(client, "tc2@example.com")
    resp = client.post("/resources", json={}, headers=auth(token))
    assert resp.status_code == 403


# =================================================================================
# Role & Permission Model Change Request / backend-requests doc items 2-8
# (merged in from test_enhancements.py)
# =================================================================================

def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ============================================================================
# Role hierarchy: require_roles(min_role) is a rank check now, not an
# allow-list. Each test below pins the exact superset property the Role &
# Permission Model Change Request asked for -- a role should never need to
# be named explicitly on a route it's supposed to inherit access to.
# ============================================================================
class TestRoleHierarchy:

    @pytest.mark.parametrize("role,expected_status", [
        ("trusted_contributor", 403),
        ("moderator", 200),
        ("staff_editor", 200),   # the bug this replaces: used to be 403
        ("administrator", 200),
    ])
    def test_dashboard_access_by_role(self, client, role, expected_status):
        email = f"h_dash_{role}@example.com"
        make_user(email, role_name=role)
        token = get_token(client, email)
        resp = client.get("/dashboard/stats", headers=auth(token))
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
    ("role_name", "expected_status"),
    [
        ("trusted_contributor", 403),
        ("moderator", 201),
        ("staff_editor", 201),
        ("administrator", 201),
    ],
)
    def test_create_resource_by_role(self, client, role_name, expected_status):
        email = f"{role_name}-createres@example.com"
        make_user(email, role_name=role_name)
        token = get_token(client, email)

        resp = client.post(
            "/resources",
            json={
                "name": f"{role_name} Resource",
                "resource_type": "Service",
            },
            headers=auth(token),
        )

        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
    ("role_name", "expected_status"),
    [
        ("trusted_contributor", 403),
        ("moderator", 403),
        ("staff_editor", 200),
        ("administrator", 200),
    ],
)
    def test_delete_resource_by_role(self, client, role_name, expected_status):
        admin_email = f"creator-{role_name}@example.com"
        make_user(admin_email, role_name="administrator")
        admin_token = get_token(client, admin_email)

        created = create_resource_api(
            client,
            admin_token,
            name=f"Delete Target {role_name}",
        )
        resource_id = created["resource_id"]

        email = f"{role_name}-delete@example.com"
        make_user(email, role_name=role_name)
        token = get_token(client, email)

        resp = client.delete(
            f"/resources/{resource_id}",
            headers=auth(token),
        )

        assert resp.status_code == expected_status

    @pytest.mark.parametrize("role,expected_status", [
        ("trusted_contributor", 403),
        ("moderator", 403),      # cannot manage categories/tags
        ("staff_editor", 201),
        ("administrator", 201),
    ])
    def test_create_category_by_role(self, client, role, expected_status):
        email = f"h_cat_{role}@example.com"
        make_user(email, role_name=role)
        token = get_token(client, email)
        resp = client.post(
            "/categories",
            json={"name": f"Category {role}", "slug": f"category-{role}"},
            headers=auth(token),
        )
        assert resp.status_code == expected_status

    def test_invalid_min_role_raises_clear_error(self, client):
        """require_roles() with a role name outside Role.HIERARCHY should
        fail loudly (ValueError), not silently deny/allow everyone."""
        make_user("h_bad_role@example.com", role_name="administrator")
        user = User.query.filter_by(email="h_bad_role@example.com").first()
        with pytest.raises(ValueError):
            user.has_role_at_least("superadmin")


# ============================================================================
# One role per account (requirement 1 / requirement 2)
# ============================================================================
class TestOneRolePerAccount:

    def test_db_rejects_a_second_role_row_for_the_same_user(self, client):
        make_user("o_dup@example.com", role_name="moderator")
        user = User.query.filter_by(email="o_dup@example.com").first()
        staff_editor_role = Role.query.filter_by(role_name="staff_editor").first()

        db.session.add(UserRole(user_id=user.user_id, role_id=staff_editor_role.role_id)) # pyright: ignore[reportCallIssue, reportOptionalMemberAccess]
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_admin_patch_role_replaces_not_adds(self, client):
        make_user("o_admin@example.com", role_name="administrator")
        admin_token = get_token(client, "o_admin@example.com")

        make_user("o_target@example.com", role_name="moderator")
        target = User.query.filter_by(email="o_target@example.com").first()

        resp = client.patch(
            f"/users/{target.user_id}",
            json={"role": "staff_editor"},
            headers=auth(admin_token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["role"] == "staff_editor"

        role_count = UserRole.query.filter_by(user_id=target.user_id).count() # type: ignore
        assert role_count == 1


# ============================================================================
# Self-registration default role (Role & Permission Model Change Request:
# "Trusted Contributor becomes the default non-staff role")
# ============================================================================
class TestSelfRegistrationDefaultRole:

    def test_register_auto_assigns_trusted_contributor(self, client):
        resp = client.post("/auth/register", json={
            "email": "r_new@example.com",
            "password": "SomeStrongPass1!",
            "first_name": "New",
            "last_name": "Person",
        })
        assert resp.status_code == 201

        user = User.query.filter_by(email="r_new@example.com").first()
        assert user is not None
        assert user.role_name == "trusted_contributor"


# ============================================================================
# POST /auth/setup-password (requirement 2, preferred flow)
# ============================================================================
class TestSetupPassword:

    def _make_pending_user(self, email="s_pending@example.com"):
        role = Role.query.filter_by(role_name="trusted_contributor").first()
        user = User(
            email=email,
            password_hash=bcrypt.generate_password_hash("unusable-placeholder").decode("utf-8"),
            first_name="Pending",
            last_name="Setup",
            is_active=1,
        )
        db.session.add(user)
        db.session.flush()
        if role:
            db.session.add(UserRole(user_id=user.user_id, role_id=role.role_id))
        db.session.commit()
        return user

    def _issue_token(self, user, expires_delta=timedelta(hours=48), used=False):
        raw = "raw-test-token-" + user.email
        db.session.add(PasswordResetToken(
            user_id=user.user_id, # pyright: ignore[reportCallIssue]
            token_hash=_hash_token(raw),
            expires_at=datetime.now(timezone.utc) + expires_delta,
            used_at=datetime.now(timezone.utc) if used else None,
        ))
        db.session.commit()
        return raw

    def test_valid_token_sets_password_and_can_login(self, client):
        user = self._make_pending_user("s_valid@example.com")
        raw_token = self._issue_token(user)

        resp = client.post("/auth/setup-password", json={
            "token": raw_token,
            "password": "BrandNewPass1!",
        })
        assert resp.status_code == 200

        login_resp = client.post("/auth/login", json={
            "email": "s_valid@example.com",
            "password": "BrandNewPass1!",
        })
        assert login_resp.status_code == 200
        assert "access_token" in login_resp.get_json()["data"]

    def test_garbage_token_rejected(self, client):
        resp = client.post("/auth/setup-password", json={
            "token": "this-token-does-not-exist",
            "password": "BrandNewPass1!",
        })
        assert resp.status_code == 401

    def test_expired_token_rejected(self, client):
        user = self._make_pending_user("s_expired@example.com")
        raw_token = self._issue_token(user, expires_delta=timedelta(hours=-1))

        resp = client.post("/auth/setup-password", json={
            "token": raw_token,
            "password": "BrandNewPass1!",
        })
        assert resp.status_code == 401

    def test_already_used_token_rejected(self, client):
        user = self._make_pending_user("s_used@example.com")
        raw_token = self._issue_token(user, used=True)

        resp = client.post("/auth/setup-password", json={
            "token": raw_token,
            "password": "BrandNewPass1!",
        })
        assert resp.status_code == 401

    def test_token_cannot_be_replayed(self, client):
        user = self._make_pending_user("s_replay@example.com")
        raw_token = self._issue_token(user)

        first = client.post("/auth/setup-password", json={
            "token": raw_token, "password": "FirstPass1!",
        })
        assert first.status_code == 200

        second = client.post("/auth/setup-password", json={
            "token": raw_token, "password": "SecondPass1!",
        })
        assert second.status_code == 401

    def test_password_too_short_rejected(self, client):
        user = self._make_pending_user("s_short@example.com")
        raw_token = self._issue_token(user)

        resp = client.post("/auth/setup-password", json={
            "token": raw_token, "password": "short",
        })
        assert resp.status_code == 422


# ============================================================================
# Administrator user management (requirement 2)
# ============================================================================
class TestUserManagement:

    def _admin_token(self, client, suffix):
        email = f"u_admin_{suffix}@example.com"
        make_user(email, role_name="administrator")
        return get_token(client, email)

    def test_non_admin_forbidden_on_every_users_route(self, client):
        make_user("u_mod_noaccess@example.com", role_name="moderator")
        token = get_token(client, "u_mod_noaccess@example.com")

        assert client.get("/users", headers=auth(token)).status_code == 403
        assert client.post("/users", json={}, headers=auth(token)).status_code == 403
        assert client.get("/users/1", headers=auth(token)).status_code == 403
        assert client.patch("/users/1", json={}, headers=auth(token)).status_code == 403
        assert client.post("/users/1/reset-password", headers=auth(token)).status_code == 403

    def test_create_user_returns_setup_token_and_correct_role(self, client):
        admin_token = self._admin_token(client, "create")

        resp = client.post("/users", json={
            "email": "u_created@example.com",
            "first_name": "Created",
            "last_name": "User",
            "role": "moderator",
        }, headers=auth(admin_token))

        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["role"] == "moderator"
        assert data["is_active"] is True
        assert "setup_token" in data and len(data["setup_token"]) > 20

        # The returned token actually works end-to-end.
        setup_resp = client.post("/auth/setup-password", json={
            "token": data["setup_token"], "password": "TheirNewPass1!",
        })
        assert setup_resp.status_code == 200

    def test_create_user_duplicate_email_conflict(self, client):
        admin_token = self._admin_token(client, "dupe")
        payload = {
            "email": "u_dupe@example.com", "first_name": "A", "last_name": "B",
            "role": "moderator",
        }
        first = client.post("/users", json=payload, headers=auth(admin_token))
        assert first.status_code == 201
        second = client.post("/users", json=payload, headers=auth(admin_token))
        assert second.status_code == 409

    def test_create_user_invalid_role_rejected(self, client):
        admin_token = self._admin_token(client, "badrole")
        resp = client.post("/users", json={
            "email": "u_badrole@example.com", "first_name": "A", "last_name": "B",
            "role": "super_admin",
        }, headers=auth(admin_token))
        assert resp.status_code == 422

    def test_list_users_search_and_role_filter(self, client):
        admin_token = self._admin_token(client, "list")
        client.post("/users", json={
            "email": "u_findme@example.com", "first_name": "Findable",
            "last_name": "Person", "role": "staff_editor",
        }, headers=auth(admin_token))

        resp = client.get("/users?search=Findable", headers=auth(admin_token))
        assert resp.status_code == 200
        emails = [u["email"] for u in resp.get_json()["data"]["items"]]
        assert "u_findme@example.com" in emails

        resp = client.get("/users?role=staff_editor", headers=auth(admin_token))
        assert resp.status_code == 200
        roles = {u["role"] for u in resp.get_json()["data"]["items"]}
        assert roles <= {"staff_editor"}

    def test_disabled_account_cannot_authenticate(self, client):
        admin_token = self._admin_token(client, "disable")
        create_resp = client.post("/users", json={
            "email": "u_disableme@example.com", "first_name": "A", "last_name": "B",
            "role": "moderator",
        }, headers=auth(admin_token))
        setup_token = create_resp.get_json()["data"]["setup_token"]
        client.post("/auth/setup-password", json={
            "token": setup_token, "password": "SomePass1!",
        })

        target_id = create_resp.get_json()["data"]["user_id"]
        patch_resp = client.patch(
            f"/users/{target_id}", json={"is_active": False}, headers=auth(admin_token)
        )
        assert patch_resp.status_code == 200

        login_resp = client.post("/auth/login", json={
            "email": "u_disableme@example.com", "password": "SomePass1!",
        })
        assert login_resp.status_code == 401

    def test_reset_password_invalidates_previous_token(self, client):
        admin_token = self._admin_token(client, "reset")
        create_resp = client.post("/users", json={
            "email": "u_resetme@example.com", "first_name": "A", "last_name": "B",
            "role": "moderator",
        }, headers=auth(admin_token))
        old_token = create_resp.get_json()["data"]["setup_token"]
        target_id = create_resp.get_json()["data"]["user_id"]

        reset_resp = client.post(f"/users/{target_id}/reset-password", headers=auth(admin_token))
        assert reset_resp.status_code == 200
        new_token = reset_resp.get_json()["data"]["setup_token"]
        assert new_token != old_token

        # Old link is dead.
        old_attempt = client.post("/auth/setup-password", json={
            "token": old_token, "password": "WontWork1!",
        })
        assert old_attempt.status_code == 401

        # New link works.
        new_attempt = client.post("/auth/setup-password", json={
            "token": new_token, "password": "WillWork1!",
        })
        assert new_attempt.status_code == 200


# ============================================================================
# Category/tag usage_count + safe deactivation (requirements 5 & 6)
# ============================================================================
class TestCategoryUsageAndDeactivation:

    def test_usage_counts_block_and_safe_deactivation(self, client):
        make_user("c_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "c_staff@example.com")

        def make_category(name):
            resp = client.post("/categories", json={
                "name": name, "slug": name.lower().replace(" ", "-"),
            }, headers=auth(staff_token))
            assert resp.status_code == 201
            return resp.get_json()["data"]["category_id"]

        cat_a = make_category("Cat Usage A")
        cat_b = make_category("Cat Usage B")
        cat_c = make_category("Cat Usage C Unused")
        cat_d = make_category("Cat Usage D Removable")

        make_user("c_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "c_mod@example.com")

        # Resource 1: A + B + D  -- D is never anyone's sole category
        r1 = create_resource_api(
            client, mod_token, name="Usage Resource 1", resource_type="Organization",
            category_ids=[cat_a, cat_b, cat_d],
        )["resource_id"]
        # Resource 2: A only -- A is sole here
        create_resource_api(
            client, mod_token, name="Usage Resource 2", resource_type="Organization",
            category_ids=[cat_a],
        )
        # Resource 3: B only -- B is sole here
        create_resource_api(
            client, mod_token, name="Usage Resource 3", resource_type="Organization",
            category_ids=[cat_b],
        )

        # usage_count reflects all of the above
        list_resp = client.get("/categories")
        by_id = {c["category_id"]: c for c in list_resp.get_json()["data"]}
        assert by_id[cat_a]["usage_count"] == 2
        assert by_id[cat_b]["usage_count"] == 2
        assert by_id[cat_c]["usage_count"] == 0
        assert by_id[cat_d]["usage_count"] == 1

        # Deactivating A is blocked -- Resource 2 has no other category
        blocked = client.delete(f"/categories/{cat_a}", headers=auth(staff_token))
        assert blocked.status_code == 409
        assert Category.query.get(cat_a).is_active == 1

        # Deactivating D succeeds -- never anyone's sole category
        ok_resp = client.delete(f"/categories/{cat_d}", headers=auth(staff_token))
        assert ok_resp.status_code == 200
        assert Category.query.get(cat_d).is_active == 0

        # Resource 1 lost D but kept A and B; still published
        r1_obj = Resource.query.get(r1)
        remaining = {
            row.category_id for row in ResourceVersionCategory.query.filter_by(
                resource_version_id=r1_obj.current_approved_version_id # pyright: ignore[reportOptionalMemberAccess]
            ).all()
        }
        assert remaining == {cat_a, cat_b}
        assert r1_obj.is_active == 1 # pyright: ignore[reportOptionalMemberAccess]

        # D no longer appears in the active category list
        list_resp2 = client.get("/categories")
        ids = {c["category_id"] for c in list_resp2.get_json()["data"]}
        assert cat_d not in ids

    def test_historical_version_category_link_preserved(self, client):
        """A category used only on a SUPERSEDED (non-current) version must
        never block deactivation, and must never be touched by it."""
        make_user("c_hist_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "c_hist_mod@example.com")
        make_user("c_hist_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "c_hist_staff@example.com")

        cat_resp = client.post("/categories", json={
            "name": "Historical Only Cat", "slug": "historical-only-cat",
        }, headers=auth(staff_token))
        historical_cat_id = cat_resp.get_json()["data"]["category_id"]

        # Published resource, but with NO categories on its current version.
        resource_id = create_resource_api(
            client, mod_token, name="Historical Version Resource",
            resource_type="Organization", category_ids=[],
        )["resource_id"]

        resource = Resource.query.get(resource_id)
        old_version_id = resource.current_approved_version_id

        # Directly attach the category to that OLD version only (simulating
        # a version that had it before being superseded).
        db.session.add(ResourceVersionCategory(
            resource_version_id=old_version_id, category_id=historical_cat_id
        ))
        db.session.commit()

        # Now supersede it with a NEW current version that does NOT carry
        # the category -- current_approved_version_id moves on.
        new_version = ResourceVersion(
            resource_id=resource.resource_id,
            resource_type="Organization",
            moderation_status="approved",
            name="Historical Version Resource (v2)",
            submitted_by_user_id=None,
        )
        db.session.add(new_version)
        db.session.flush()
        resource.current_approved_version_id = new_version.resource_version_id
        db.session.commit()

        # The category is not on the CURRENT version anywhere -- deactivating
        # it must succeed immediately, and must not touch the old version's row.
        resp = client.delete(f"/categories/{historical_cat_id}", headers=auth(staff_token))
        assert resp.status_code == 200

        still_there = ResourceVersionCategory.query.filter_by(
            resource_version_id=old_version_id, category_id=historical_cat_id
        ).first()
        assert still_there is not None  # history untouched


# ============================================================================
# Reviewer-edited approval (requirement 3)
# ============================================================================
class TestReviewerEditedApproval:

    def test_approve_without_approved_version_unchanged_behaviour(self, client):
        submit_resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Plain Approval Org",
            "resource_type": "Organization",
        })
        assert submit_resp.status_code == 201
        body = submit_resp.get_json()["data"]

        make_user("rv_mod1@example.com", role_name="moderator")
        mod_token = get_token(client, "rv_mod1@example.com")

        review_resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "approved"},
            headers=auth(mod_token),
        )
        assert review_resp.status_code == 200
        review_data = review_resp.get_json()["data"]
        assert review_data["included_reviewer_edits"] is False
        assert review_data["published_version_id"] == body["proposed_version_id"]

        resource = Resource.query.get(body["resource_id"])
        assert resource.current_approved_version_id == body["proposed_version_id"]
        assert resource.is_active == 1

    def test_approve_with_approved_version_publishes_new_version(self, client):
        submit_resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Original Submitter Name",
            "resource_type": "Organization",
            "description": "Original description",
        })
        body = submit_resp.get_json()["data"]
        original_version_id = body["proposed_version_id"]

        make_user("rv_mod2@example.com", role_name="moderator")
        mod_token = get_token(client, "rv_mod2@example.com")

        review_resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={
                "decision": "approved",
                "review_comment": "Cleaned up before publishing.",
                "approved_version": {
                    "name": "Reviewer-Edited Name",
                    "resource_type": "Organization",
                    "description": "Reviewer-edited description",
                },
            },
            headers=auth(mod_token),
        )
        assert review_resp.status_code == 200
        review_data = review_resp.get_json()["data"]
        assert review_data["included_reviewer_edits"] is True
        new_version_id = review_data["published_version_id"]
        assert new_version_id != original_version_id

        # Resource points at the NEW version, never the original.
        resource = Resource.query.get(body["resource_id"])
        assert resource.current_approved_version_id == new_version_id
        assert resource.is_active == 1

        new_version = ResourceVersion.query.get(new_version_id)
        assert new_version.name == "Reviewer-Edited Name"
        assert new_version.moderation_status == "approved"

        # Original submitter's content is untouched.
        original_version = ResourceVersion.query.get(original_version_id)
        assert original_version.name == "Original Submitter Name"
        assert original_version.description == "Original description"
        assert original_version.moderation_status == "approved"  # metadata updates

        # proposed_version_id still points at the ORIGINAL, never repointed.
        submission = Submission.query.get(body["submission_id"])
        assert submission.proposed_version_id == original_version_id

        # Audit trail recorded the edit.
        review_row = SubmissionReview.query.filter_by(
            submission_id=body["submission_id"]
        ).order_by(SubmissionReview.reviewed_at.desc()).first()
        assert review_row.included_reviewer_edits == 1

    def test_approved_version_missing_name_rejected(self, client):
        submit_resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Needs A Name Fix",
            "resource_type": "Organization",
        })
        body = submit_resp.get_json()["data"]

        make_user("rv_mod3@example.com", role_name="moderator")
        mod_token = get_token(client, "rv_mod3@example.com")

        resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "approved", "approved_version": {"description": "no name given"}},
            headers=auth(mod_token),
        )
        assert resp.status_code == 422

    def test_update_resource_reviewer_edit_does_not_flip_is_active(self, client):
        make_user("rv_mod4@example.com", role_name="moderator")
        mod_token = get_token(client, "rv_mod4@example.com")

        resource_id = create_resource_api(
            client, mod_token, name="Update Target Base", resource_type="Organization",
        )["resource_id"]

        submit_resp = client.post("/submissions", json={
            "submission_type": "update_resource",
            "resource_id": resource_id,
            "name": "Proposed Update Name",
            "resource_type": "Organization",
        })
        body = submit_resp.get_json()["data"]

        review_resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={
                "decision": "approved",
                "approved_version": {"name": "Reviewer-Edited Update Name", "resource_type": "Organization"},
            },
            headers=auth(mod_token),
        )
        assert review_resp.status_code == 200
        resource = Resource.query.get(resource_id)
        assert resource.is_active == 1  # was already active; still is, not a side effect


# ============================================================================
# Skills follow-up workflow (requirement 4)
# ============================================================================
class TestSkillsFollowUpWorkflow:

    def _submit_skill(self, client, name="Guitar Lessons"):
        resp = client.post("/submissions", json={
            "submission_type": "community_asset",
            "name": name,
            "resource_type": "Volunteer Skill",
            "submitter_name": "Jamie Skillful",
            "submitter_email": "jamie@example.com",
        })
        assert resp.status_code == 201
        return resp.get_json()["data"]

    def test_approved_decision_rejected_for_skills(self, client):
        body = self._submit_skill(client, "Skill Cannot Approve Directly")
        make_user("sk_mod1@example.com", role_name="moderator")
        mod_token = get_token(client, "sk_mod1@example.com")

        resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "approved"},
            headers=auth(mod_token),
        )
        assert resp.status_code == 422

    def test_accepted_for_follow_up_rejected_for_non_skills(self, client):
        submit_resp = client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Not A Skill",
            "resource_type": "Organization",
        })
        body = submit_resp.get_json()["data"]
        make_user("sk_mod2@example.com", role_name="moderator")
        mod_token = get_token(client, "sk_mod2@example.com")

        resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "accepted_for_follow_up"},
            headers=auth(mod_token),
        )
        assert resp.status_code == 422

    def test_accepted_for_follow_up_keeps_resource_unpublished(self, client):
        body = self._submit_skill(client, "Skill Stays Hidden")
        make_user("sk_mod3@example.com", role_name="moderator")
        mod_token = get_token(client, "sk_mod3@example.com")

        resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "accepted_for_follow_up", "review_comment": "Reaching out."},
            headers=auth(mod_token),
        )
        assert resp.status_code == 200

        resource = Resource.query.get(body["resource_id"])
        assert resource.is_active == 0
        assert resource.current_approved_version_id is None

        submission = Submission.query.get(body["submission_id"])
        assert submission.moderation_status == "accepted_for_follow_up"

        follow_up = SkillsFollowUp.query.filter_by(submission_id=body["submission_id"]).first()
        assert follow_up is not None
        assert follow_up.status == "accepted"

        # No longer sitting in the pending_review queue for this type.
        still_pending = Submission.query.filter_by(
            submission_id=body["submission_id"], moderation_status="pending_review"
        ).first()
        assert still_pending is None

        proposed_version = ResourceVersion.query.get(body["proposed_version_id"])
        assert proposed_version.moderation_status == "accepted_for_follow_up"

    def test_skills_submission_can_still_be_rejected(self, client):
        body = self._submit_skill(client, "Skill Gets Rejected")
        make_user("sk_mod4@example.com", role_name="moderator")
        mod_token = get_token(client, "sk_mod4@example.com")

        resp = client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "rejected"},
            headers=auth(mod_token),
        )
        assert resp.status_code == 200
        assert Submission.query.get(body["submission_id"]).moderation_status == "rejected"

    def test_skills_follow_up_crud_and_rbac(self, client):
        body = self._submit_skill(client, "Skill Full CRUD Path")
        make_user("sk_mod5@example.com", role_name="moderator")
        mod_token = get_token(client, "sk_mod5@example.com")
        client.post(
            f"/submissions/{body['submission_id']}/review",
            json={"decision": "accepted_for_follow_up"},
            headers=auth(mod_token),
        )
        follow_up_id = SkillsFollowUp.query.filter_by(
            submission_id=body["submission_id"]
        ).first().follow_up_id

        make_user("sk_trusted@example.com", role_name="trusted_contributor")
        low_token = get_token(client, "sk_trusted@example.com")
        assert client.get("/skills-follow-ups", headers=auth(low_token)).status_code == 403
        assert client.get(f"/skills-follow-ups/{follow_up_id}", headers=auth(low_token)).status_code == 403
        assert client.patch(f"/skills-follow-ups/{follow_up_id}", json={}, headers=auth(low_token)).status_code == 403

        list_resp = client.get("/skills-follow-ups?status=accepted", headers=auth(mod_token))
        assert list_resp.status_code == 200
        ids = [f["follow_up_id"] for f in list_resp.get_json()["data"]["items"]]
        assert follow_up_id in ids

        detail_resp = client.get(f"/skills-follow-ups/{follow_up_id}", headers=auth(mod_token))
        assert detail_resp.status_code == 200
        assert detail_resp.get_json()["data"]["submission"]["submitter_name"] == "Jamie Skillful"

        contacted_resp = client.patch(
            f"/skills-follow-ups/{follow_up_id}",
            json={"status": "contacted", "internal_notes": "Left a voicemail."},
            headers=auth(mod_token),
        )
        assert contacted_resp.status_code == 200
        assert contacted_resp.get_json()["data"]["status"] == "contacted"

        # converted requires converted_resource_id
        bad_convert = client.patch(
            f"/skills-follow-ups/{follow_up_id}", json={"status": "converted"}, headers=auth(mod_token),
        )
        assert bad_convert.status_code == 422

        published_id = create_resource_api(
            client, mod_token, name="Converted From Skill", resource_type="Organization",
        )["resource_id"]

        good_convert = client.patch(
            f"/skills-follow-ups/{follow_up_id}",
            json={"status": "converted", "converted_resource_id": published_id},
            headers=auth(mod_token),
        )
        assert good_convert.status_code == 200
        assert good_convert.get_json()["data"]["converted_resource_id"] == published_id


# ============================================================================
# Dashboard category_distribution (requirement 8)
# ============================================================================
class TestDashboardCategoryDistribution:

    def test_zero_count_categories_included_and_sorted(self, client):
        make_user("d_staff@example.com", role_name="staff_editor")
        staff_token = get_token(client, "d_staff@example.com")
        make_user("d_mod@example.com", role_name="moderator")
        mod_token = get_token(client, "d_mod@example.com")

        popular = client.post("/categories", json={
            "name": "Distribution Popular", "slug": "distribution-popular",
        }, headers=auth(staff_token)).get_json()["data"]["category_id"]
        empty = client.post("/categories", json={
            "name": "Distribution Empty", "slug": "distribution-empty",
        }, headers=auth(staff_token)).get_json()["data"]["category_id"]

        for i in range(2):
            create_resource_api(
                client, mod_token, name=f"Dist Resource {i}", resource_type="Organization",
                category_ids=[popular],
            )

        resp = client.get("/dashboard/stats", headers=auth(mod_token))
        assert resp.status_code == 200
        distribution = {
            row["category_id"]: row["resource_count"]
            for row in resp.get_json()["data"]["category_distribution"]
        }
        assert distribution[popular] == 2
        assert distribution[empty] == 0  # zero-count category still present

    def test_unpublished_resources_not_counted(self, client):
        make_user("d_staff2@example.com", role_name="staff_editor")
        staff_token = get_token(client, "d_staff2@example.com")
        make_user("d_mod2@example.com", role_name="moderator")
        mod_token = get_token(client, "d_mod2@example.com")

        cat = client.post("/categories", json={
            "name": "Distribution Unpublished", "slug": "distribution-unpublished",
        }, headers=auth(staff_token)).get_json()["data"]["category_id"]

        # Submitted but never approved -- resource.is_active stays 0.
        client.post("/submissions", json={
            "submission_type": "new_resource",
            "name": "Never Approved",
            "resource_type": "Organization",
            "category_ids": [cat],
        })

        resp = client.get("/dashboard/stats", headers=auth(mod_token))
        distribution = {
            row["category_id"]: row["resource_count"]
            for row in resp.get_json()["data"]["category_distribution"]
        }
        assert distribution[cat] == 0
