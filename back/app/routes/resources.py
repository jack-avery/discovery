# pyright: reportCallIssue=false
"""
Resources Blueprint

Routes:
  GET    /resources/map             - Haversine pin payload (public)
  GET    /resources                 - paginated list with filters (public)
  GET    /resources/<int:id>        - full detail by numeric ID (public)
  GET    /resources/slug/<slug>     - full detail by slug (public)
  POST   /resources                 - create resource + version (staff_editor+)
  PUT    /resources/<int:id>        - new version, repoint pointer (staff_editor+)
  DELETE /resources/<int:id>        - soft delete via deleted_at (administrator)
"""

import math
from datetime import datetime, timezone

from flask import Blueprint, request

from app.extensions import db
from app.utils import (
    ok, err, paginate, generate_unique_slug, require_roles,
    parse_day_of_week, parse_time_of_day, validate_text_length,
)

resources_bp = Blueprint("resources", __name__, url_prefix="/resources")

# DB column-length caps
_NAME_MAX = 255
_COST_DESCRIPTION_MAX = 255
_IMAGE_URL_MAX = 500

# Fields PUT /resources/<id> recognizes as an intentional edit.
_EDITABLE_FIELDS = {
    "name", "resource_type", "description", "eligibility", "cost_description",
    "accessibility_notes", "general_notes", "image_url", "expires_at",
    "locations", "contacts", "hours", "category_ids", "tag_ids",
}


# Haversine helper, co-author Claude
def _haversine_km(lat1, lng1, lat2, lng2):
    """
    Return the great-circle distance in kilometres between two coordinates.

    Formula:
      a = sin^2(delta_lat/2) + cos(lat1)*cos(lat2)*sin^2(delta_lng/2)
      c = 2*atan2(sqrt(a), sqrt(1-a))
      d = R * c          where R = 6371 km (mean Earth radius)

    Used to filter map pins to a caller-supplied radius without a
    spatial DB extension (sandboxv2 has no PostGIS / ST_Distance).
    Accuracy is sufficient for city-scale radius queries (< 0.5% error
    within 100 km).
    """
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# D3 helper: parse repeated query params into a validated int list.
def _parse_id_list(param_name):
    """
    Read every occurrence of `param_name` from the query string and parse
    """
    raw_values = request.args.getlist(param_name)
    if not raw_values:
        return [], None

    ids = []
    for raw in raw_values:
        try:
            ids.append(int(raw))
        except (TypeError, ValueError):
            return None, err(f"Invalid {param_name} value: '{raw}'. Must be an integer.", 400)
    return ids, None


# Single shared query builder for GET /resources and GET /resources/map.
def build_public_resource_query(category_ids=None, tag_ids=None, resource_type=None, search=None):
    """
    Base query for publicly-visible resources with optional filters.
    """
    from app.models import Resource, ResourceVersion, ResourceVersionCategory, ResourceVersionTag

    query = (
        Resource.query
        .join(ResourceVersion,
              Resource.current_approved_version_id == ResourceVersion.resource_version_id)
        .filter(
            Resource.deleted_at.is_(None),
            Resource.is_active == 1,
            ResourceVersion.moderation_status == "approved",
        )
    )

    needs_distinct = False

    if category_ids:
        query = (
            query.join(ResourceVersionCategory,
                       ResourceVersionCategory.resource_version_id == Resource.current_approved_version_id)
                 .filter(ResourceVersionCategory.category_id.in_(category_ids))
        )
        needs_distinct = True

    if tag_ids:
        query = (
            query.join(ResourceVersionTag,
                       ResourceVersionTag.resource_version_id == Resource.current_approved_version_id)
                 .filter(ResourceVersionTag.tag_id.in_(tag_ids))
        )
        needs_distinct = True

    if resource_type:
        query = query.filter(ResourceVersion.resource_type == resource_type)

    if search:
        query = query.filter(ResourceVersion.name.ilike(f"%{search}%"))

    if needs_distinct:
        query = query.distinct()

    return query


