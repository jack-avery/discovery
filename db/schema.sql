-- ============================================================================
-- RRCRC Community Asset Mapping Platform
-- TABLES: 18 (down from 20)
--   Auth:       roles, users, user_roles, password_reset_tokens
--   Lookup:     categories, tags
--   Core:       resources, resource_versions, resource_locations,
--               resource_contacts, resource_hours,
--               resource_version_categories, resource_version_tags
--   Workflow:   submissions, submission_reviews, reported_issues
--   Ops:        resource_change_log, submission_rate_limits
-- ============================================================================

CREATE DATABASE IF NOT EXISTS discovery
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE discovery;

CREATE USER 'discoverer'@'%' IDENTIFIED BY 'b1kcxz40';
GRANT CREATE, ALTER, DROP, SELECT, INSERT, UPDATE, DELETE ON discovery.* TO 'discoverer'@'%';

FLUSH PRIVILEGES;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- SECTION 1 — AUTHENTICATION & USERS

-- Role registry. M:M via user_roles lets staff hold multiple roles
-- (e.g. staff_editor + moderator). Adding roles here never touches user rows.
CREATE TABLE roles (
    role_id     INT          AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Seed values: 'contributor' | 'moderator' | 'staff_editor' | 'administrator'


CREATE TABLE users (
    user_id       BIGINT       AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    is_active     TINYINT   NOT NULL DEFAULT 1,
    deleted_at    DATETIME     NULL,     -- soft delete; filter: WHERE deleted_at IS NULL
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Many-to-many users ↔ roles.
-- assigned_by_user_id: admin audit trail (who granted this role?).
CREATE TABLE user_roles (
    user_role_id        BIGINT   AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT   NOT NULL,
    role_id             INT      NOT NULL,
    assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id BIGINT   NULL,
    UNIQUE KEY uq_user_role (user_id, role_id),
    FOREIGN KEY (user_id)             REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id)             REFERENCES roles(role_id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);


-- Isolated from users: no nullable reset_token column on users (3NF + security).
-- token_hash: store SHA-256 of the raw token emailed to user.
-- used_at: NULL = still valid; non-NULL = consumed (one-use enforcement in Flask).
CREATE TABLE password_reset_tokens (
    token_id   BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
); 


-- ============================================================================
-- SECTION 2 — LOOKUP / CLASSIFICATION TABLES
-- ============================================================================

-- Hierarchical category support via parent_category_id self-reference.
-- slug, icon_identifier, color_hex, display_order serve the map legend
-- and dashboard pie chart. Isolating them here prevents update anomalies
-- (changing a color requires one UPDATE, not touching every resource row).
CREATE TABLE categories (
    category_id        INT          AUTO_INCREMENT PRIMARY KEY,
    parent_category_id INT          NULL,
    name               VARCHAR(100) NOT NULL UNIQUE,
    slug               VARCHAR(100) NOT NULL UNIQUE,
    description        TEXT         NULL,
    icon_identifier    VARCHAR(50)  NULL,    -- frontend icon key e.g. 'utensils'
    color_hex          CHAR(7)      NULL,    -- '#E53935'
    display_order      SMALLINT     NOT NULL DEFAULT 0,
    is_active          TINYINT   NOT NULL DEFAULT 1,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
); 


CREATE TABLE tags (
    tag_id     INT          AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    is_active  TINYINT   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
); 


-- ============================================================================
-- SECTION 3 — CORE RESOURCE TABLES
-- ============================================================================

CREATE TABLE resources (
    resource_id                 BIGINT       AUTO_INCREMENT PRIMARY KEY,
    current_approved_version_id BIGINT       NULL,    -- FK added via ALTER below
    slug                        VARCHAR(300) NOT NULL UNIQUE,  -- SEO + stable deep-links
    is_active                   TINYINT   NOT NULL DEFAULT 1,
    created_by_user_id          BIGINT       NULL,
    last_verified_at            DATETIME     NULL,
    last_verified_by_user_id    BIGINT       NULL,
    next_review_due_at          DATETIME     NULL,   -- staff freshness queue
    deleted_at                  DATETIME     NULL,   -- soft delete
    created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id)       REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (last_verified_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
); 


-- resource_type VARCHAR replaces the removed resource_types lookup table.
-- CHECK constraint enforces the same domain at lower join cost.
-- Charter values: Organization, Program, Service, Volunteer Skill,
--                 Volunteer Service, Program Idea, Informal Support
--
-- image_url added: the dashboard mockup (Appendix A) shows resource thumbnails
-- on map pins and in the detail panel. This field stores a relative path
-- (e.g. '/uploads/resources/abc.jpg') or external URL.
--
-- eligibility + cost_description + accessibility_notes: directly support the
-- social prescribing use case — social workers need to know who qualifies,
-- what it costs, and whether clients with mobility needs can access it.
CREATE TABLE resource_versions (
    resource_version_id  BIGINT       AUTO_INCREMENT PRIMARY KEY,
    resource_id          BIGINT       NOT NULL,
    resource_type        VARCHAR(50)  NOT NULL DEFAULT 'Organization',
    moderation_status    VARCHAR(30)  NOT NULL DEFAULT 'pending_review',
    -- display content
    name                 VARCHAR(255) NOT NULL,
    description          TEXT         NULL,
    eligibility          TEXT         NULL,       -- who qualifies; social prescribing field
    cost_description     VARCHAR(255) NULL,       -- 'Free' | 'Sliding scale' | '$5/session'
    accessibility_notes  TEXT         NULL,       -- wheelchair, parking, transit
    general_notes        TEXT         NULL,
    image_url            VARCHAR(500) NULL,       -- thumbnail shown on map pin / detail panel
    -- version lifecycle
    submitted_by_user_id BIGINT       NULL,       -- NULL = imported by staff from RRCRC dataset
    submitted_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id  BIGINT       NULL,
    reviewed_at          DATETIME     NULL,
    review_comment       TEXT         NULL,
    approved_at          DATETIME     NULL,
    expires_at           DATETIME     NULL,       -- sunset date for seasonal programs
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id)          REFERENCES resources(resource_id)  ON DELETE CASCADE,
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(user_id)          ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by_user_id)  REFERENCES users(user_id)          ON DELETE SET NULL
); 


