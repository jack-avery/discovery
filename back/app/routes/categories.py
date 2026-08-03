# app/routes/categories.py
# type: ignore
# pyright: reportCallIssue=false

from flask import Blueprint, request
from sqlalchemy import func

from app.extensions import db
from app.models import Category, Tag, Resource, ResourceVersionCategory, ResourceVersionTag
from app.utils import ok, err, require_roles, validate_text_length


categories_bp = Blueprint("categories", __name__, url_prefix="/categories")
tags_bp = Blueprint("tags", __name__, url_prefix="/tags")

_NAME_MAX = 100
_SLUG_MAX = 100
_ICON_MAX = 50
_COLOR_MAX = 7


# CATEGORY HELPERS

# usage_count = distinct published (is_active, not deleted) resources whose
# CURRENT approved version carries this category/tag.
def _category_usage_counts():
    rows = (
        db.session.query(
            ResourceVersionCategory.category_id,
            func.count(func.distinct(Resource.resource_id)),
        )
        .join(Resource, Resource.current_approved_version_id == ResourceVersionCategory.resource_version_id)
        .filter(Resource.is_active == 1, Resource.deleted_at.is_(None))
        .group_by(ResourceVersionCategory.category_id)
        .all()
    )
    return dict(rows)


def _tag_usage_counts():
    rows = (
        db.session.query(
            ResourceVersionTag.tag_id,
            func.count(func.distinct(Resource.resource_id)),
        )
        .join(Resource, Resource.current_approved_version_id == ResourceVersionTag.resource_version_id)
        .filter(Resource.is_active == 1, Resource.deleted_at.is_(None))
        .group_by(ResourceVersionTag.tag_id)
        .all()
    )
    return dict(rows)


def _build_tree(categories: list, usage_counts: dict) -> list:
    node_map = {}
    for cat in categories:
        node_map[cat.category_id] = {
            "category_id": cat.category_id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "icon_identifier": cat.icon_identifier,
            "color_hex": cat.color_hex,
            "parent_category_id": cat.parent_category_id,
            "display_order": cat.display_order,
            "usage_count": usage_counts.get(cat.category_id, 0),
            "children": []
        }

    roots = []
    for node in node_map.values():
        pid = node["parent_category_id"]
        if pid and pid in node_map:
            node_map[pid]["children"].append(node)
        else:
            roots.append(node)

    def _sort(nodes):
        nodes.sort(key=lambda n: (n["display_order"] or 9999, n["name"]))
        for n in nodes:
            _sort(n["children"])

    _sort(roots)
    return roots


# GET /categories
@categories_bp.get("")
def list_categories():
    cats = (
        Category.query
        .filter(Category.is_active == 1)
        .order_by(Category.display_order.asc(), Category.name.asc())
        .all()
    )
    return ok(_build_tree(cats, _category_usage_counts()))


