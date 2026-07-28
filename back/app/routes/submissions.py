# app/routes/submissions.py
# pyright: reportCallIssue=false

import hashlib
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import (
    Resource,
    ResourceChangeLog,
    ResourceContact,
    ResourceHour,
    ResourceLocation,
    ResourceVersion,
    ResourceVersionCategory,
    ResourceVersionTag,
    Submission,
    SubmissionReview,
)
from app.utils import (
    check_and_increment_rate_limit, err, ok, paginate, require_roles,
    parse_day_of_week, parse_time_of_day, validate_text_length,
)

submissions_bp = Blueprint("submissions", __name__, url_prefix="/submissions")

# DELETE /submissions/dev/flushratelimits has been REMOVED from the HTTP
# API entirely,  it had no authentication guard, so anyone could wipe every
# rate-limit counter with one unauthenticated request. The same operation is
# now only reachable from a trusted shell:
#   flask --app wsgi flush-rate-limits
# See app/__init__.py -> _register_cli(). Do not re-add this as a route.

_VALID_SUBMISSION_TYPES = {"new_resource", "update_resource", "community_asset"}
_NAME_MAX = 255
_COST_DESCRIPTION_MAX = 255
_IMAGE_URL_MAX = 500


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


# POST /submissions: public, rate-limited for anonymous callers
@submissions_bp.post("")
@jwt_required(optional=True)
def create_submission():
    """
    Flow A  (new_resource / community_asset):
        Resource shell (is_active=0) + ResourceVersion (pending_review) + Submission.
        Nothing is published until a moderator approves.

    Flow B  (update_resource):
        Requires resource_id. New ResourceVersion on existing Resource + Submission.
        Existing approved version stays live until moderator approves.
    """
    data = request.get_json(silent=True) or {}
    current_user_id = get_jwt_identity()  # None when no JWT present

    # Rate-limit anonymous callers. request.remote_addr is the real client
    # IP as long as TRUSTED_PROXY_COUNT is configured correctly for the
    # deployment (see app/__init__.py's ProxyFix setup),  this route no
    # longer parses X-Forwarded-For itself.
    if current_user_id is None:
        ip = request.remote_addr or "unknown"
        ip_hash = _hash_ip(ip)
        if not check_and_increment_rate_limit(ip_hash):
            return err("Rate limit exceeded. Please wait before submitting again.", 429)

    # Validate submission_type
    submission_type = data.get("submission_type")
    if submission_type not in _VALID_SUBMISSION_TYPES:
        db.session.rollback()  # discard the flushed-but-uncommitted rate-limit increment
        return err(
            f"submission_type must be one of: {sorted(_VALID_SUBMISSION_TYPES)}.", 400
        )

    # Required content field
    name = (data.get("name") or "").strip()
    if not name:
        db.session.rollback()
        return err("name is required.", 400)

    resource_type = (data.get("resource_type") or "Organization").strip()

    field_errors = {}
    validate_text_length(name, "name", _NAME_MAX, field_errors)
    validate_text_length(data.get("cost_description"), "cost_description", _COST_DESCRIPTION_MAX, field_errors)
    validate_text_length(data.get("image_url"), "image_url", _IMAGE_URL_MAX, field_errors)
    if field_errors:
        db.session.rollback()
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    # Pre-validate hours (centralized day-of-week parsing,  confirmed
    # correctness fix; previously this route only accepted lowercase weekday
    # *names* while routes/resources.py accepted anything unvalidated. Both
    # now go through app.utils.parse_day_of_week and accept an int 0-6 or a
    # weekday name, so the two paths can't silently diverge again.)
    hours_payload = []
    for h in data.get("hours") or []:
        day_int = parse_day_of_week(h.get("day_of_week"))
        if day_int is None:
            db.session.rollback()
            return err(
                f"Invalid day_of_week: {h.get('day_of_week')!r}. "
                "Use an integer 0-6 (0=Sunday) or a weekday name.",
                400,
            )
        opens_at, opens_error = parse_time_of_day(h.get("open_time"))
        if opens_error:
            db.session.rollback()
            return err(f"open_time: {opens_error}", 400)
        closes_at, closes_error = parse_time_of_day(h.get("close_time"))
        if closes_error:
            db.session.rollback()
            return err(f"close_time: {closes_error}", 400)
        hours_payload.append((day_int, opens_at, closes_at, h))

    #  Flow B: resolve and validate the target resource
    resource = None
    if submission_type == "update_resource":
        resource_id = data.get("resource_id")
        if not resource_id:
            db.session.rollback()
            return err("resource_id is required for submission_type 'update_resource'.", 400)
        resource = Resource.query.filter_by(
            resource_id=resource_id, deleted_at=None
        ).first()
        if not resource:
            db.session.rollback()
            return err("Resource not found.", 404)

    try:
        #  Flow A: create the Resource shell
        if submission_type in ("new_resource", "community_asset"):
            from app.utils import generate_unique_slug
            slug = generate_unique_slug(name)
            resource = Resource(
                slug=slug,
                is_active=0,  # stays inactive until approved
                created_by_user_id=current_user_id,
                current_approved_version_id=None,
            )
            db.session.add(resource)
            db.session.flush()  # get resource_id before FK use

        #  Create ResourceVersion (pending_review)
        version = ResourceVersion(
            resource_id=resource.resource_id,  # type: ignore
            resource_type=resource_type,
            moderation_status="pending_review",
            name=name,
            description=data.get("description"),
            eligibility=data.get("eligibility"),
            cost_description=data.get("cost_description"),
            accessibility_notes=data.get("accessibility_notes"),
            general_notes=data.get("general_notes"),
            image_url=data.get("image_url"),
            submitted_by_user_id=current_user_id,
        )
        db.session.add(version)
        db.session.flush()  # get resource_version_id

        vid = version.resource_version_id

        #  Locations
        for loc in data.get("locations") or []:
            db.session.add(ResourceLocation(
                resource_version_id=vid,
                address_line1=loc.get("address"),
                city=loc.get("city", "Ottawa"),
                province=loc.get("province", "Ontario"),
                postal_code=loc.get("postal_code"),
                lat=loc.get("lat"),
                lng=loc.get("lng"),
            ))

        #  Contacts
        for contact in data.get("contacts") or []:
            db.session.add(ResourceContact(
                resource_version_id=vid,
                contact_type=contact.get("contact_type", "phone"),
                contact_value=contact.get("value", ""),
                contact_label=contact.get("label"),
            ))

        #  Hours (already validated above)
        for day_int, opens_at, closes_at, h in hours_payload:
            db.session.add(ResourceHour(
                resource_version_id=vid,
                day_of_week=day_int,
                opens_at=opens_at,
                closes_at=closes_at,
                is_closed=1 if h.get("is_closed") else 0,
                by_appointment_only=1 if h.get("by_appointment_only") else 0,
                notes=h.get("notes"),
            ))

        #  Category associations
        raw_category_ids = data.get("category_ids", [])
        if isinstance(raw_category_ids, int):
            raw_category_ids = [raw_category_ids]
        elif not isinstance(raw_category_ids, list):
            raw_category_ids = []
        for cat_id in raw_category_ids:
            db.session.add(ResourceVersionCategory(
                resource_version_id=vid,
                category_id=cat_id,
            ))

        #  Tag associations
        raw_tag_ids = data.get("tag_ids", [])
        if isinstance(raw_tag_ids, int):
            raw_tag_ids = [raw_tag_ids]
        elif not isinstance(raw_tag_ids, list):
            raw_tag_ids = []
        for tag_id in raw_tag_ids:
            db.session.add(ResourceVersionTag(
                resource_version_id=vid,
                tag_id=tag_id,
            ))

        #  Submission row
        submission = Submission(
            submission_type=submission_type,
            resource_id=resource.resource_id,  # type: ignore
            proposed_version_id=vid,
            submitted_by_user_id=current_user_id,
            submitter_name=data.get("submitter_name"),
            submitter_email=data.get("submitter_email"),
            submitter_phone=data.get("submitter_phone"),
            submission_message=data.get("submission_message"),
            moderation_status="pending_review",
        )
        db.session.add(submission)
        # Single commit: rate-limit increment (if any) + resource/version/
        # child rows + submission row, all atomic (confirmed correctness fix).
        db.session.commit()

    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to create submission: {str(exc)}", 500)

    return ok(
        {
            "submission_id": submission.submission_id,
            "resource_id": resource.resource_id,  # type: ignore
            "proposed_version_id": vid,
        },
        "Submission created successfully.",
        201,
    )


