"""
File co-authored by Rehman and Claude
This file has given me so many headaches. I am so sorry. Pylance, weird errors that werent errors... 
I had to match the ORM with the sql schema, beacuse of the relationships and contraints, I ran into alot of problems but I verified everythign is correct and working at the end of day.

ResourceVersion and Submission are the most complex models, with multiple relationships and properties. I had to be careful with the cascade rules and the back_populates to avoid circular dependencies and ensure proper loading of related objects.


models.py, SQLAlchemy ORM models for the RRCRC Asset Mapping Platform.

Table coverage (19 tables):
  Auth:    roles, users, user_roles, password_reset_tokens
  Lookup:  categories, tags
  Core:    resources, resource_versions, resource_locations,
           resource_contacts, resource_hours,
           resource_version_categories, resource_version_tags
  Workflow: submissions, submission_reviews, reported_issues, skills_follow_ups
  Ops:     resource_change_log, submission_rate_limits

SQLite compatibility note:
  SQLite only autocrements INTEGER primary keys; BIGINT PKs raise NOT NULL.
  _BIG is a dialect-aware type alias: BigInteger on MySQL, Integer on SQLite.
  All PK and FK BigInt columns use _BIG so the test suite runs without MySQL.
"""

from datetime import datetime, timezone
from app.extensions import db

# Dialect-aware big integer: BIGINT on MySQL/Postgres, INTEGER on SQLite
_BIG = db.BigInteger().with_variant(db.Integer, "sqlite")



# SECTION 1 : AUTH & USERS


class Role(db.Model):
    __tablename__ = "roles"

    # Ascending order of privilege. Each role is a strict superset of every
    # role before it (Role & Permission Model Change Request): Staff Editor
    # can do everything Moderator can, Administrator everything Staff Editor
    # can, etc. require_roles() in app/utils.py checks rank
    HIERARCHY = ["trusted_contributor", "moderator", "staff_editor", "administrator"]

    role_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    role_name   = db.Column(db.String(50),  nullable=False, unique=True)
    description = db.Column(db.String(255), nullable=True)
    created_at  = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))

    user_roles = db.relationship("UserRole",
                                 foreign_keys="UserRole.role_id",
                                 back_populates="role", lazy="dynamic")

    def to_dict(self):
        return {
            "role_id":     self.role_id,
            "role_name":   self.role_name,
            "description": self.description,
        }

    def __repr__(self):
        return f"<Role {self.role_name}>"