# GET /resources/map
@resources_bp.route("/map", methods=["GET"])
def get_map_pins():
    """
    Return lightweight map pin payloads within a given radius.

    Query params:
      lat, lng: float, required, centre coordinates
      radius_km: float, optional, search radius in km (default 10, max 50)
      category_id, tag_id: repeatable, same multi-select semantics as
        GET /resources
      resource_type, search: same as GET /resources

    Filters applied before Haversine (DB-side, via build_public_resource_query):
      - Resource.deleted_at IS NULL
      - Resource.is_active = 1
      - ResourceVersion.moderation_status = 'approved'
    """
    # Parse and validate required params
    try:
        centre_lat = float(request.args["lat"])
        centre_lng = float(request.args["lng"])
    except (KeyError, ValueError):
        return err("Query params 'lat' and 'lng' are required and must be numeric.", 400)

    try:
        radius_km = float(request.args.get("radius_km", 10))
        if radius_km <= 0:
            raise ValueError
    except ValueError:
        return err("radius_km must be a positive number.", 400)
    radius_km = min(radius_km, 50)

    category_ids, error = _parse_id_list("category_id")
    if error:
        return error
    tag_ids, error = _parse_id_list("tag_id")
    if error:
        return error
    resource_type = request.args.get("resource_type")
    search = request.args.get("search", "").strip()

    resources = build_public_resource_query(category_ids, tag_ids, resource_type, search).all()

    pins = []
    for resource in resources:
        version = resource.current_version
        if not version:
            continue

        location = version.primary_location
        if not location or location.lat is None or location.lng is None:
            continue

        dist = _haversine_km(centre_lat, centre_lng, float(location.lat), float(location.lng))
        if dist > radius_km:
            continue

        # Primary category for map legend colour/icon
        category = version.primary_category

        pins.append({
            "resource_id": resource.resource_id,
            "slug": resource.slug,
            "name": version.name,
            "resource_type": version.resource_type,
            "lat": float(location.lat),
            "lng": float(location.lng),
            "is_virtual": bool(location.is_virtual),
            "category_name": category.name if category else None,
            "color_hex": category.color_hex if category else None,
            "icon_identifier": category.icon_identifier if category else None,
            "distance_km": round(dist, 3),
        })

    # Sort nearest-first
    pins.sort(key=lambda p: p["distance_km"])

    return ok({"pins": pins, "count": len(pins)}, f"{len(pins)} resource(s) found.", 200)


# GET /resources
@resources_bp.route("", methods=["GET"])
def list_resources():
    """
    Paginated, filterable list of published resources.
    Powers the browse/search pages and category/tag filters.

    Query params (all optional):
      category_id - int, repeatable  - OR within this filter type (D3)
      tag_id      - int, repeatable  - OR within this filter type (D3)
      resource_type - str - e.g. "Service", "Organization"
      search - str - LIKE match on resource name
      page - int - default 1
      per_page - int - default 20, max 100
    """
    category_ids, error = _parse_id_list("category_id")
    if error:
        return error
    tag_ids, error = _parse_id_list("tag_id")
    if error:
        return error
    resource_type = request.args.get("resource_type")
    search = request.args.get("search", "").strip()

    query = build_public_resource_query(category_ids, tag_ids, resource_type, search)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    result = paginate(query, page, per_page)

    return ok(
        {
            "resources": [r.to_dict_summary() for r in result["items"]],
            "pagination": result["meta"],
        },
        "Resources retrieved.",
        200,
    )


# GET /resources/<resource_id>
@resources_bp.route("/<int:resource_id>", methods=["GET"])
def get_resource_by_id(resource_id):
    """
    Return full resource detail by numeric ID.
    """
    from app.models import Resource, ResourceVersion

    resource = Resource.query.filter_by(
        resource_id=resource_id,
        is_active=1,
    ).filter(Resource.deleted_at.is_(None)).first()

    if not resource or not resource.current_approved_version_id:
        return err("Resource not found.", 404)

    version = ResourceVersion.query.get(resource.current_approved_version_id)
    if not version:
        return err("Resource version not found.", 404)

    return ok(
        {
            "resource_id": resource.resource_id,
            "slug": resource.slug,
            "version": version.to_dict_full(),
        },
        "Resource retrieved.",
    )


