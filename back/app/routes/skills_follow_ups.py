# app/routes/skills_follow_ups.py
# pyright: reportCallIssue=false
"""
Skills Follow-up Blueprint  staff-only workflow for Skills
(submission_type="community_asset") submissions accepted via
POST /submissions/<id>/review with decision="accepted_for_follow_up"
(requirement 4, Add a Skills Follow-up Workflow). Moderator+ -- "Manage
Skills follow-ups" is listed as a Moderator capability in the role doc.

The linked Resource never publishes through this workflow; it stays
inactive with no current_approved_version_id for the entire lifecycle
here. Converting a Skill into an actual public listing is explicitly a
separate, normal staff resource-creation action (POST /resources) --
this endpoint only records that it happened, via converted_resource_id.

Routes:
  GET   /skills-follow-ups            - paginated, status-filterable list
  GET   /skills-follow-ups/<int:id>   - full detail incl. original submission
  PATCH /skills-follow-ups/<int:id>   - update status / internal_notes /
                                         converted_resource_id
"""

from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models import Resource, SkillsFollowUp
from app.utils import ok, err, paginate, require_roles, validate_text_length

skills_follow_ups_bp = Blueprint(
    "skills_follow_ups", __name__, url_prefix="/skills-follow-ups"
)

_NOTES_MAX = 5000


# GET /skills-follow-ups
@skills_follow_ups_bp.get("")
@require_roles("moderator")
def list_follow_ups():
    status_filter = request.args.get("status")
    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, int(request.args.get("limit", 20)))

    query = SkillsFollowUp.query
    if status_filter:
        if status_filter not in SkillsFollowUp.STATUSES:
            return err(f"status must be one of: {SkillsFollowUp.STATUSES}.", 400)
        query = query.filter_by(status=status_filter)

    query = query.order_by(SkillsFollowUp.accepted_at.desc())
    result = paginate(query, page, limit)
    result["items"] = [f.to_dict_summary() for f in result["items"]]
    return ok(result, "Skills follow-ups retrieved.")


# GET /skills-follow-ups/<id>
@skills_follow_ups_bp.get("/<int:follow_up_id>")
@require_roles("moderator")
def get_follow_up(follow_up_id):
    f = SkillsFollowUp.query.get(follow_up_id)
    if not f:
        return err("Skills follow-up not found.", 404)
    return ok(f.to_dict_full(), "Skills follow-up retrieved.")


# PATCH /skills-follow-ups/<id>
@skills_follow_ups_bp.patch("/<int:follow_up_id>")
@require_roles("moderator")
def update_follow_up(follow_up_id):
    f = SkillsFollowUp.query.get(follow_up_id)
    if not f:
        return err("Skills follow-up not found.", 404)

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    new_status = data.get("status")
    if new_status is not None and new_status not in SkillsFollowUp.STATUSES:
        return err(f"status must be one of: {SkillsFollowUp.STATUSES}.", 422, {"status": "Invalid status."})

    converted_resource_id = data.get("converted_resource_id", f.converted_resource_id)
    if converted_resource_id is not None:
        if not Resource.query.get(converted_resource_id):
            return err(f"Resource {converted_resource_id} does not exist.", 404)

    if new_status == "converted" and not converted_resource_id:
        return err(
            "converted_resource_id is required when setting status to 'converted'.",
            422, {"converted_resource_id": "Required for status 'converted'."},
        )

    field_errors = {}
    if "internal_notes" in data:
        validate_text_length(data["internal_notes"], "internal_notes", _NOTES_MAX, field_errors)
        if field_errors:
            return err("internal_notes is too long.", 422, field_errors)

    try:
        if new_status is not None:
            f.status = new_status
        if "internal_notes" in data:
            f.internal_notes = data["internal_notes"]
        if "converted_resource_id" in data:
            f.converted_resource_id = data["converted_resource_id"]

        f.updated_at = datetime.now(timezone.utc)
        f.updated_by_user_id = int(get_jwt_identity())

        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(f"Failed to update skills follow-up: {str(exc)}", 500)

    return ok(f.to_dict_full(), "Skills follow-up updated.")