class User(db.Model):
    __tablename__ = "users"

    user_id       = db.Column(_BIG,           primary_key=True, autoincrement=True)
    email         = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name    = db.Column(db.String(100), nullable=False)
    last_name     = db.Column(db.String(100), nullable=False)
    is_active     = db.Column(db.SmallInteger, nullable=False, default=1)
    deleted_at    = db.Column(db.DateTime,    nullable=True)
    created_at    = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))
    # WARNING (Phase 7/8): onupdate fires for ORM-tracked updates only (db.session.add/commit).Manually pass updated_at=datetime.now(timezone.utc) in the update dict.
    updated_at    = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))

    # foreign_keys must be explicit: UserRole has two FKs to users
    user_roles      = db.relationship("UserRole",
                                      foreign_keys="UserRole.user_id",
                                      back_populates="user", lazy="dynamic")
    password_resets = db.relationship("PasswordResetToken",
                                      foreign_keys="PasswordResetToken.user_id",
                                      back_populates="user", lazy="dynamic")
    submissions     = db.relationship("Submission",
                                      foreign_keys="Submission.submitted_by_user_id",
                                      back_populates="submitted_by", lazy="dynamic")
    reviews         = db.relationship("SubmissionReview",
                                      foreign_keys="SubmissionReview.reviewed_by_user_id",
                                      back_populates="reviewed_by", lazy="dynamic")

    @property
    def role_names(self):
        return [ur.role.role_name for ur in self.user_roles.all() if ur.role] # type: ignore[union-attr]

    @property
    def role_name(self):
        """
        The account's single role name, or None. Accounts are meant to carry
        exactly one role going forward (Role & Permission Model Change
        Request); if user_roles somehow holds more than one (pre-migration
        data, a manual DB edit), this deterministically picks the
        highest-ranked one rather than an arbitrary row.
        """
        names = [n for n in self.role_names if n in Role.HIERARCHY]
        if not names:
            return None
        return max(names, key=Role.HIERARCHY.index)

    def role_rank(self):
        """Index into Role.HIERARCHY, or -1 for no role / an unranked role."""
        name = self.role_name
        return Role.HIERARCHY.index(name) if name in Role.HIERARCHY else -1

    def has_role_at_least(self, min_role):
        """
        True if this user's role rank is >= min_role's rank in Role.HIERARCHY.
        """
        if min_role not in Role.HIERARCHY:
            raise ValueError(f"Unknown role '{min_role}'. Must be one of {Role.HIERARCHY}.")
        return self.role_rank() >= Role.HIERARCHY.index(min_role)

    def has_role(self, *roles):
        """Exact-match check, kept for any existing caller that needs it.
        require_roles() no longer uses this -- see has_role_at_least()."""
        return bool(set(self.role_names) & set(roles))

    def to_dict(self, include_roles=True):
        data = {
            "user_id":    self.user_id,
            "email":      self.email,
            "first_name": self.first_name,
            "last_name":  self.last_name,
            "is_active":  bool(self.is_active),
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
        if include_roles:
            data["roles"] = self.role_names
        return data

    def __repr__(self):
        return f"<User {self.email}>"


class UserRole(db.Model):
    """Many-to-many junction: users ↔ roles with audit trail."""
    __tablename__ = "user_roles"

    user_role_id        = db.Column(_BIG,       primary_key=True, autoincrement=True)
    user_id             = db.Column(_BIG,        db.ForeignKey("users.user_id",  ondelete="CASCADE"),  nullable=False)
    role_id             = db.Column(db.Integer,  db.ForeignKey("roles.role_id",  ondelete="RESTRICT"), nullable=False)
    assigned_at         = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    assigned_by_user_id = db.Column(_BIG,        db.ForeignKey("users.user_id",  ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        db.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
        db.UniqueConstraint("user_id", name="uq_user_single_role"),
    )

    user        = db.relationship("User", foreign_keys=[user_id],             back_populates="user_roles")
    role        = db.relationship("Role", foreign_keys=[role_id],             back_populates="user_roles")
    assigned_by = db.relationship("User", foreign_keys=[assigned_by_user_id])


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    token_id   = db.Column(_BIG,          primary_key=True, autoincrement=True)
    user_id    = db.Column(_BIG,          db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime,   nullable=False)
    used_at    = db.Column(db.DateTime,   nullable=True)
    created_at = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", foreign_keys=[user_id], back_populates="password_resets")

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)



# SECTION 2 : LOOKUP / CLASSIFICATION


class Category(db.Model):
    __tablename__ = "categories"

    category_id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parent_category_id = db.Column(db.Integer,     db.ForeignKey("categories.category_id", ondelete="SET NULL"), nullable=True)
    name               = db.Column(db.String(100), nullable=False, unique=True)
    slug               = db.Column(db.String(100), nullable=False, unique=True)
    description        = db.Column(db.Text,        nullable=True)
    icon_identifier    = db.Column(db.String(50),  nullable=True)
    color_hex          = db.Column(db.String(7),   nullable=True)
    display_order      = db.Column(db.SmallInteger, nullable=False, default=0)
    is_active          = db.Column(db.SmallInteger, nullable=False, default=1)
    created_at         = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))

    parent = db.relationship("Category", remote_side=[category_id], back_populates="children")
    children = db.relationship("Category", back_populates="parent", lazy="dynamic")

    def to_dict(self, usage_count=None):
        """
        usage_count is caller-supplied (see GET /categories in
        app/routes/categories.py), never computed here -- a per-instance
        query for this would be an N+1 query for every list response.
        Omitted from the payload entirely when not supplied.
        """
        data = {
            "category_id":        self.category_id,
            "parent_category_id": self.parent_category_id,
            "name":               self.name,
            "slug":               self.slug,
            "description":        self.description,
            "icon_identifier":    self.icon_identifier,
            "color_hex":          self.color_hex,
            "display_order":      self.display_order,
            "is_active":          bool(self.is_active),
        }
        if usage_count is not None:
            data["usage_count"] = usage_count
        return data