# GET /resources/slug/<slug>
@resources_bp.route("/slug/<string:slug>", methods=["GET"])
def get_resource_by_slug(slug):
    """
    Full resource detail by URL slug.

    Returns the current approved ResourceVersion with all child records:
    locations, contacts, hours, categories, tags.
    """
    from app.models import Resource

    resource = Resource.query.filter_by(slug=slug, is_active=1).first()

    if not resource or resource.deleted_at or not resource.current_version:
        return err("Resource not found.", 404)

    return ok(
        {
            "resource_id": resource.resource_id,
            "slug": resource.slug,
            "version": resource.current_version.to_dict_full(),
        },
        "Resource retrieved.",
        200,
    )


# Shared child-record builders
def _build_location_records(version_id, locations_data):
    from app.models import ResourceLocation
    return [
        ResourceLocation(
            resource_version_id=version_id,
            location_name=loc.get("location_name"),
            address_line1=loc.get("address_line1"),
            address_line2=loc.get("address_line2"),
            city=loc.get("city", "Ottawa"),
            province=loc.get("province", "Ontario"),
            postal_code=loc.get("postal_code"),
            country=loc.get("country", "Canada"),
            lat=loc.get("lat"),
            lng=loc.get("lng"),
            is_primary=loc.get("is_primary", 1),
            is_virtual=loc.get("is_virtual", 0),
            service_area_notes=loc.get("service_area_notes"),
        )
        for loc in (locations_data or [])
    ]


def _build_contact_records(version_id, contacts_data):
    from app.models import ResourceContact
    return [
        ResourceContact(
            resource_version_id=version_id,
            contact_type=contact.get("contact_type"),
            contact_value=contact.get("contact_value"),
            contact_label=contact.get("contact_label"),
            is_primary=contact.get("is_primary", 0),
        )
        for contact in (contacts_data or [])
    ]


def _build_hour_records(version_id, hours_data):
    """
    Build ResourceHour rows, centralizing day-of-week parsing and time-of-day parsing/validation.
    """
    from app.models import ResourceHour

    records = []
    for hour in (hours_data or []):
        day_int = parse_day_of_week(hour.get("day_of_week"))
        if day_int is None:
            return None, err(
                f"Invalid day_of_week: {hour.get('day_of_week')!r}. "
                "Use an integer 0-6 (0=Sunday) or a weekday name.",
                422,
            )

        opens_at, opens_error = parse_time_of_day(hour.get("opens_at"))
        if opens_error:
            return None, err(f"opens_at: {opens_error}", 422)
        closes_at, closes_error = parse_time_of_day(hour.get("closes_at"))
        if closes_error:
            return None, err(f"closes_at: {closes_error}", 422)

        records.append(ResourceHour(
            resource_version_id=version_id,
            day_of_week=day_int,
            opens_at=opens_at,
            closes_at=closes_at,
            is_closed=1 if hour.get("is_closed") else 0,
            by_appointment_only=1 if hour.get("by_appointment_only") else 0,
            notes=hour.get("notes"),
        ))
    return records, None


def _build_category_tag_records(version_id, category_ids, tag_ids):
    from app.models import ResourceVersionCategory, ResourceVersionTag

    category_ids = category_ids or []
    first_category_id = category_ids[0] if category_ids else None

    category_records = [
        ResourceVersionCategory(
            resource_version_id=version_id,
            category_id=cat_id,
            is_primary=1 if cat_id == first_category_id else 0,
        )
        for cat_id in category_ids
    ]
    tag_records = [
        ResourceVersionTag(resource_version_id=version_id, tag_id=tag_id)
        for tag_id in (tag_ids or [])
    ]
    return category_records, tag_records


def _validate_version_text_fields(data):
    """Length-cap the free-text fields against their DB column sizes (S6-adjacent hardening)."""
    errors = {}
    validate_text_length(data.get("name"), "name", _NAME_MAX, errors)
    validate_text_length(data.get("cost_description"), "cost_description", _COST_DESCRIPTION_MAX, errors)
    validate_text_length(data.get("image_url"), "image_url", _IMAGE_URL_MAX, errors)
    return errors


