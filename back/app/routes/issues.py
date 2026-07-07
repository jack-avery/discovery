# app/routes/issues.py
# pyright: reportCallIssue=false

import hashlib
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ReportedIssue, Resource, Submission, User
from app.utils import check_and_increment_rate_limit, err, ok, paginate, require_roles

issues_bp = Blueprint("issues", __name__, url_prefix="/issues")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

# Helpers

def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


# POST /issues: public, rate-limited for anonymous
@issues_bp.post("")
@jwt_required(optional=True)
def create_issue():
    current_user_id = get_jwt_identity()

    # Rate-limit anonymous callers
    if current_user_id is None:
        ip = request.remote_addr or "unknown"
        ip_hash = _hash_ip(ip)
        if check_and_increment_rate_limit(ip_hash):
            return err("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True) or {}

    # Required: resource_id
    resource_id = data.get("resource_id")
    if not resource_id:
        return err("resource_id is required.", 400)

    # Validate resource exists and is not soft-deleted
    resource = Resource.query.filter_by(
        resource_id=resource_id, deleted_at=None
    ).first()
    if not resource:
        return err("Resource not found.", 404)

    # Required: description
    description = data.get("description")
    if not description:
        return err("description is required.", 400)

    issue_type = data.get("issue_type")  # optional per handoff, but validate if present
    reporter_name = data.get("reporter_name")
    reporter_email = data.get("reporter_email")

    issue = ReportedIssue(
        resource_id=resource_id,
        reported_by_user_id=current_user_id,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        issue_type=issue_type,
        description=description,
        status="open",
    )
    db.session.add(issue)
    db.session.commit()

    return ok({"issue_id": issue.issue_id}, "Issue reported successfully.", 201)


# GET /issues-moderator+, paginated list
@issues_bp.get("")
@jwt_required()
@require_roles("moderator", "administrator")
def list_issues():
    status_filter  = request.args.get("status", "open")
    resource_filter = request.args.get("resource_id", type=int)
    page  = max(1, int(request.args.get("page",  1)))
    limit = max(1, int(request.args.get("limit", 20)))

    query = ReportedIssue.query

    if status_filter:
        query = query.filter_by(status=status_filter)
    if resource_filter:
        query = query.filter_by(resource_id=resource_filter)

    query = query.order_by(ReportedIssue.created_at.desc())
    result = paginate(query, page, limit)

    return ok(
        {
            "items": [i.to_dict() for i in result["items"]],
            "meta": result["meta"],
        },
        "Issues retrieved.",
    )


# PUT /issues/<id>/resolve-moderator+
@issues_bp.put("/<int:issue_id>/resolve")
@jwt_required()
@require_roles("moderator", "administrator")
def resolve_issue(issue_id):
    resolver_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    issue = ReportedIssue.query.get(issue_id)
    if not issue:
        return err("Issue not found.", 404)

    if issue.status == "resolved":
        return err("Issue is already resolved.", 422)

    issue.status           = "resolved"
    issue.resolved_at      = datetime.now(timezone.utc)
    issue.resolved_by_user_id = resolver_id
    if "resolution_notes" in data:
        issue.resolution_notes = data["resolution_notes"]

    db.session.commit()

    return ok({"issue_id": issue.issue_id, "status": issue.status}, "Issue resolved.")


# GET /dashboard/stats-moderator+
@dashboard_bp.get("/stats")
@jwt_required()
@require_roles("moderator", "administrator")
def dashboard_stats():
    total_resources = Resource.query.filter_by(deleted_at=None).count()

    published_resources = Resource.query.filter(
        Resource.is_active == 1,
        Resource.deleted_at == None,  # noqa: E711
    ).count()

    pending_submissions = Submission.query.filter_by(
        moderation_status="pending_review"
    ).count()

    open_issues = ReportedIssue.query.filter_by(status="open").count()

    total_users = User.query.filter_by(is_active=1).count()

    return ok(
        {
            "total_resources":     total_resources,
            "published_resources": published_resources,
            "pending_submissions": pending_submissions,
            "open_issues":         open_issues,
            "total_users":         total_users,
        },
        "Dashboard stats retrieved.",
    )