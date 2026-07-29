# you get false errors if you dont do this
# pyright: reportCallIssue=false
"""
Auth Blueprint RRCRC Backend

Routes:
  POST /auth/register: create account, bcrypt hash, no roles assigned
  POST /auth/login: verify password, issue access_token (JSON) + refresh_token (HttpOnly cookie)
  POST /auth/refresh: read refresh cookie, mint new access token
  POST /auth/logout: clear the refresh cookie
  GET  /auth/me: return the current user for the presented access token (D2)
"""

from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    set_refresh_cookies,
    unset_refresh_cookies,
    jwt_required,
)

from app.extensions import db, bcrypt
from app.models import User
from app.utils import ok, err

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

_DUMMY_HASH = "$2b$12$s6xZAo5tXUj9QeGvPbChs.gSBKGdzNwWKfMv8/NPYOlXBrqNnoA.e"


# POST /auth/register
@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Create a new user account.
    Body (JSON):
      {
        "email":      "user@example.com",
        "password":   "plaintext",
        "first_name": "Jane",
        "last_name":  "Doe"
      }
    """
    data = request.get_json(silent=True)
    if data is None:
        return err("Request body must be JSON.", 400)

    # Required field validation
    required = ["email", "password", "first_name", "last_name"]
    missing = [f for f in required if not (data.get(f) or "").strip()]
    if missing:
        return err(
            "Missing required fields.",
            422,
            {f: "This field is required." for f in missing},
        )

    email = data["email"].strip().lower()
    password = data["password"]
    first_name = data["first_name"].strip()
    last_name = data["last_name"].strip()

    # Basic email format check
    if "@" not in email or "." not in email.split("@")[-1]:
        return err("Invalid email address.", 422, {"email": "Must be a valid email."})

    # Minimum password length
    if len(password) < 8:
        return err(
            "Password too short.",
            422,
            {"password": "Must be at least 8 characters."},
        )

    # Collision check, generic message to prevent user enumeration
    if User.query.filter_by(email=email).first():
        return err("Registration failed. Please check your details (Email) and try again. You may already have an account.", 409)

    # Hash and store
    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(
        email=email,
        password_hash=pw_hash,
        first_name=first_name,
        last_name=last_name,
        is_active=1,
    )
    db.session.add(user)
    db.session.commit()

    return ok(user.to_dict(), "Account created successfully.", 201)


# POST /auth/login
@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and issue dual tokens.
    Body (JSON):
      {
        "email":    "user@example.com",
        "password": "plaintext"
      }
    """
    data = request.get_json(silent=True)
    if data is None:
        return err("Request body must be JSON.", 400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return err("Both Email and password are required.", 422)

    # run bcrypt check, prevents timing attacks on user lookup
    user = User.query.filter_by(email=email).first()
    candidate_hash = user.password_hash if user else _DUMMY_HASH
    try:
        password_ok = bcrypt.check_password_hash(candidate_hash, password)
    except ValueError:
        from flask import current_app
        current_app.logger.error(
            "Malformed password hash encountered during login for user_id=%s",
            user.user_id if user else "unknown",
        )
        password_ok = False

    if not user or not password_ok or not user.is_active:
        return err("Invalid credentials. The email or password is incorrect.", 401)

    # Issue tokens
    identity = str(user.user_id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)

    response_data = {
        "access_token": access_token,
        "user": user.to_dict(include_roles=True),
    }

    response, status = ok(response_data, "Login successful.", 200)

    set_refresh_cookies(response, refresh_token)

    return response, status


# POST /auth/refresh
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Mint a new access token using the refresh cookie.
    """
    identity = get_jwt_identity()

    # Confirm the user account is still active
    user = User.query.get(int(identity))
    if not user or not user.is_active:
        return err("Account not found or inactive.", 401)

    new_access_token = create_access_token(identity=identity)
    return ok({"access_token": new_access_token}, "Token refreshed.", 200)


# POST /auth/logout
@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Clear the refresh token cookie.
    """
    response, status = ok(None, "Logged out successfully.", 200)
    unset_refresh_cookies(response)
    return response, status


# GET /auth/me
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    Return the current user for the presented access token.
    """
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return err("Invalid token subject.", 401)

    user = User.query.get(user_id)
    if not user or not user.is_active:
        return err("Account not found or inactive.", 401)

    return ok({"user": user.to_dict(include_roles=True)}, "Current user retrieved.", 200)