# POST /resources  (staff_editor+)
@resources_bp.route("", methods=["POST"])
@require_roles("staff_editor", "administrator")
def create_resource():
    """
    Staff-only: create a new resource + an approved ResourceVersion directly.

    Bypasses the submission queue. The version is immediately 'approved'
    and current_approved_version_id is set on creation.

    Body (JSON) - required fields:
      name, resource_type

    Optional fields (all ResourceVersion columns):
      description, eligibility, cost_description, accessibility_notes,
      general_notes, image_url, expires_at

    Optional nested arrays:
      locations[]  - { address_line1, city, lat, lng, is_primary, ... }
      contacts[]   - { contact_type, contact_value, contact_label, is_primary }
      hours[]      - { day_of_week, opens_at, closes_at, is_closed, ... }
      category_ids[] - [int, ...]
      tag_ids[]      - [int, ...]
    """
    from app.models import Resource, ResourceVersion, ResourceChangeLog
    from flask_jwt_extended import get_jwt_identity

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    name = (data.get("name") or "").strip()
    resource_type = (data.get("resource_type") or "").strip()

    if not name:
        return err("Field 'name' is required.", 422, {"name": "Required."})
    if not resource_type:
        return err("Field 'resource_type' is required.", 422, {"resource_type": "Required."})

    text_errors = _validate_version_text_fields(data)
    if text_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, text_errors)

    # Validate hours before touching the session (no partial writes to roll back).
    hour_records, hour_error = _build_hour_records(None, data.get("hours"))
    if hour_error:
        return hour_error

    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)
    slug = generate_unique_slug(name)

    # 1. Resource shell
    resource = Resource(  # type: ignore[call-arg]
        slug=slug,
        is_active=1,
        created_by_user_id=user_id,
        created_at=now,
        updated_at=now,
    )
    db.session.add(resource)
    db.session.flush()  # assigns resource_id without committing

    # 2. Approved ResourceVersion
    version = ResourceVersion(  # type: ignore[call-arg]
        resource_id=resource.resource_id,
        resource_type=resource_type,
        moderation_status="approved",
        name=name,
        description=data.get("description"),
        eligibility=data.get("eligibility"),
        cost_description=data.get("cost_description"),
        accessibility_notes=data.get("accessibility_notes"),
        general_notes=data.get("general_notes"),
        image_url=data.get("image_url"),
        submitted_by_user_id=user_id,
        submitted_at=now,
        reviewed_by_user_id=user_id,
        reviewed_at=now,
        approved_at=now,
        expires_at=data.get("expires_at"),
    )
    db.session.add(version)
    db.session.flush()  # assigns resource_version_id

    # 3-7. Child records (shared builders, see _build_*_records above)
    for hr in hour_records: # type: ignore
        hr.resource_version_id = version.resource_version_id
    category_records, tag_records = _build_category_tag_records(
        version.resource_version_id, data.get("category_ids"), data.get("tag_ids")
    )
    db.session.add_all(_build_location_records(version.resource_version_id, data.get("locations")))
    db.session.add_all(_build_contact_records(version.resource_version_id, data.get("contacts")))
    db.session.add_all(hour_records) # type: ignore
    db.session.add_all(category_records)
    db.session.add_all(tag_records)

    # 8. Point the shell at the new version
    resource.current_approved_version_id = version.resource_version_id

    # 9. Audit log
    db.session.add(ResourceChangeLog(  # type: ignore[call-arg]
        resource_id=resource.resource_id,
        changed_by_user_id=user_id,
        change_type="created",
        change_summary=f"Resource '{name}' created directly by staff.",
        changed_at=now,
    ))

    db.session.commit()

    return ok(
        {"resource_id": resource.resource_id, "slug": resource.slug},
        "Resource created.",
        201,
    )