# GET /submissions: moderator+: moderation queue
@submissions_bp.get("")
@require_roles("moderator", "administrator")
def list_submissions():
    """
    Query params:
        status: moderation_status filter (default: pending_review)
        submission_type: optional type filter
        page, limit : pagination via paginate()
    """
    status_filter = request.args.get("status", "pending_review")
    type_filter = request.args.get("submission_type")
    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, int(request.args.get("limit", 20)))

    query = Submission.query.filter_by(moderation_status=status_filter)
    if type_filter in _VALID_SUBMISSION_TYPES:
        query = query.filter_by(submission_type=type_filter)
    query = query.order_by(Submission.created_at.asc())

    result = paginate(query, page, limit)
    # Use the model's own serializer: avoids duplicating field logic here
    result["items"] = [s.to_dict_summary() for s in result["items"]]
    return ok(result, "Submissions retrieved.")


# GET /submissions/<id>: moderator+: single submission detail
@submissions_bp.get("/<int:submission_id>")
@require_roles("moderator", "administrator")
def get_submission(submission_id):
    sub = Submission.query.get(submission_id)
    if not sub:
        return err("Submission not found.", 404)

    payload = sub.to_dict_full()

    current_approved_resource = None
    if sub.submission_type == "update_resource" and sub.resource_id:
        resource = Resource.query.get(sub.resource_id)
        if resource and resource.current_version:
            current_approved_resource = {
                "resource_id": resource.resource_id,
                "slug": resource.slug,
                "version": resource.current_version.to_dict_full(),
            }
    payload["current_approved_resource"] = current_approved_resource

    return ok(payload, "Submission retrieved.")


