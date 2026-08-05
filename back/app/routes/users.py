# app/routes/users.py
# pyright: reportCallIssue=false
"""
Users Blueprint  administrator-only staff account management
(requirement 2, Add Administrator User Management).

Implements the PREFERRED flow from the request doc: one-time setup link,
not the fallback default-password/must_change_password flow. That's a
deliberate scope choice, not an oversight -- building both would mean two
parallel, partially-redundant password-bootstrap systems for no gain
here. If the fallback is specifically wanted later, it's a small addition
(a default password constant + a `must_change_password` column) and
doesn't require touching anything below.

Routes:
  GET   /users                     - paginated list, search + role/status filters
  GET   /users/<int:id>            - single user detail
  POST  /users                     - create a new staff account + one-time setup link
  PATCH /users/<int:id>            - edit account fields / role / active status
  POST  /users/<id>/reset-password - issue a fresh one-time setup link

All administrator-only. Reuses PasswordResetToken (already in the schema,
previously unused by any route) as the setup-link mechanism -- same
token_hash-not-plaintext design as any other reset flow.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db, bcrypt
from app.models import PasswordResetToken, Role, User, UserRole
from app.utils import ok, err, paginate, require_roles, validate_text_length

users_bp = Blueprint("users", __name__, url_prefix="/users")

_NAME_MAX = 100
_SETUP_TOKEN_TTL_HOURS = 48
_PLACEHOLDER_PW_BYTES = 32  # unusable placeholder hash for pending-setup accounts


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _issue_setup_token(user_id: int) -> str:
    """
    Create a one-time setup/reset token for user_id, persist only its
    SHA-256 hash, and return the RAW token. The raw value is returned
    exactly once, here -- callers must relay it to the user out-of-band
    (there is no email integration in this codebase); it cannot be
    recovered from the DB afterwards.
    """
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_SETUP_TOKEN_TTL_HOURS)
    db.session.add(PasswordResetToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
    ))
    return raw_token


def _user_to_dict(user: User) -> dict:
    return {
        "user_id":    user.user_id,
        "first_name": user.first_name,
        "last_name":  user.last_name,
        "email":      user.email,
        "role":       user.role_name,
        "is_active":  bool(user.is_active),
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
    }


def _replace_role(user_id: int, role_name: str, assigned_by_user_id: int):
    """One role per account: replace, never accumulate (requirement 2:
    'Creating and updating users must support only one role per account')."""
    UserRole.query.filter_by(user_id=user_id).delete()
    role = Role.query.filter_by(role_name=role_name).first()
    assert role is not None
    db.session.add(UserRole(
        user_id=user_id, role_id=role.role_id, assigned_by_user_id=assigned_by_user_id,
    ))


# GET /users
@users_bp.get("")
@require_roles("administrator")
def list_users():
    search = (request.args.get("search") or "").strip()
    role_filter = request.args.get("role")
    active_param = request.args.get("is_active")
    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, int(request.args.get("limit", 20)))

    query = User.query.filter(User.deleted_at.is_(None))

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                User.first_name.ilike(like),
                User.last_name.ilike(like),
                User.email.ilike(like),
            )
        )

    if role_filter:
        if role_filter not in Role.HIERARCHY:
            return err(f"role must be one of: {Role.HIERARCHY}.", 400)
        query = (
            query.join(UserRole, UserRole.user_id == User.user_id)
                 .join(Role, Role.role_id == UserRole.role_id)
                 .filter(Role.role_name == role_filter)
        )

    if active_param is not None:
        query = query.filter(User.is_active == (1 if active_param.lower() in ("1", "true") else 0))

    query = query.order_by(User.created_at.desc())
    result = paginate(query, page, limit)
    result["items"] = [_user_to_dict(u) for u in result["items"]]
    return ok(result, "Users retrieved.")


# GET /users/<id>
@users_bp.get("/<int:user_id>")
@require_roles("administrator")
def get_user(user_id):
    user = User.query.filter_by(user_id=user_id).filter(User.deleted_at.is_(None)).first()
    if not user:
        return err("User not found.", 404)
    return ok(_user_to_dict(user), "User retrieved.")


# POST /users
@users_bp.post("")
@require_roles("administrator")
def create_user():
    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    email = (data.get("email") or "").strip().lower()
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    role_name = data.get("role")

    missing = [
        f for f, v in (
            ("email", email), ("first_name", first_name),
            ("last_name", last_name), ("role", role_name),
        ) if not v
    ]
    if missing:
        return err("Missing required fields.", 422, {f: "Required." for f in missing})

    if "@" not in email or "." not in email.split("@")[-1]:
        return err("Invalid email address.", 422, {"email": "Must be a valid email."})

    field_errors = {}
    validate_text_length(first_name, "first_name", _NAME_MAX, field_errors)
    validate_text_length(last_name, "last_name", _NAME_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if role_name not in Role.HIERARCHY:
        return err(f"role must be one of: {Role.HIERARCHY}.", 422, {"role": "Invalid role."})

    if User.query.filter_by(email=email).first():
        return err(f"A user with email '{email}' already exists.", 409)

    if not Role.query.filter_by(role_name=role_name).first():
        return err(f"Role '{role_name}' is not seeded in this environment.", 500)

    try:
        # Unusable placeholder password -- the real password is set via
        # POST /auth/setup-password using the token returned below. Nobody
        # can log in with this hash; it's a random value nobody will ever
        # type in as a password guess, and it's immediately overwritten
        # once setup-password runs.
        placeholder_hash = bcrypt.generate_password_hash(
            secrets.token_urlsafe(_PLACEHOLDER_PW_BYTES)
        ).decode("utf-8")

        user = User(
            email=email,
            password_hash=placeholder_hash,
            first_name=first_name,
            last_name=last_name,
            is_active=1,
        )
        db.session.add(user)
        db.session.flush()  # get user_id before FK use

        _replace_role(user.user_id, role_name, assigned_by_user_id=int(get_jwt_identity()))
        setup_token = _issue_setup_token(user.user_id)

        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to create user: {str(exc)}", 500)

    payload = _user_to_dict(user)
    payload["setup_token"] = setup_token
    payload["setup_token_expires_in_hours"] = _SETUP_TOKEN_TTL_HOURS
    return ok(
        payload,
        "User created. Share the setup link/token with them -- it is only "
        f"returned once, expires in {_SETUP_TOKEN_TTL_HOURS} hours, and can be used once.",
        201,
    )


# PATCH /users/<id>
@users_bp.patch("/<int:user_id>")
@require_roles("administrator")
def update_user(user_id):
    user = User.query.filter_by(user_id=user_id).filter(User.deleted_at.is_(None)).first()
    if not user:
        return err("User not found.", 404)

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    field_errors = {}
    if "first_name" in data:
        validate_text_length(data["first_name"], "first_name", _NAME_MAX, field_errors)
    if "last_name" in data:
        validate_text_length(data["last_name"], "last_name", _NAME_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if "email" in data:
        email = (data["email"] or "").strip().lower()
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            return err("Invalid email address.", 422, {"email": "Must be a valid email."})
        existing = User.query.filter_by(email=email).first()
        if existing and existing.user_id != user_id:
            return err(f"Email '{email}' is already taken.", 409)

    if "role" in data and data["role"] not in Role.HIERARCHY:
        return err(f"role must be one of: {Role.HIERARCHY}.", 422, {"role": "Invalid role."})
    if "role" in data and not Role.query.filter_by(role_name=data["role"]).first():
        return err(f"Role '{data['role']}' is not seeded in this environment.", 500)

    try:
        if "email" in data:
            user.email = (data["email"] or "").strip().lower()
        if "first_name" in data:
            user.first_name = data["first_name"].strip()
        if "last_name" in data:
            user.last_name = data["last_name"].strip()
        if "is_active" in data:
            user.is_active = 1 if data["is_active"] else 0
        if "role" in data:
            _replace_role(user_id, data["role"], assigned_by_user_id=int(get_jwt_identity()))

        user.updated_at = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to update user: {str(exc)}", 500)

    return ok(_user_to_dict(user), "User updated.")


# POST /users/<id>/reset-password
@users_bp.post("/<int:user_id>/reset-password")
@require_roles("administrator")
def reset_password(user_id):
    user = User.query.filter_by(user_id=user_id).filter(User.deleted_at.is_(None)).first()
    if not user:
        return err("User not found.", 404)

    try:
        # Invalidate any still-live outstanding token for this user first,
        # so only the newest link is usable.
        PasswordResetToken.query.filter_by(user_id=user_id, used_at=None).update(
            {"used_at": datetime.now(timezone.utc)}
        )
        setup_token = _issue_setup_token(user_id)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to issue reset token: {str(exc)}", 500)

    return ok(
        {
            "user_id": user.user_id,
            "setup_token": setup_token,
            "setup_token_expires_in_hours": _SETUP_TOKEN_TTL_HOURS,
        },
        "Password reset link issued.",
    )