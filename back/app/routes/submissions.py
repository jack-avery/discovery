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
    SkillsFollowUp,
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


def _validate_hours_payload(hours_list):
    """
    Pre-validates an `hours` array the same way create_submission always
    has. Returns (hours_payload, error_response). error_response is None on
    success; on failure hours_payload is None and error_response is a ready
    -to-return Flask response from err().
    """
    hours_payload = []
    for h in hours_list or []:
        day_int = parse_day_of_week(h.get("day_of_week"))
        if day_int is None:
            return None, err(
                f"Invalid day_of_week: {h.get('day_of_week')!r}. "
                "Use an integer 0-6 (0=Sunday) or a weekday name.",
                400,
            )
        opens_at, opens_error = parse_time_of_day(h.get("open_time"))
        if opens_error:
            return None, err(f"open_time: {opens_error}", 400)
        closes_at, closes_error = parse_time_of_day(h.get("close_time"))
        if closes_error:
            return None, err(f"close_time: {closes_error}", 400)
        hours_payload.append((day_int, opens_at, closes_at, h))
    return hours_payload, None


def _add_version_child_records(vid, data, hours_payload):
    """
    Locations, contacts, hours, category/tag associations for resource_version
    id `vid`, from a payload shaped like create_submission's request body
    (or requirement 3's `approved_version` object, which uses the identical
    shape). Shared by create_submission() and review_submission() so the two
    write paths can't silently diverge on field names.
    """
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

    for contact in data.get("contacts") or []:
        db.session.add(ResourceContact(
            resource_version_id=vid,
            contact_type=contact.get("contact_type", "phone"),
            contact_value=contact.get("value", ""),
            contact_label=contact.get("label"),
        ))

    for day_int, opens_at, closes_at, h in (hours_payload or []):
        db.session.add(ResourceHour(
            resource_version_id=vid,
            day_of_week=day_int,
            opens_at=opens_at,
            closes_at=closes_at,
            is_closed=1 if h.get("is_closed") else 0,
            by_appointment_only=1 if h.get("by_appointment_only") else 0,
            notes=h.get("notes"),
        ))

    raw_category_ids = data.get("category_ids", [])
    if isinstance(raw_category_ids, int):
        raw_category_ids = [raw_category_ids]
    elif not isinstance(raw_category_ids, list):
        raw_category_ids = []
    for cat_id in raw_category_ids:
        db.session.add(ResourceVersionCategory(resource_version_id=vid, category_id=cat_id))

    raw_tag_ids = data.get("tag_ids", [])
    if isinstance(raw_tag_ids, int):
        raw_tag_ids = [raw_tag_ids]
    elif not isinstance(raw_tag_ids, list):
        raw_tag_ids = []
    for tag_id in raw_tag_ids:
        db.session.add(ResourceVersionTag(resource_version_id=vid, tag_id=tag_id))


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
    hours_payload, hours_err_resp = _validate_hours_payload(data.get("hours"))
    if hours_err_resp:
        db.session.rollback()
        return hours_err_resp

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

        #  Locations, contacts, hours, category/tag associations
        _add_version_child_records(vid, data, hours_payload)

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
@require_roles("moderator")
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
@require_roles("moderator")
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


# POST /submissions/<id>/review: moderator+: approve, reject, or (Skills
# only) accept for follow-up
_ALLOWED_DECISIONS = ("approved", "rejected", "accepted_for_follow_up")