# POST /submissions/<id>/review: moderator+: approve or reject
@submissions_bp.post("/<int:submission_id>/review")
@require_roles("moderator", "administrator")
def review_submission(submission_id):
    """
    Most critical block in the backend: touches 5 tables in one transaction.
    Single db.session.commit() at the end; rollback on any failure.

    APPROVE:
      1. ResourceVersion.moderation_status -> "approved"  + approved_at set
      2. Resource.current_approved_version_id -> this version's id
      3. Resource.is_active -> 1 (new_resource / community_asset only)
      4. Submission.moderation_status -> "approved"
      5. INSERT SubmissionReview(moderation_status = "approved")
      6. INSERT ResourceChangeLog  (change_type = "approved_submission")

    REJECT:
      1. ResourceVersion.moderation_status  -> "rejected"
      2. Submission.moderation_status -> "rejected"
      3. INSERT SubmissionReview (moderation_status = "rejected")
      Resource.current_approved_version_id is NOT touched on reject.
    """
    data = request.get_json(silent=True) or {}
    reviewer_id = get_jwt_identity()

    decision = (data.get("decision") or "").lower()
    if decision not in ("approved", "rejected"):
        return err("decision must be 'approved' or 'rejected'.", 400)

    sub = Submission.query.get(submission_id)
    if not sub:
        return err("Submission not found.", 404)

    if sub.moderation_status != "pending_review":
        return err("Submission has already been reviewed.", 422)

    version = ResourceVersion.query.get(sub.proposed_version_id)
    if not version:
        return err("Proposed resource version not found.", 422)

    resource = Resource.query.get(sub.resource_id)
    if not resource:
        return err("Associated resource not found.", 422)

    now = datetime.now(timezone.utc)
    review_comment = data.get("notes") or data.get("review_comment")

    try:
        if decision == "approved":
            # Step 1: approve the version
            version.moderation_status = "approved"
            version.approved_at = now
            version.reviewed_by_user_id = reviewer_id
            version.reviewed_at = now
            version.review_comment = review_comment

            # Step 2: repoint current_approved_version_id
            resource.current_approved_version_id = version.resource_version_id

            # Step 3: publish resource shell (new_resource and community_asset only)
            if sub.submission_type in ("new_resource", "community_asset"):
                resource.is_active = 1

            # Step 4: approve the submission
            sub.moderation_status = "approved"
            sub.updated_at = now

        else:  # rejected
            # Resource and current_approved_version_id are NOT touched
            version.moderation_status = "rejected"
            version.reviewed_by_user_id = reviewer_id
            version.reviewed_at = now
            version.review_comment = review_comment

            sub.moderation_status = "rejected"
            sub.updated_at = now

        # Step 5: append SubmissionReview (both approve and reject paths)
        review = SubmissionReview(
            submission_id=submission_id,
            reviewed_by_user_id=reviewer_id,
            moderation_status=decision,  # "approved" | "rejected"
            review_comment=review_comment,
            reviewed_at=now,
        )
        db.session.add(review)

        # Step 6: append ResourceChangeLog (approve path only)
        if decision == "approved":
            log_entry = ResourceChangeLog(
                resource_id=resource.resource_id,
                changed_by_user_id=reviewer_id,
                change_type="approved_submission",
                change_summary=(
                    f"Submission #{submission_id} approved. "
                    f"Version #{version.resource_version_id} set as current."
                ),
                submission_id=submission_id,
                changed_at=now,
            )
            db.session.add(log_entry)

        # Single commit: all-or-nothing across all 5 tables
        db.session.commit()

    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to process review: {str(exc)}", 500)

    return ok(
        {
            "submission_id": submission_id,
            "decision": decision,
            "resource_id": resource.resource_id,
            "proposed_version_id": version.resource_version_id,
        },
        f"Submission {decision} successfully.",
    )