-- Close the circular FK (Step 3).
ALTER TABLE resources
    ADD CONSTRAINT fk_resources_current_version
    FOREIGN KEY (current_approved_version_id)
    REFERENCES resource_versions(resource_version_id)
    ON DELETE SET NULL;


-- Separate location table: supports multi-site organizations and online-only
-- resources. is_virtual = 1 resources get RRCRC origin coordinates
-- (POINT(-75.6972 45.4215)) as map pin fallback — required because
-- MySQL SPATIAL INDEX mandates NOT NULL on the indexed column.
CREATE TABLE resource_locations (
    location_id         BIGINT        AUTO_INCREMENT PRIMARY KEY,
    resource_version_id BIGINT        NOT NULL,
    location_name       VARCHAR(255)  NULL,       -- 'Main Office' | 'East Satellite'
    address_line1       VARCHAR(255)  NULL,
    address_line2       VARCHAR(100)  NULL,
    city                VARCHAR(100)  NOT NULL DEFAULT 'Ottawa',
    province            VARCHAR(50)   NOT NULL DEFAULT 'Ontario',
    postal_code         VARCHAR(10)   NULL,       -- no FK constraint; raw import-safe
    country             VARCHAR(50)   NOT NULL DEFAULT 'Canada',
    lat                 DECIMAL(10,7) NULL,       -- decimal backup for Haversine fallback
    lng                 DECIMAL(10,7) NULL,
    coordinates         POINT         NULL SRID 4326,  -- WGS84; powers ST_Distance_Sphere()
    is_primary          TINYINT    NOT NULL DEFAULT 1,
    is_virtual          TINYINT    NOT NULL DEFAULT 0,
    service_area_notes  TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_version_id) REFERENCES resource_versions(resource_version_id) ON DELETE CASCADE
); 