# PUT /resources/<int:resource_id>  (staff_editor+, moderator per project plan)
@resources_bp.route("/<int:resource_id>", methods=["PUT"])
@require_roles("staff_editor", "moderator", "administrator")
def update_resource(resource_id):
    """
    Staff-only: update a resource by creating a new approved ResourceVersion.

    NEVER mutates the existing ResourceVersion. Instead:
      1. Creates a new ResourceVersion (status = 'approved').
      2. Repoints Resource.current_approved_version_id to the new version.
      3. Old version remains in DB as audit trail.

    Body: same optional fields as POST /resources (name, description, etc.)
    At least one recognized editable field must be provided (confirmed
    correctness fix, see _EDITABLE_FIELDS above), or this returns 422
    instead of silently creating a no-op duplicate version.
    """
    from app.models import Resource, ResourceChangeLog, ResourceVersion
    from flask_jwt_extended import get_jwt_identity

    resource = Resource.query.get(resource_id)
    if not resource or resource.deleted_at:
        return err("Resource not found.", 404)

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    if not (set(data.keys()) & _EDITABLE_FIELDS):
        return err(
            "At least one editable field must be provided.",
            422,
            {"_body": f"Recognized fields: {sorted(_EDITABLE_FIELDS)}"},
        )

    text_errors = _validate_version_text_fields(data)
    if text_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, text_errors)

    hour_records, hour_error = _build_hour_records(None, data.get("hours"))
    if hour_error:
        return hour_error

    user_id = int(get_jwt_identity())
    now = datetime.now(timezone.utc)

    # Inherit unchanged fields from the current approved version
    prev = resource.current_version

    new_name = data.get("name", prev.name if prev else "").strip()
    if not new_name:
        return err("Field 'name' cannot be empty.", 422)

    # Update slug only if name changed
    if prev and new_name != prev.name:
        resource.slug = generate_unique_slug(new_name)

    # New approved version
    version = ResourceVersion(  # type: ignore[call-arg]
        resource_id=resource.resource_id,
        resource_type=data.get("resource_type", prev.resource_type if prev else "Organization"),
        moderation_status="approved",
        name=new_name,
        description=data.get("description", prev.description if prev else None),
        eligibility=data.get("eligibility", prev.eligibility if prev else None),
        cost_description=data.get("cost_description", prev.cost_description if prev else None),
        accessibility_notes=data.get("accessibility_notes", prev.accessibility_notes if prev else None),
        general_notes=data.get("general_notes", prev.general_notes if prev else None),
        image_url=data.get("image_url", prev.image_url if prev else None),
        submitted_by_user_id=user_id,
        submitted_at=now,
        reviewed_by_user_id=user_id,
        reviewed_at=now,
        approved_at=now,
    )
    db.session.add(version)
    db.session.flush()

    # Child records - only written if provided in body (shared builders)
    for hr in hour_records: # type: ignore
        hr.resource_version_id = version.resource_version_id
    category_records, tag_records = _build_category_tag_records(
        version.resource_version_id, data.get("category_ids"), data.get("tag_ids")
    )
    db.session.add_all(_build_location_records(version.resource_version_id, data.get("locations")))
    db.session.add_all(_build_contact_records(version.resource_version_id, data.get("contacts")))
    db.session.add_all(hour_records) # type: ignore
    db.session.add_all(category_records)
    db.session.add_all(tag_records)

    # Repoint the shell
    resource.current_approved_version_id = version.resource_version_id
    resource.updated_at = now

    db.session.add(ResourceChangeLog(  # type: ignore[call-arg]
        resource_id=resource.resource_id,
        changed_by_user_id=user_id,
        change_type="updated",
        change_summary="New version created by staff. Previous version ID retained as audit trail.",
        changed_at=now,
    ))

    db.session.commit()

    return ok(
        {
            "resource_id": resource.resource_id,
            "slug": resource.slug,
            "new_version_id": version.resource_version_id,
        },
        "Resource updated. New version created.",
        200,
    )


# DELETE /resources/<int:resource_id> (administrator only)
@resources_bp.route("/<int:resource_id>", methods=["DELETE"])
@require_roles("administrator")
def delete_resource(resource_id):
    """
    Soft-delete a resource by setting deleted_at.

    The Resource row, all ResourceVersions, and all child records remain
    in the DB. deleted_at is the only change - the record is invisible to
    all public endpoints but retrievable for audit purposes.

    404 if already deleted.
    """
    from app.models import Resource, ResourceChangeLog
    from flask_jwt_extended import get_jwt_identity

    resource = Resource.query.get(resource_id)
    if not resource or resource.deleted_at:
        return err("Resource not found.", 404)

    now = datetime.now(timezone.utc)
    resource.deleted_at = now
    resource.is_active = 0
    resource.updated_at = now
    user_id = int(get_jwt_identity())

    db.session.add(ResourceChangeLog(  # type: ignore[call-arg]
        resource_id=resource.resource_id,
        changed_by_user_id=user_id,
        change_type="deleted",
        change_summary="Resource soft-deleted by administrator.",
        changed_at=now,
    ))

    db.session.commit()
    return ok(None, "Resource deleted.", 200)