class Tag(db.Model):
    __tablename__ = "tags"

    tag_id     = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    name       = db.Column(db.String(100), nullable=False, unique=True)
    slug       = db.Column(db.String(100), nullable=False, unique=True)
    is_active  = db.Column(db.SmallInteger, nullable=False, default=1)
    created_at = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self, usage_count=None):
        """See Category.to_dict -- usage_count is caller-supplied, bulk-computed."""
        data = {
            "tag_id":    self.tag_id,
            "name":      self.name,
            "slug":      self.slug,
            "is_active": bool(self.is_active),
        }
        if usage_count is not None:
            data["usage_count"] = usage_count
        return data


# SECTION 3 : CORE RESOURCE TABLES

class Resource(db.Model):
    __tablename__ = "resources"

    resource_id                 = db.Column(_BIG,          primary_key=True, autoincrement=True)
    # Circular FK : resolved via post_update=True on the relationship below
    current_approved_version_id = db.Column(_BIG,
        db.ForeignKey("resource_versions.resource_version_id",
                      ondelete="SET NULL", use_alter=True,
                      name="fk_resources_current_version"),
        nullable=True)
    slug                        = db.Column(db.String(300), nullable=False, unique=True)
    is_active                   = db.Column(db.SmallInteger, nullable=False, default=1)
    created_by_user_id          = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    last_verified_at            = db.Column(db.DateTime,   nullable=True)
    last_verified_by_user_id    = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    next_review_due_at          = db.Column(db.DateTime,   nullable=True)
    deleted_at                  = db.Column(db.DateTime,   nullable=True)
    created_at                  = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc))
    # WARNING (Phase 7/8): onupdate fires for ORM-tracked updates only (db.session.add/commit).Manually pass updated_at=datetime.now(timezone.utc) in the update dict.
    updated_at                  = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc),
                                            onupdate=lambda: datetime.now(timezone.utc))

    # post_update=True breaks the circular INSERT dependency between
    # resources and resource_versions
    current_version = db.relationship(
        "ResourceVersion",
        foreign_keys=[current_approved_version_id],
        post_update=True,
        uselist=False,
    )
    versions    = db.relationship("ResourceVersion",
                                  foreign_keys="ResourceVersion.resource_id",
                                  back_populates="resource",
                                  lazy="dynamic",
                                  overlaps="current_version")
    submissions = db.relationship("Submission",  back_populates="resource",  lazy="dynamic")
    change_logs = db.relationship("ResourceChangeLog", back_populates="resource", lazy="dynamic")
    issues      = db.relationship("ReportedIssue", back_populates="resource", lazy="dynamic")
    created_by  = db.relationship("User", foreign_keys=[created_by_user_id])

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def to_dict_summary(self):
        v = self.current_version
        return {
            "resource_id":   self.resource_id,
            "slug":          self.slug,
            "is_active":     bool(self.is_active),
            "last_verified_at": self.last_verified_at.isoformat() + "Z" if self.last_verified_at else None,
            "name":          v.name if v else None,
            "resource_type": v.resource_type if v else None,
            "image_url":     v.image_url if v else None,
        }


