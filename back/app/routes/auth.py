# you get false errors if you dont do this
# pyright: reportCallIssue=false
"""
Auth Blueprint RRCRC Backend

Routes:
  POST /auth/register: create account, bcrypt hash, no roles assigned
  POST /auth/login: verify password, issue access_token (JSON) + refresh_token (HttpOnly cookie)
  POST /auth/refresh:read refresh cookie, mint new access token
  POST /auth/logout:clear the refresh cookie
"""

from datetime import datetime, timezone, timedelta

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

#POST /auth/register
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
    missing = [f for f in required if not data.get(f, "").strip()]
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

    #Basic email format check
    if "@" not in email or "." not in email.split("@")[-1]:
        return err("Invalid email address.", 422, {"email": "Must be a valid email."})

    #Minimum password length
    if len(password) < 8:
        return err(
            "Password too short.",
            422,
            {"password": "Must be at least 8 characters."},
        )

    # Collision check,generic message to prevent user enumeration
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

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return err("Both Email and password are required.", 422)

    #run bcrypt check, prevents timing attacks on user lookup
    user = User.query.filter_by(email=email).first()
    dummy_hash = "$2b$12$CgUFx5qJbl8t8ey9j8m5P.eV1Zm5oZm5oZm5oZm5oZm5oZm5oZm5o"
    candidate_hash = user.password_hash if user else dummy_hash

    password_ok = bcrypt.check_password_hash(candidate_hash, password)

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