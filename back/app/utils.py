# app/utils.py
"""
Shared utilities for the RRCRC Flask backend.

Five responsibilities:
  1. ok()/err(): standardized JSON response envelopes
  2. paginate(): SQLAlchemy paginator with an upper cap
  3. generate_unique_slug(): URL-safe slug with recursive collision handling
  4. require_roles(): JWT-aware RBAC decorator
  5. check_and_increment_rate_limit(): IP-based anonymous submission gate (ToDo)
"""

import re
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.extensions import db

# Constants
MAX_PAGE_SIZE = 100          # Hard ceiling on ?per_page=
RATE_LIMIT_WINDOW_HOURS = 1  # Clock-hour window for anonymous submission throttle (ignore for now)
RATE_LIMIT_MAX_SUBMISSIONS = 5  # Max submissions per IP per window (ignore for now)

# 1. Response Envelopes
def ok(data=None, message="Success", status_code=200):
    """
    Build a successful JSON response for status_codes HTTP status (200, 201, 204, etc.).
    """
    payload = {
        "status": "success",
        "message": message,
        "data": data,
    }
    return jsonify(payload), status_code


def err(message="An error occurred", status_code=400, errors=None):
    """
    Build an error JSON response for status_code: HTTP status (400, 401, 403, 404, 409, 422, 429, 500).
    errors: optional dict of field-level validation issues
    """
    payload = {
        "status": "error",
        "message": message,
    }
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status_code


# 2. Pagination
def paginate(query, page, per_page):
    """
    Execute a SQLAlchemy query with pagination and return data + metadata.

    How to make request:
        page= request.args.get("page", 1, type=int)
        per_page= request.args.get("per_page", 20, type=int)
        result= paginate(Resource.query.filter_by(is_active=1), page, per_page)
        return ok({"resources": [r.to_dict_summary() for r in result["items"]],
                   "pagination": result["meta"]})
    """
    # Resolve per_page to a safe range
    per_page = min(max(per_page, 1), MAX_PAGE_SIZE)
    page = max(page, 1)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    meta = {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total_items": pagination.total,
        "total_pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }

    return {"items": pagination.items, "meta": meta}


# 3. Slug Generation 
# Co-authored by Claude
def _slugify(text):
    """
    Convert a plain-text name into a lowercase, hyphenated URL slug.
    """
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text


def generate_unique_slug(name, model_class=None):
    """
    Generate a URL slug from `name` that doesn't collide with any existing
    slug already stored in the given model's table.

    Collision strategy: append "-2", "-3", ... until unique.
    """
    from app.models import Resource as _Resource  # lazy import, avoids circular dep

    _model = model_class or _Resource

    base = _slugify(name)
    candidate = base
    counter = 2

    while True:
        # Check DB for collision
        existing = _model.query.filter_by(slug=candidate).first()
        if existing is None:
            return candidate
        # Collision, try next suffix
        candidate = f"{base}-{counter}"
        counter += 1


# 4. RBAC Decorator
def require_roles(*roles):
    """
    Route decorator that enforces role-based access control on top of JWT.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            #validate the JWT
            verify_jwt_in_request()

            #load the user from DB
            from app.models import User  # lazy import
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user or not user.is_active:
                return err("Account not found or inactive.", 401)

            #RBAC check
            if not user.has_role(*roles):
                return err(
                    f"Access denied. Required role(s): {', '.join(roles)}.",
                    403,
                )

            return fn(*args, **kwargs)
        return wrapper
    return decorator


# 5. Rate Limiting Still working on this one and figuring out the best logic.
def _get_window_start():
    """
    Return the floor of the current UTC time truncated to the hour.
    """
    now = datetime.now(timezone.utc)
    return now.replace(minute=0, second=0, microsecond=0)


def check_and_increment_rate_limit(ip_hash):
    """
    Gate anonymous submissions against IP-based flood control.
    """
    from app.models import SubmissionRateLimit  # lazy import

    window = _get_window_start()

    record = SubmissionRateLimit.query.filter_by(
        ip_hash=ip_hash,
        window_start=window,
    ).first()

    if record:
        if record.count >= RATE_LIMIT_MAX_SUBMISSIONS:
            # Limit hit — do NOT increment (avoid integer overflow on spam)
            return False
        record.count += 1
    else:
        # First submission this window for this IP
        record = SubmissionRateLimit(
            ip_hash=ip_hash,
            window_start=window,
            count=1,
        )
        db.session.add(record)

    db.session.commit()
    return True