class ResourceVersion(db.Model):
    __tablename__ = "resource_versions"

    RESOURCE_TYPES = [
        "Organization", "Program", "Service",
        "Volunteer Skill", "Volunteer Service", "Program Idea", "Informal Support"
    ]
    MODERATION_STATUSES = [
        "pending_review", "approved", "rejected", "needs_clarification",
        "accepted_for_follow_up",  # Skills submissions routed to skills_follow_ups
    ]

    resource_version_id  = db.Column(_BIG,          primary_key=True, autoincrement=True)
    resource_id          = db.Column(_BIG,          db.ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    resource_type        = db.Column(db.String(50), nullable=False, default="Organization")
    moderation_status    = db.Column(db.String(30), nullable=False, default="pending_review")
    name                 = db.Column(db.String(255), nullable=False)
    description          = db.Column(db.Text,       nullable=True)
    eligibility          = db.Column(db.Text,       nullable=True)
    cost_description     = db.Column(db.String(255), nullable=True)
    accessibility_notes  = db.Column(db.Text,       nullable=True)
    general_notes        = db.Column(db.Text,       nullable=True)
    image_url            = db.Column(db.String(500), nullable=True)
    submitted_by_user_id = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    submitted_at         = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_by_user_id  = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at          = db.Column(db.DateTime,   nullable=True)
    review_comment       = db.Column(db.Text,       nullable=True)
    approved_at          = db.Column(db.DateTime,   nullable=True)
    expires_at           = db.Column(db.DateTime,   nullable=True)
    created_at           = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc))
    # WARNING (Phase 7/8): onupdate fires for ORM-tracked updates only (db.session.add/commit).Manually pass updated_at=datetime.now(timezone.utc) in the update dict.
    updated_at           = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc),
                                     onupdate=lambda: datetime.now(timezone.utc))

    resource         = db.relationship("Resource",
                                       foreign_keys=[resource_id],
                                       back_populates="versions",
                                       overlaps="current_version")
    locations          = db.relationship("ResourceLocation",          back_populates="version", cascade="all, delete-orphan", lazy="select")
    contacts           = db.relationship("ResourceContact",           back_populates="version", cascade="all, delete-orphan", lazy="select")
    hours              = db.relationship("ResourceHour",              back_populates="version", cascade="all, delete-orphan", lazy="select")
    version_categories = db.relationship("ResourceVersionCategory",   back_populates="version", cascade="all, delete-orphan", lazy="select")
    version_tags       = db.relationship("ResourceVersionTag",        back_populates="version", cascade="all, delete-orphan", lazy="select")
    submitted_by     = db.relationship("User", foreign_keys=[submitted_by_user_id])
    reviewed_by      = db.relationship("User", foreign_keys=[reviewed_by_user_id])

    @property
    def primary_location(self):
        locs = list(self.locations)  # type: ignore[arg-type]
        return next((loc for loc in locs if loc.is_primary), None) or (locs[0] if locs else None)

    @property
    def primary_contact(self):
        contacts = list(self.contacts)  # type: ignore[arg-type]
        return next((c for c in contacts if c.is_primary), None) or (contacts[0] if contacts else None)

    @property
    def primary_category(self):
        vcs = list(self.version_categories)  # type: ignore[arg-type]
        vc = next((vc for vc in vcs if vc.is_primary), None)
        return vc.category if vc else None

    def to_dict_full(self):
        return {
            "resource_version_id": self.resource_version_id,
            "resource_type":       self.resource_type,
            "moderation_status":   self.moderation_status,
            "name":                self.name,
            "description":         self.description,
            "eligibility":         self.eligibility,
            "cost_description":    self.cost_description,
            "accessibility_notes": self.accessibility_notes,
            "general_notes":       self.general_notes,
            "image_url":           self.image_url,
            "submitted_at":        self.submitted_at.isoformat() + "Z"  if self.submitted_at else None,
            "approved_at":         self.approved_at.isoformat()  + "Z"  if self.approved_at  else None,
            "expires_at":          self.expires_at.isoformat()   + "Z"  if self.expires_at   else None,
            "categories": [
                {
                    "category_id": vc.category_id,
                    "name":        vc.category.name if vc.category else None,
                    "is_primary":  bool(vc.is_primary),
                }
                for vc in self.version_categories # pyright: ignore[reportGeneralTypeIssues]
            ],
            "tags": [
                {"tag_id": vt.tag_id, "name": vt.tag.name if vt.tag else None}
                for vt in self.version_tags # type: ignore
            ],
            "locations": [loc.to_dict() for loc in self.locations], # pyright: ignore[reportGeneralTypeIssues]
            "contacts":  [c.to_dict()   for c   in self.contacts], # pyright: ignore[reportGeneralTypeIssues]
            "hours":     [h.to_dict()   for h   in self.hours], # pyright: ignore[reportGeneralTypeIssues]
        }


