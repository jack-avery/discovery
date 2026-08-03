# app/routes/issues.py
# pyright: reportCallIssue=false

import hashlib
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Category, ReportedIssue, Resource, ResourceVersionCategory, Submission, User
from app.utils import check_and_increment_rate_limit, err, ok, paginate, require_roles, validate_text_length
from sqlalchemy import func

issues_bp = Blueprint("issues", __name__, url_prefix="/issues")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

_DESCRIPTION_MAX = 5000

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
        if not check_and_increment_rate_limit(ip_hash):
            return err("Rate limit exceeded. Try again later.", 429)

    data = request.get_json(silent=True) or {}

    # Required: resource_id
    resource_id = data.get("resource_id")
    if not resource_id:
        db.session.rollback()  # discard the flushed-but-uncommitted rate-limit increment
        return err("resource_id is required.", 400)

    # Validate resource exists and is not soft-deleted
    resource = Resource.query.filter_by(
        resource_id=resource_id, deleted_at=None
    ).first()
    if not resource:
        db.session.rollback()
        return err("Resource not found.", 404)

    # Required: description
    description = data.get("description")
    if not description:
        db.session.rollback()
        return err("description is required.", 400)

    field_errors = {}
    validate_text_length(description, "description", _DESCRIPTION_MAX, field_errors)
    if field_errors:
        db.session.rollback()
        return err("description is too long.", 422, field_errors)

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
    db.session.commit()  # single commit: rate-limit increment (if any) + issue insert

    return ok({"issue_id": issue.issue_id}, "Issue reported successfully.", 201)


# GET /issues - moderator+, paginated list
@issues_bp.get("")
@require_roles("moderator")
def list_issues():
    status_filter = request.args.get("status", "open")
    resource_filter = request.args.get("resource_id", type=int)
    page = max(1, int(request.args.get("page", 1)))
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


# PUT /issues/<id>/resolve - moderator+
@issues_bp.put("/<int:issue_id>/resolve")
@require_roles("moderator")
def resolve_issue(issue_id):
    resolver_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    issue = ReportedIssue.query.get(issue_id)
    if not issue:
        return err("Issue not found.", 404)

    if issue.status == "resolved":
        return err("Issue is already resolved.", 422)

    issue.status = "resolved"
    issue.resolved_at = datetime.now(timezone.utc)
    issue.resolved_by_user_id = resolver_id
    if "resolution_notes" in data:
        issue.resolution_notes = data["resolution_notes"]

    db.session.commit()

    return ok({"issue_id": issue.issue_id, "status": issue.status}, "Issue resolved.")


# GET /dashboard/stats - moderator+
@dashboard_bp.get("/stats")
@require_roles("moderator")
def dashboard_stats():
    total_resources = Resource.query.filter_by(deleted_at=None).count()

    published_resources = Resource.query.filter(
        Resource.is_active == 1,
        Resource.deleted_at == None,  
    ).count()

    pending_submissions = Submission.query.filter_by(
        moderation_status="pending_review"
    ).count()

    new_submission_types = [
        t for t in Submission.SUBMISSION_TYPES if t != "update_resource"
    ]
    pending_new_submissions = Submission.query.filter(
        Submission.moderation_status == "pending_review",
        Submission.submission_type.in_(new_submission_types),
    ).count()

    pending_resource_updates = Submission.query.filter_by(
        moderation_status="pending_review",
        submission_type="update_resource",
    ).count()

    open_issues = ReportedIssue.query.filter_by(status="open").count()

    total_users = User.query.filter_by(is_active=1).count()

    category_rows = (
        db.session.query(
            Category.category_id,
            Category.name,
            func.count(func.distinct(Resource.resource_id)).label("resource_count"),
        )
        .outerjoin(
            ResourceVersionCategory,
            ResourceVersionCategory.category_id == Category.category_id,
        )
        .outerjoin(
            Resource,
            db.and_(
                Resource.current_approved_version_id == ResourceVersionCategory.resource_version_id,
                Resource.is_active == 1,
                Resource.deleted_at.is_(None),
            ),
        )
        .filter(Category.is_active == 1)
        .group_by(Category.category_id, Category.name)
        .order_by(func.count(func.distinct(Resource.resource_id)).desc(), Category.name.asc())
        .all()
    )

    return ok(
        {
            "total_resources": total_resources,
            "published_resources": published_resources,
            "pending_submissions": pending_submissions,
            "pending_new_submissions": pending_new_submissions,
            "pending_resource_updates": pending_resource_updates,
            "open_issues": open_issues,
            "total_users": total_users,
            "category_distribution": [
                {"category_id": c.category_id, "name": c.name, "resource_count": c.resource_count}
                for c in category_rows
            ],
        },
        "Dashboard stats retrieved.",
    )