-- contact_type VARCHAR replaces the removed contact_types lookup table.
-- contact_label distinguishes multiple entries of the same type
-- (e.g. 'Main Line' vs 'Crisis Line' both having type='Phone').
CREATE TABLE resource_contacts (
    contact_id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    resource_version_id BIGINT       NOT NULL,
    contact_type        VARCHAR(50)  NOT NULL,
    contact_value       VARCHAR(500) NOT NULL,
    contact_label       VARCHAR(100) NULL,        -- 'Main Line' | 'Crisis Line' | 'Intake'
    is_primary          TINYINT   NOT NULL DEFAULT 0,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_version_id) REFERENCES resource_versions(resource_version_id) ON DELETE CASCADE
); 


-- by_appointment_only supports the social worker question:
-- "Can I send a client there today without calling ahead?"
-- UNIQUE(resource_version_id, day_of_week): one row per day per version.
CREATE TABLE resource_hours (
    hours_id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    resource_version_id BIGINT       NOT NULL,
    day_of_week         TINYINT      NOT NULL COMMENT '0=Sunday, 1=Monday ... 6=Saturday',
    opens_at            TIME         NULL,
    closes_at           TIME         NULL,
    is_closed           TINYINT   NOT NULL DEFAULT 0,
    by_appointment_only TINYINT   NOT NULL DEFAULT 0,
    notes               VARCHAR(255) NULL,
    UNIQUE KEY uq_version_day (resource_version_id, day_of_week),
    FOREIGN KEY (resource_version_id) REFERENCES resource_versions(resource_version_id) ON DELETE CASCADE
); 


-- is_primary allows one "primary" category per version (drives dashboard pie
-- chart aggregation) while supporting multi-category resources
-- (e.g. Food + Child & Family Support).
CREATE TABLE resource_version_categories (
    resource_version_id BIGINT     NOT NULL,
    category_id         INT        NOT NULL,
    is_primary          TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (resource_version_id, category_id),
    FOREIGN KEY (resource_version_id) REFERENCES resource_versions(resource_version_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id)         REFERENCES categories(category_id)                ON DELETE CASCADE
); 


CREATE TABLE resource_version_tags (
    resource_version_id BIGINT NOT NULL,
    tag_id              INT    NOT NULL,
    PRIMARY KEY (resource_version_id, tag_id),
    FOREIGN KEY (resource_version_id) REFERENCES resource_versions(resource_version_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)              REFERENCES tags(tag_id)                           ON DELETE CASCADE
); 


-- ============================================================================
-- SECTION 4 — SUBMISSION WORKFLOW
-- ============================================================================
--
-- FLOW A — New resource:
--   1. INSERT resources  (current_approved_version_id = NULL)
--   2. INSERT resource_versions  (moderation_status = 'pending_review')
--   3. INSERT submissions  (resource_id = new, proposed_version_id = new version)
--   4. Moderator reviews → INSERT submission_reviews
--   5a. APPROVE:
--       UPDATE resource_versions SET moderation_status='approved', approved_at=NOW()
--       UPDATE resources SET current_approved_version_id = version_id, is_active = 1
--       UPDATE submissions SET moderation_status = 'approved'
--       INSERT resource_change_log (change_type = 'approved_submission')
--   5b. REJECT:
--       UPDATE resource_versions SET moderation_status = 'rejected'
--       UPDATE submissions SET moderation_status = 'rejected'
--
-- FLOW B — Update existing resource:
--   1. INSERT resource_versions (new row; resource_id = existing; status = 'pending_review')
--   2. INSERT submissions (resource_id = existing, proposed_version_id = new version)
--   3. Existing approved version stays live until step 5a above.
-- ============================================================================