class ResourceLocation(db.Model):
    __tablename__ = "resource_locations"

    location_id         = db.Column(_BIG,           primary_key=True, autoincrement=True)
    resource_version_id = db.Column(_BIG,           db.ForeignKey("resource_versions.resource_version_id", ondelete="CASCADE"), nullable=False)
    location_name       = db.Column(db.String(255), nullable=True)
    address_line1       = db.Column(db.String(255), nullable=True)
    address_line2       = db.Column(db.String(100), nullable=True)
    city                = db.Column(db.String(100), nullable=False, default="Ottawa")
    province            = db.Column(db.String(50),  nullable=False, default="Ontario")
    postal_code         = db.Column(db.String(10),  nullable=True)
    country             = db.Column(db.String(50),  nullable=False, default="Canada")
    lat                 = db.Column(db.Numeric(10, 7), nullable=True)
    lng                 = db.Column(db.Numeric(10, 7), nullable=True)
    is_primary          = db.Column(db.SmallInteger,  nullable=False, default=1)
    is_virtual          = db.Column(db.SmallInteger,  nullable=False, default=0)
    service_area_notes  = db.Column(db.Text,          nullable=True)
    created_at          = db.Column(db.DateTime,      nullable=False, default=lambda: datetime.now(timezone.utc))

    # When creating a ResourceLocation in Phase 5 routes, do NOT use db.session.add() alone. populate coordinates via raw SQL
    version = db.relationship("ResourceVersion", back_populates="locations")

    def to_dict(self):
        return {
            "location_id":        self.location_id,
            "location_name":      self.location_name,
            "address_line1":      self.address_line1,
            "address_line2":      self.address_line2,
            "city":               self.city,
            "province":           self.province,
            "postal_code":        self.postal_code,
            "country":            self.country,
            "lat":                float(self.lat) if self.lat  is not None else None,
            "lng":                float(self.lng) if self.lng  is not None else None,
            "is_primary":         bool(self.is_primary),
            "is_virtual":         bool(self.is_virtual),
            "service_area_notes": self.service_area_notes,
        }


class ResourceContact(db.Model):
    __tablename__ = "resource_contacts"

    contact_id          = db.Column(_BIG,           primary_key=True, autoincrement=True)
    resource_version_id = db.Column(_BIG,           db.ForeignKey("resource_versions.resource_version_id", ondelete="CASCADE"), nullable=False)
    contact_type        = db.Column(db.String(50),  nullable=False)
    contact_value       = db.Column(db.String(500), nullable=False)
    contact_label       = db.Column(db.String(100), nullable=True)
    is_primary          = db.Column(db.SmallInteger, nullable=False, default=0)
    created_at          = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))

    version = db.relationship("ResourceVersion", back_populates="contacts")

    def to_dict(self):
        return {
            "contact_id":    self.contact_id,
            "contact_type":  self.contact_type,
            "contact_value": self.contact_value,
            "contact_label": self.contact_label,
            "is_primary":    bool(self.is_primary),
        }


class ResourceHour(db.Model):
    __tablename__ = "resource_hours"

    hours_id            = db.Column(_BIG,            primary_key=True, autoincrement=True)
    resource_version_id = db.Column(_BIG,            db.ForeignKey("resource_versions.resource_version_id", ondelete="CASCADE"), nullable=False)
    day_of_week         = db.Column(db.SmallInteger, nullable=False)   # 0=Sunday … 6=Saturday
    opens_at            = db.Column(db.Time,         nullable=True)
    closes_at           = db.Column(db.Time,         nullable=True)
    is_closed           = db.Column(db.SmallInteger, nullable=False, default=0)
    by_appointment_only = db.Column(db.SmallInteger, nullable=False, default=0)
    notes               = db.Column(db.String(255),  nullable=True)

    __table_args__ = (
        db.UniqueConstraint("resource_version_id", "day_of_week", name="uq_version_day"),
    )

    version = db.relationship("ResourceVersion", back_populates="hours")

    def to_dict(self):
        return {
            "day_of_week":         self.day_of_week,
            "opens_at":            str(self.opens_at)  if self.opens_at  else None,
            "closes_at":           str(self.closes_at) if self.closes_at else None,
            "is_closed":           bool(self.is_closed),
            "by_appointment_only": bool(self.by_appointment_only),
            "notes":               self.notes,
        }


class ResourceVersionCategory(db.Model):
    __tablename__ = "resource_version_categories"

    resource_version_id = db.Column(_BIG,       db.ForeignKey("resource_versions.resource_version_id", ondelete="CASCADE"), primary_key=True)
    category_id         = db.Column(db.Integer, db.ForeignKey("categories.category_id",               ondelete="CASCADE"), primary_key=True)
    is_primary          = db.Column(db.SmallInteger, nullable=False, default=0)

    version  = db.relationship("ResourceVersion", back_populates="version_categories")
    category = db.relationship("Category")