@submissions_bp.post("/<int:submission_id>/review")
@require_roles("moderator")
def review_submission(submission_id):
    """
    Review a submission and set its moderation_status. The reviewer's
    decision determines the actions taken.
    """
    data = request.get_json(silent=True) or {}
    reviewer_id = get_jwt_identity()

    decision = (data.get("decision") or "").lower()
    if decision not in _ALLOWED_DECISIONS:
        return err(f"decision must be one of: {list(_ALLOWED_DECISIONS)}.", 400)

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

    # Requirement 4: Skills submissions cannot be published directly, and
    # accepted_for_follow_up doesn't make sense for anything else.
    if decision == "approved" and sub.submission_type == "community_asset":
        return err(
            "Skills submissions cannot be approved directly. Use decision "
            "'accepted_for_follow_up' to route it to the follow-up "
            "workflow, or 'rejected'.",
            422,
        )
    if decision == "accepted_for_follow_up" and sub.submission_type != "community_asset":
        return err(
            "decision 'accepted_for_follow_up' is only valid for Skills "
            "(community_asset) submissions.",
            422,
        )

    review_comment = data.get("notes") or data.get("review_comment")
    approved_version_payload = data.get("approved_version") if decision == "approved" else None
    included_reviewer_edits = bool(approved_version_payload)

    # Pre-validate the reviewer-edited version, if any, before any DB
    # writes -- same convention as create_submission().
    new_version_hours_payload = None
    if approved_version_payload:
        new_name = (approved_version_payload.get("name") or "").strip()
        if not new_name:
            return err("approved_version.name is required.", 422)

        field_errors = {}
        validate_text_length(new_name, "name", _NAME_MAX, field_errors)
        validate_text_length(
            approved_version_payload.get("cost_description"), "cost_description",
            _COST_DESCRIPTION_MAX, field_errors,
        )
        validate_text_length(
            approved_version_payload.get("image_url"), "image_url",
            _IMAGE_URL_MAX, field_errors,
        )
        if field_errors:
            return err(
                "One or more approved_version fields exceed the maximum allowed length.",
                422, field_errors,
            )

        new_version_hours_payload, hours_err_resp = _validate_hours_payload(
            approved_version_payload.get("hours")
        )
        if hours_err_resp:
            return hours_err_resp

    now = datetime.now(timezone.utc)
    published_version_id = None

    try:
        if decision == "approved":
            if approved_version_payload:
                new_version = ResourceVersion(
                    resource_id=resource.resource_id,
                    resource_type=(approved_version_payload.get("resource_type") or version.resource_type),
                    moderation_status="approved",
                    name=(approved_version_payload.get("name") or "").strip(),
                    description=approved_version_payload.get("description"),
                    eligibility=approved_version_payload.get("eligibility"),
                    cost_description=approved_version_payload.get("cost_description"),
                    accessibility_notes=approved_version_payload.get("accessibility_notes"),
                    general_notes=approved_version_payload.get("general_notes"),
                    image_url=approved_version_payload.get("image_url"),
                    submitted_by_user_id=sub.submitted_by_user_id,
                    reviewed_by_user_id=reviewer_id,
                    reviewed_at=now,
                    review_comment=review_comment,
                    approved_at=now,
                )
                db.session.add(new_version)
                db.session.flush()  # get resource_version_id before child rows
                _add_version_child_records(
                    new_version.resource_version_id, approved_version_payload, new_version_hours_payload
                )

                resource.current_approved_version_id = new_version.resource_version_id
                if sub.submission_type == "new_resource":
                    resource.is_active = 1

                version.moderation_status = "approved"
                version.reviewed_by_user_id = reviewer_id
                version.reviewed_at = now
                version.review_comment = review_comment
                version.approved_at = now

                published_version_id = new_version.resource_version_id
            else:
                version.moderation_status = "approved"
                version.approved_at = now
                version.reviewed_by_user_id = reviewer_id
                version.reviewed_at = now
                version.review_comment = review_comment

                resource.current_approved_version_id = version.resource_version_id
                if sub.submission_type == "new_resource":
                    resource.is_active = 1

                published_version_id = version.resource_version_id

            sub.moderation_status = "approved"
            sub.updated_at = now

        elif decision == "accepted_for_follow_up":
            version.moderation_status = "accepted_for_follow_up"
            version.reviewed_by_user_id = reviewer_id
            version.reviewed_at = now
            version.review_comment = review_comment

            sub.moderation_status = "accepted_for_follow_up"
            sub.updated_at = now

            db.session.add(SkillsFollowUp(
                submission_id=submission_id,
                status="accepted",
                accepted_by_user_id=reviewer_id,
                accepted_at=now,
            ))

        else:  # rejected
            # Resource and current_approved_version_id are NOT touched
            version.moderation_status = "rejected"
            version.reviewed_by_user_id = reviewer_id
            version.reviewed_at = now
            version.review_comment = review_comment

            sub.moderation_status = "rejected"
            sub.updated_at = now

        # SubmissionReview: append for every decision.
        review = SubmissionReview(
            submission_id=submission_id,
            reviewed_by_user_id=reviewer_id,
            moderation_status=decision,
            review_comment=review_comment,
            included_reviewer_edits=1 if included_reviewer_edits else 0,
            reviewed_at=now,
        )
        db.session.add(review)

        # ResourceChangeLog: approve path only -- the resource itself
        # doesn't change state on reject or accepted_for_follow_up.
        if decision == "approved":
            summary = f"Submission #{submission_id} approved"
            if included_reviewer_edits:
                summary += (
                    f" with reviewer edits. Version #{published_version_id} set as "
                    f"current (original proposed version #{version.resource_version_id} "
                    "preserved, unpublished)."
                )
            else:
                summary += f". Version #{published_version_id} set as current."
            db.session.add(ResourceChangeLog(
                resource_id=resource.resource_id,
                changed_by_user_id=reviewer_id,
                change_type="approved_submission",
                change_summary=summary,
                submission_id=submission_id,
                changed_at=now,
            ))

        # Single commit: all-or-nothing across every table touched above.
        db.session.commit()

    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to process review: {str(exc)}", 500)

    response_payload = {
        "submission_id": submission_id,
        "decision": decision,
        "resource_id": resource.resource_id,
        "proposed_version_id": version.resource_version_id,
    }
    if decision == "approved":
        response_payload["published_version_id"] = published_version_id
        response_payload["included_reviewer_edits"] = included_reviewer_edits

    return ok(response_payload, f"Submission {decision} successfully.")