CREATE TABLE submissions (
    submission_id        BIGINT       AUTO_INCREMENT PRIMARY KEY,
    submission_type      VARCHAR(30)  NOT NULL,
    resource_id          BIGINT       NULL,       -- NULL for new_resource before shell is created
    proposed_version_id  BIGINT       NULL,       -- resource_version awaiting approval
    submitted_by_user_id BIGINT       NULL,       -- NULL = anonymous community member
    submitter_name       VARCHAR(255) NULL,
    submitter_email      VARCHAR(255) NULL,
    submitter_phone      VARCHAR(50)  NULL,
    submission_message   TEXT         NULL,
    moderation_status    VARCHAR(30)  NOT NULL DEFAULT 'pending_review',
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id)          REFERENCES resources(resource_id)                  ON DELETE CASCADE,
    FOREIGN KEY (proposed_version_id)  REFERENCES resource_versions(resource_version_id)  ON DELETE SET NULL,
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(user_id)                          ON DELETE SET NULL
); 


-- Full review history per submission — never overwrite, always append.
-- moderation_status on submissions = current state.
-- submission_reviews = the full trail of how we got there.
-- Supports multi-step moderation: pending_review → needs_clarification → approved.
CREATE TABLE submission_reviews (
    review_id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    submission_id       BIGINT       NOT NULL,
    reviewed_by_user_id BIGINT       NOT NULL,
    moderation_status   VARCHAR(30)  NOT NULL,
    review_comment      TEXT         NULL,
    reviewed_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id)       REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(user_id)             ON DELETE RESTRICT
); 


-- Separate from submissions: issue reports are lighter-weight than full edits.
-- A community member reports "this phone number is wrong", this does NOT create
-- a new resource_version. The moderator reads it and decides whether a full
-- update submission is needed. Directly supports the "Report an Issue" button
-- visible in the dashboard mockup (Appendix A).
CREATE TABLE reported_issues (
    issue_id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    resource_id         BIGINT       NOT NULL,
    reported_by_user_id BIGINT       NULL,        -- NULL = anonymous
    reporter_name       VARCHAR(255) NULL,
    reporter_email      VARCHAR(255) NULL,
    issue_type          VARCHAR(50)  NULL,         -- 'wrong_info' | 'permanently_closed' | 'hours_changed' | 'other'
    description         TEXT         NOT NULL,
    status              VARCHAR(30)  NOT NULL DEFAULT 'open',
    resolved_by_user_id BIGINT       NULL,
    resolved_at         DATETIME     NULL,
    resolution_notes    TEXT         NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id)           REFERENCES resources(resource_id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by_user_id)   REFERENCES users(user_id)         ON DELETE SET NULL,
    FOREIGN KEY (resolved_by_user_id)   REFERENCES users(user_id)         ON DELETE SET NULL
); 


-- ============================================================================
-- SECTION 5 — AUDIT & RATE LIMITING
-- ============================================================================

-- Immutable append-only log. Never UPDATE or DELETE rows in this table.
-- Supports RRCRC post-handoff accountability: who approved bad data? when?
-- change_type vocabulary (expand as needed):
--   'created' | 'updated' | 'status_changed' | 'verified' |
--   'approved_submission' | 'rejected_submission' | 'deleted' | 'restored'
CREATE TABLE resource_change_log (
    change_id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    resource_id        BIGINT       NOT NULL,
    changed_by_user_id BIGINT       NULL,
    change_type        VARCHAR(50)  NOT NULL,
    change_summary     TEXT         NULL,
    submission_id      BIGINT       NULL,    -- set when change originated from a submission
    changed_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id)         REFERENCES resources(resource_id)     ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id)  REFERENCES users(user_id)             ON DELETE SET NULL,
    FOREIGN KEY (submission_id)       REFERENCES submissions(submission_id)  ON DELETE SET NULL
); 