# POST /categories
@categories_bp.post("")
@require_roles("staff_editor")
def create_category():
    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip()

    if not name:
        return err("'name' is required.", 400)
    if not slug:
        return err("'slug' is required.", 400)

    field_errors = {}
    validate_text_length(name, "name", _NAME_MAX, field_errors)
    validate_text_length(slug, "slug", _SLUG_MAX, field_errors)
    validate_text_length(data.get("icon_identifier"), "icon_identifier", _ICON_MAX, field_errors)
    validate_text_length(data.get("color_hex"), "color_hex", _COLOR_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if Category.query.filter_by(name=name).first():
        return err(f"A category with name '{name}' already exists.", 409)

    if Category.query.filter_by(slug=slug).first():
        return err(f"A category with slug '{slug}' already exists.", 409)

    parent_category_id = data.get("parent_category_id")
    if parent_category_id is not None:
        if not Category.query.get(parent_category_id):
            return err(f"parent_category_id {parent_category_id} does not exist.", 404)

    category = Category(
        name=name,
        slug=slug,
        description=data.get("description"),
        parent_category_id=parent_category_id,
        icon_identifier=data.get("icon_identifier"),
        color_hex=data.get("color_hex"),
        display_order=data.get("display_order", 0),
        is_active=1,
    )

    db.session.add(category)
    db.session.commit()

    return ok({
        "category_id": category.category_id,
        "name": category.name,
        "slug": category.slug,
    }, status_code=201)


# PUT /categories/<category_id>
@categories_bp.put("/<int:category_id>")
@require_roles("staff_editor")
def update_category(category_id):
    category = Category.query.get(category_id)
    if not category:
        return err("Category not found.", 404)

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    field_errors = {}
    validate_text_length(data.get("name"), "name", _NAME_MAX, field_errors)
    validate_text_length(data.get("slug"), "slug", _SLUG_MAX, field_errors)
    validate_text_length(data.get("icon_identifier"), "icon_identifier", _ICON_MAX, field_errors)
    validate_text_length(data.get("color_hex"), "color_hex", _COLOR_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return err("'name' cannot be empty.", 400)

        existing = Category.query.filter_by(name=name).first()
        if existing and existing.category_id != category_id:
            return err(f"Name '{name}' is already taken.", 409)

        category.name = name

    if "slug" in data:
        slug = (data["slug"] or "").strip()
        if not slug:
            return err("'slug' cannot be empty.", 400)

        existing = Category.query.filter_by(slug=slug).first()
        if existing and existing.category_id != category_id:
            return err(f"Slug '{slug}' is already taken.", 409)

        category.slug = slug

    if "parent_category_id" in data:
        new_parent_id = data["parent_category_id"]

        if new_parent_id is not None:
            if not Category.query.get(new_parent_id):
                return err(f"parent_category_id {new_parent_id} does not exist.", 404)

            cursor_id = new_parent_id
            visited = set()
            while cursor_id is not None:
                if cursor_id == category_id:
                    return err(
                        "Circular parent reference detected: "
                        "a category cannot be its own ancestor.", 422
                    )
                if cursor_id in visited:
                    break
                visited.add(cursor_id)
                cursor = Category.query.get(cursor_id)
                cursor_id = cursor.parent_category_id if cursor else None

        category.parent_category_id = new_parent_id

    for field in ("description", "icon_identifier", "color_hex", "display_order"):
        if field in data:
            setattr(category, field, data[field])

    db.session.commit()

    return ok({
        "category_id": category.category_id,
        "name": category.name,
        "slug": category.slug,
        "parent_category_id": category.parent_category_id,
    })


# DELETE /categories/<category_id> (safe deactivation, requirement 6)
@categories_bp.delete("/<int:category_id>")
@require_roles("staff_editor")
def delete_category(category_id):
    """
    Deactivate, never hard-delete (unchanged from before).
    """
    category = Category.query.get(category_id)
    if not category:
        return err("Category not found.", 404)

    version_ids_with_category = [
        row.resource_version_id
        for row in ResourceVersionCategory.query.filter_by(category_id=category_id).all()
    ]

    affected_resources = (
        Resource.query.filter(
            Resource.current_approved_version_id.in_(version_ids_with_category),
            Resource.is_active == 1,
            Resource.deleted_at.is_(None),
        ).all()
        if version_ids_with_category else []
    )

    blocking_resource_ids = [
        r.resource_id for r in affected_resources
        if ResourceVersionCategory.query.filter_by(
            resource_version_id=r.current_approved_version_id
        ).count() <= 1
    ]
    if blocking_resource_ids:
        return err(
            "Cannot deactivate: it is the only category on "
            f"{len(blocking_resource_ids)} published resource(s). "
            "Give those resources another category first.",
            409,
            {"blocking_resource_ids": blocking_resource_ids},
        )

    for resource in affected_resources:
        ResourceVersionCategory.query.filter_by(
            resource_version_id=resource.current_approved_version_id,
            category_id=category_id,
        ).delete(synchronize_session=False)

    category.is_active = 0
    db.session.commit()

    return ok({
        "category_id": category.category_id,
        "name": category.name,
        "slug": category.slug,
        "is_active": bool(category.is_active),
        "resources_updated": len(affected_resources),
        "message": "Category deactivated successfully."
    })


# GET /tags
@tags_bp.get("")
def list_tags():
    tags = (
        Tag.query
        .filter(Tag.is_active == 1)
        .order_by(Tag.name.asc())
        .all()
    )
    usage_counts = _tag_usage_counts()
    return ok([t.to_dict(usage_count=usage_counts.get(t.tag_id, 0)) for t in tags])


# POST /tags
@tags_bp.post("")
@require_roles("staff_editor")
def create_tag():
    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip()

    if not name:
        return err("'name' is required.", 400)
    if not slug:
        return err("'slug' is required.", 400)

    field_errors = {}
    validate_text_length(name, "name", _NAME_MAX, field_errors)
    validate_text_length(slug, "slug", _SLUG_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if Tag.query.filter_by(name=name).first():
        return err(f"A tag with name '{name}' already exists.", 409)

    if Tag.query.filter_by(slug=slug).first():
        return err(f"A tag with slug '{slug}' already exists.", 409)

    tag = Tag(
        name=name,
        slug=slug,
        is_active=1,
    )

    db.session.add(tag)
    db.session.commit()

    return ok({
        "tag_id": tag.tag_id,
        "name": tag.name,
        "slug": tag.slug,
        "is_active": bool(tag.is_active),
    }, status_code=201)


# PUT /tags/<tag_id>
@tags_bp.put("/<int:tag_id>")
@require_roles("staff_editor")
def update_tag(tag_id):
    tag = Tag.query.get(tag_id)
    if not tag:
        return err("Tag not found.", 404)

    data = request.get_json(silent=True)
    if not data:
        return err("Request body must be JSON.", 400)

    field_errors = {}
    validate_text_length(data.get("name"), "name", _NAME_MAX, field_errors)
    validate_text_length(data.get("slug"), "slug", _SLUG_MAX, field_errors)
    if field_errors:
        return err("One or more fields exceed the maximum allowed length.", 422, field_errors)

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return err("'name' cannot be empty.", 400)

        existing = Tag.query.filter_by(name=name).first()
        if existing and existing.tag_id != tag_id:
            return err(f"Name '{name}' is already taken.", 409)

        tag.name = name

    if "slug" in data:
        slug = (data["slug"] or "").strip()
        if not slug:
            return err("'slug' cannot be empty.", 400)

        existing = Tag.query.filter_by(slug=slug).first()
        if existing and existing.tag_id != tag_id:
            return err(f"Slug '{slug}' is already taken.", 409)

        tag.slug = slug

    if "is_active" in data:
        tag.is_active = 1 if data["is_active"] else 0

    db.session.commit()

    return ok({
        "tag_id": tag.tag_id,
        "name": tag.name,
        "slug": tag.slug,
        "is_active": bool(tag.is_active),
    })


# DELETE /tags/<tag_id>  (soft delete)
@tags_bp.delete("/<int:tag_id>")
@require_roles("staff_editor")
def delete_tag(tag_id):
    tag = Tag.query.get(tag_id)
    if not tag:
        return err("Tag not found.", 404)

    tag.is_active = 0
    db.session.commit()

    return ok({
        "tag_id": tag.tag_id,
        "name": tag.name,
        "slug": tag.slug,
        "is_active": bool(tag.is_active),
        "message": "Tag deactivated successfully."
    })