class ResourceVersionTag(db.Model):
    __tablename__ = "resource_version_tags"

    resource_version_id = db.Column(_BIG,       db.ForeignKey("resource_versions.resource_version_id", ondelete="CASCADE"), primary_key=True)
    tag_id              = db.Column(db.Integer, db.ForeignKey("tags.tag_id",                           ondelete="CASCADE"), primary_key=True)

    version = db.relationship("ResourceVersion", back_populates="version_tags")
    tag     = db.relationship("Tag")


# SECTION 4 : SUBMISSION WORKFLOW

class Submission(db.Model):
    __tablename__ = "submissions"

    SUBMISSION_TYPES    = ["new_resource", "update_resource", "community_asset"]
    MODERATION_STATUSES = [
        "pending_review", "approved", "rejected", "needs_clarification",
        "accepted_for_follow_up",  # Skills only -- see review_submission()
    ]

    submission_id        = db.Column(_BIG,          primary_key=True, autoincrement=True)
    submission_type      = db.Column(db.String(30), nullable=False)
    resource_id          = db.Column(_BIG, db.ForeignKey("resources.resource_id",         ondelete="CASCADE"),  nullable=True)
    proposed_version_id  = db.Column(_BIG, db.ForeignKey("resource_versions.resource_version_id", ondelete="SET NULL"), nullable=True)
    submitted_by_user_id = db.Column(_BIG, db.ForeignKey("users.user_id",                 ondelete="SET NULL"), nullable=True)
    submitter_name       = db.Column(db.String(255), nullable=True)
    submitter_email      = db.Column(db.String(255), nullable=True)
    submitter_phone      = db.Column(db.String(50),  nullable=True)
    submission_message   = db.Column(db.Text,        nullable=True)
    moderation_status    = db.Column(db.String(30),  nullable=False, default="pending_review")
    created_at           = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))
     # WARNING (Phase 7/8): onupdate fires for ORM-tracked updates only (db.session.add/commit).Manually pass updated_at=datetime.now(timezone.utc) in the update dict.
    updated_at           = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc),
                                     onupdate=lambda: datetime.now(timezone.utc))

    resource         = db.relationship("Resource",        back_populates="submissions")
    proposed_version = db.relationship("ResourceVersion", foreign_keys=[proposed_version_id])
    submitted_by     = db.relationship("User",            foreign_keys=[submitted_by_user_id],
                                       back_populates="submissions")
    reviews          = db.relationship("SubmissionReview", back_populates="submission",
                           cascade="all, delete-orphan",
                           order_by="SubmissionReview.reviewed_at",
                           lazy="select")

    def to_dict_summary(self):
        v = self.proposed_version
        return {
            "submission_id":          self.submission_id,
            "submission_type":        self.submission_type,
            "moderation_status":      self.moderation_status,
            "submitter_name":         self.submitter_name,
            "proposed_resource_name": v.name if v else None,
            "created_at":             self.created_at.isoformat() + "Z" if self.created_at else None,
        }

    def to_dict_full(self):
        v = self.proposed_version
        return {
            "submission_id":      self.submission_id,
            "submission_type":    self.submission_type,
            "moderation_status":  self.moderation_status,
            "submitter_name":     self.submitter_name,
            "submitter_email":    self.submitter_email,
            "submitter_phone":    self.submitter_phone,
            "submission_message": self.submission_message,
            "created_at":         self.created_at.isoformat() + "Z" if self.created_at else None,
            "proposed_version":   v.to_dict_full() if v else None,
            "review_history":     [r.to_dict() for r in self.reviews], # pyright: ignore[reportGeneralTypeIssues]
        }


class SubmissionReview(db.Model):
    """Append-only moderation decision log : never UPDATE or DELETE rows."""
    __tablename__ = "submission_reviews"

    review_id           = db.Column(_BIG,       primary_key=True, autoincrement=True)
    submission_id       = db.Column(_BIG,       db.ForeignKey("submissions.submission_id", ondelete="CASCADE"),  nullable=False)
    reviewed_by_user_id = db.Column(_BIG,       db.ForeignKey("users.user_id",             ondelete="RESTRICT"), nullable=False)
    moderation_status   = db.Column(db.String(30), nullable=False)
    review_comment      = db.Column(db.Text,    nullable=True)
    # Requirement 3 (Support Reviewer-Edited Versions During Approval):
    # "Record that the approval included reviewer edits." A real column
    # instead of parsing review_comment text for a marker.
    included_reviewer_edits = db.Column(db.SmallInteger, nullable=False, default=0)
    reviewed_at         = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    submission  = db.relationship("Submission", back_populates="reviews")
    reviewed_by = db.relationship("User",       foreign_keys=[reviewed_by_user_id],
                                  back_populates="reviews")

    def to_dict(self):
        return {
            "review_id":         self.review_id,
            "moderation_status": self.moderation_status,
            "review_comment":    self.review_comment,
            "included_reviewer_edits": bool(self.included_reviewer_edits),
            "reviewed_by":       f"{self.reviewed_by.first_name} {self.reviewed_by.last_name}"
                                 if self.reviewed_by else None,
            "reviewed_at":       self.reviewed_at.isoformat() + "Z" if self.reviewed_at else None,
        }