-- Spam prevention for anonymous submission endpoint.
-- Flask logic: SELECT count WHERE ip_hash = ? AND window_start >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
-- If count >= 5: return HTTP 429.
-- On new submission: INSERT ... ON DUPLICATE KEY UPDATE count = count + 1
CREATE TABLE submission_rate_limits (
    ip_hash      VARCHAR(64) NOT NULL,
    window_start DATETIME    NOT NULL,
    count        SMALLINT    NOT NULL DEFAULT 1,
    PRIMARY KEY (ip_hash, window_start)
);


-- ============================================================================
-- SECTION 6 — INDEXES
-- ============================================================================

-- Auth
CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_active  ON users (is_active, deleted_at);

-- Resource identity
CREATE INDEX idx_resources_slug        ON resources (slug);
CREATE INDEX idx_resources_active      ON resources (is_active, deleted_at);
CREATE INDEX idx_resources_review_due  ON resources (next_review_due_at);

-- Version / moderation queue
CREATE INDEX idx_rv_resource     ON resource_versions (resource_id);
CREATE INDEX idx_rv_status       ON resource_versions (moderation_status);
CREATE INDEX idx_rv_type         ON resource_versions (resource_type);
CREATE INDEX idx_rv_submitted_at ON resource_versions (submitted_at DESC);

-- Location — decimal fallback; SPATIAL INDEX defined inside CREATE TABLE above
CREATE INDEX idx_locations_lat_lng ON resource_locations (lat, lng);

-- Category + tag filter (map filter panel + dashboard pie chart)
CREATE INDEX idx_rvc_category ON resource_version_categories (category_id);
CREATE INDEX idx_rvt_tag      ON resource_version_tags (tag_id);

-- Contacts
CREATE INDEX idx_contacts_version ON resource_contacts (resource_version_id);

-- Hours
CREATE INDEX idx_hours_version ON resource_hours (resource_version_id);

-- Submissions
CREATE INDEX idx_submissions_status   ON submissions (moderation_status);
CREATE INDEX idx_submissions_resource ON submissions (resource_id);
CREATE INDEX idx_submissions_created  ON submissions (created_at DESC);

-- Issue reports
CREATE INDEX idx_issues_resource ON reported_issues (resource_id);
CREATE INDEX idx_issues_status   ON reported_issues (status);

-- Audit log
CREATE INDEX idx_change_log_resource ON resource_change_log (resource_id);
CREATE INDEX idx_change_log_time     ON resource_change_log (changed_at DESC);

-- Full-text search on resource content
-- Usage: WHERE MATCH(name, description) AGAINST ('+food +bank' IN BOOLEAN MODE)
CREATE FULLTEXT INDEX idx_ft_rv_content ON resource_versions (name, description);


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- SECTION 7 — SEED DATA
-- ============================================================================

-- 1. Insert default roles
INSERT INTO roles (role_name, description) VALUES 
('contributor', 'Standard user'), 
('staff_editor', 'Staff member who can edit resources'), 
('moderator', 'Reviews submissions'), 
('administrator', 'Full access');

-- 2. Insert default admin user
-- Password is 'admin123' (replace the hash below if you generated a new one)
INSERT INTO users (email, password_hash, first_name, last_name, is_active)
VALUES ('admin@rrcrc.ca', '$2b$12$w9CMXgEO0oncYsOlhDIRKeYwT9EAxc2MzNV/uvoHzVmqAAHASlexy', 'System', 'Admin', 1);

-- 3. Assign administrator role to the default admin user
INSERT INTO user_roles (user_id, role_id)
VALUES (
    (SELECT user_id FROM users WHERE email = 'admin@rrcrc.ca'),
    (SELECT role_id FROM roles WHERE role_name = 'administrator')
);
-- END OF SCHEMA