class ReportedIssue(db.Model):
    __tablename__ = "reported_issues"

    ISSUE_TYPES = ["wrong_info", "permanently_closed", "hours_changed", "other"]
    STATUSES    = ["open", "in_review", "resolved", "dismissed"]

    issue_id            = db.Column(_BIG,          primary_key=True, autoincrement=True)
    resource_id         = db.Column(_BIG,          db.ForeignKey("resources.resource_id",  ondelete="CASCADE"),  nullable=False)
    reported_by_user_id = db.Column(_BIG,          db.ForeignKey("users.user_id",           ondelete="SET NULL"), nullable=True)
    reporter_name       = db.Column(db.String(255), nullable=True)
    reporter_email      = db.Column(db.String(255), nullable=True)
    issue_type          = db.Column(db.String(50),  nullable=True)
    description         = db.Column(db.Text,        nullable=False)
    status              = db.Column(db.String(30),  nullable=False, default="open")
    resolved_by_user_id = db.Column(_BIG,          db.ForeignKey("users.user_id",           ondelete="SET NULL"), nullable=True)
    resolved_at         = db.Column(db.DateTime,    nullable=True)
    resolution_notes    = db.Column(db.Text,        nullable=True)
    created_at          = db.Column(db.DateTime,    nullable=False, default=lambda: datetime.now(timezone.utc))

    resource    = db.relationship("Resource",    back_populates="issues")
    reported_by = db.relationship("User", foreign_keys=[reported_by_user_id])
    resolved_by = db.relationship("User", foreign_keys=[resolved_by_user_id])

    def to_dict(self):
        return {
            "issue_id":         self.issue_id,
            "resource_id":      self.resource_id,
            "resource_name":    self.resource.current_version.name
                                if self.resource and self.resource.current_version else None,
            "reporter_name":    self.reporter_name,
            "reporter_email":   self.reporter_email,
            "issue_type":       self.issue_type,
            "description":      self.description,
            "status":           self.status,
            "resolution_notes": self.resolution_notes,
            "resolved_at":      self.resolved_at.isoformat() + "Z" if self.resolved_at else None,
            "created_at":       self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class SkillsFollowUp(db.Model):
    """
    Staff-only lifecycle tracking for Skills (submission_type="community_asset")
    submissions accepted via POST /submissions/<id>/review with
    decision="accepted_for_follow_up". The linked Resource stays inactive/unpublished for the entire
    life of this record -- Skills never auto-publish. One row per submission
    (submission_id is unique): a Skill can only be accepted for follow-up once.
    """
    __tablename__ = "skills_follow_ups"

    STATUSES = ["accepted", "contacted", "in_discussion", "converted", "closed"]

    follow_up_id       = db.Column(_BIG, primary_key=True, autoincrement=True)
    submission_id       = db.Column(_BIG, db.ForeignKey("submissions.submission_id", ondelete="CASCADE"),
                                    nullable=False, unique=True)
    status               = db.Column(db.String(30), nullable=False, default="accepted")
    internal_notes       = db.Column(db.Text, nullable=True)
    accepted_at           = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    accepted_by_user_id   = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    updated_at             = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                                       onupdate=lambda: datetime.now(timezone.utc))
    updated_by_user_id     = db.Column(_BIG, db.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    converted_resource_id  = db.Column(_BIG, db.ForeignKey("resources.resource_id", ondelete="SET NULL"),
                                       nullable=True)

    submission          = db.relationship("Submission")
    accepted_by          = db.relationship("User", foreign_keys=[accepted_by_user_id])
    updated_by            = db.relationship("User", foreign_keys=[updated_by_user_id])
    converted_resource     = db.relationship("Resource", foreign_keys=[converted_resource_id])

    def to_dict_summary(self):
        sub = self.submission
        version = sub.proposed_version if sub else None
        return {
            "follow_up_id":  self.follow_up_id,
            "submission_id": self.submission_id,
            "status":        self.status,
            "submitter_name": sub.submitter_name if sub else None,
            "skill_name":    version.name if version else None,
            "accepted_at":   self.accepted_at.isoformat() + "Z" if self.accepted_at else None,
        }

    def to_dict_full(self):
        sub = self.submission
        version = sub.proposed_version if sub else None
        return {
            "follow_up_id":  self.follow_up_id,
            "submission_id": self.submission_id,
            "status":        self.status,
            "internal_notes": self.internal_notes,
            "accepted_at":   self.accepted_at.isoformat() + "Z" if self.accepted_at else None,
            "accepted_by":   f"{self.accepted_by.first_name} {self.accepted_by.last_name}" if self.accepted_by else None,
            "updated_at":    self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "updated_by":    f"{self.updated_by.first_name} {self.updated_by.last_name}" if self.updated_by else None,
            "converted_resource_id": self.converted_resource_id,
            "submission": {
                "submitter_name":  sub.submitter_name if sub else None,
                "submitter_email": sub.submitter_email if sub else None,
                "submitter_phone": sub.submitter_phone if sub else None,
                "submission_message": sub.submission_message if sub else None,
                "skill_description": version.description if version else None,
                "eligibility_or_availability": version.eligibility if version else None,
                "general_notes": version.general_notes if version else None,
            } if sub else None,
        }


# SECTION 5 : AUDIT & RATE LIMITING
class ResourceChangeLog(db.Model):
    """
    Immutable append-only audit log.
    NEVER update or delete rows here : this is the accountability trail.
    """
    __tablename__ = "resource_change_log"

    CHANGE_TYPES = [
        "created", "updated", "status_changed", "verified",
        "approved_submission", "rejected_submission", "deleted", "restored"
    ]

    change_id          = db.Column(_BIG,          primary_key=True, autoincrement=True)
    resource_id        = db.Column(_BIG,          db.ForeignKey("resources.resource_id",    ondelete="CASCADE"),  nullable=False)
    changed_by_user_id = db.Column(_BIG,          db.ForeignKey("users.user_id",             ondelete="SET NULL"), nullable=True)
    change_type        = db.Column(db.String(50), nullable=False)
    change_summary     = db.Column(db.Text,       nullable=True)
    submission_id      = db.Column(_BIG,          db.ForeignKey("submissions.submission_id", ondelete="SET NULL"), nullable=True)
    changed_at         = db.Column(db.DateTime,   nullable=False, default=lambda: datetime.now(timezone.utc))

    resource   = db.relationship("Resource", back_populates="change_logs")
    changed_by = db.relationship("User",     foreign_keys=[changed_by_user_id])
    submission = db.relationship("Submission", foreign_keys=[submission_id])

    def to_dict(self):
        rv = self.resource.current_version if self.resource else None
        return {
            "change_id":      self.change_id,
            "resource_id":    self.resource_id,
            "resource_name":  rv.name if rv else None,
            "changed_by":     f"{self.changed_by.first_name} {self.changed_by.last_name}"
                              if self.changed_by else "System",
            "change_type":    self.change_type,
            "change_summary": self.change_summary,
            "changed_at":     self.changed_at.isoformat() + "Z" if self.changed_at else None,
        }


class SubmissionRateLimit(db.Model):
    """
    IP-based spam gate for anonymous submissions.
    Composite PK (ip_hash, window_start): one row per IP per clock-hour.
    Flask logic: count >= RATE_LIMIT_SUBMISSIONS_PER_HOUR → HTTP 429.
    """
    __tablename__ = "submission_rate_limits"

    ip_hash      = db.Column(db.String(64),   primary_key=True)
    window_start = db.Column(db.DateTime,     primary_key=True)
    count        = db.Column(db.SmallInteger, nullable=False, default=1)

    def __init__(self, ip_hash: str, window_start: datetime, count: int = 1):
        self.ip_hash      = ip_hash
        self.window_start = window_start
        self.count        = count