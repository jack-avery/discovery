-- ============================================================================
-- RRCRC Dummy / Test Data
-- Insert order respects FK dependencies.
-- Run AFTER the schema script against sandboxv2.
-- ============================================================================

USE sandboxv2;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- SECTION 1 — ROLES
-- ============================================================================

INSERT INTO roles (role_name, description) VALUES
('contributor',  'Can submit resources for review'),
('moderator',    'Can review and approve submissions'),
('staff_editor', 'Can directly edit approved resources'),
('administrator','Full platform access');

-- ============================================================================
-- SECTION 2 — USERS
-- ============================================================================
-- Passwords are bcrypt hashes of 'TestPass!2026' for all test accounts.
-- Generate your own: from werkzeug.security import generate_password_hash

INSERT INTO users (user_id, email, password_hash, first_name, last_name, is_active) VALUES
(1, 'admin@rrcrc.ca',   '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'RRCRC',   'Admin',    1),
(2, 'user@rrcrc.ca',    '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'RRCRC',   'User',     1),
(3, 'sarah.jones@email.com',  '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'Sarah',   'Jones',    1),
(4, 'mike.chen@email.com',    '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'Mike',    'Chen',     1),
(5, 'priya.sharma@email.com', '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'Priya',   'Sharma',   1),
(6, 'deleted.user@email.com', '$2b$12$DUMMY_HASH_REPLACE_BEFORE_PROD_XXXXXXXXXXXXX', 'Deleted', 'User',     0);

-- Soft-delete user 6
UPDATE users SET deleted_at = '2025-11-01 10:00:00' WHERE user_id = 6;

-- ============================================================================
-- SECTION 3 — USER ROLES
-- ============================================================================

INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES
(1, 4, 1),  -- admin      → administrator
(2, 1, 1),  -- rrcrc user → contributor
(3, 2, 1),  -- sarah      → moderator
(4, 3, 1),  -- mike       → staff_editor
(5, 1, 1);  -- priya      → contributor

-- ============================================================================
-- SECTION 4 — PASSWORD RESET TOKENS
-- ============================================================================

INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at) VALUES
(5, 'a3f1c2e4b5d6789012345678901234567890abcdef1234567890abcdef123456', '2026-06-20 12:00:00', NULL),
(3, 'deadbeefdeadbeefdeadbeefdeadbeef12345678901234567890abcdef123456', '2026-05-01 08:00:00', '2026-04-30 09:15:00');

-- ============================================================================
-- SECTION 5 — CATEGORIES
-- ============================================================================

INSERT INTO categories (category_id, parent_category_id, name, slug, description, icon_identifier, color_hex, display_order, is_active) VALUES
(1,  NULL, 'Food & Nutrition',         'food-nutrition',         'Food banks, meal programs, nutrition support',     'utensils',       '#E53935', 1,  1),
(2,  NULL, 'Housing & Shelter',        'housing-shelter',        'Emergency shelter, transitional housing, rent aid', 'home',           '#1E88E5', 2,  1),
(3,  NULL, 'Mental Health',            'mental-health',          'Counselling, crisis lines, peer support',          'heart',          '#8E24AA', 3,  1),
(4,  NULL, 'Employment',               'employment',             'Job training, resume help, placement services',    'briefcase',      '#F4511E', 4,  1),
(5,  NULL, 'Child & Family',           'child-family',           'Parenting support, childcare, family services',    'users',          '#0097A7', 5,  1),
(6,  NULL, 'Seniors',                  'seniors',                'Programs and services for older adults',           'user-check',     '#FFB300', 6,  1),
(7,  NULL, 'Newcomers & Immigration',  'newcomers-immigration',  'Settlement services, language classes, ESL',       'globe',          '#43A047', 7,  1),
(8,  1,    'Food Banks',               'food-banks',             'Emergency food hampers and pantries',              'shopping-bag',   '#EF5350', 8,  1),
(9,  1,    'Community Meals',          'community-meals',        'Free or low-cost community dining programs',       'coffee',         '#EF9A9A', 9,  1),
(10, 3,    'Crisis Lines',             'crisis-lines',           '24/7 phone and text crisis support',               'phone',          '#AB47BC', 10, 1);

-- ============================================================================
-- SECTION 6 — TAGS
-- ============================================================================

INSERT INTO tags (tag_id, name, slug, is_active) VALUES
(1,  'Free',             'free',              1),
(2,  'Walk-in',          'walk-in',           1),
(3,  'Appointment',      'appointment',       1),
(4,  'Bilingual',        'bilingual',         1),
(5,  'Wheelchair',       'wheelchair',        1),
(6,  'Online',           'online',            1),
(7,  'Youth',            'youth',             1),
(8,  'Seniors',          'seniors',           1),
(9,  'LGBTQ+',           'lgbtq',             1),
(10, 'Indigenous',       'indigenous',        1),
(11, 'Evening Hours',    'evening-hours',     1),
(12, 'Weekend Hours',    'weekend-hours',     1);

-- ============================================================================
-- SECTION 7 — RESOURCES (shell rows, version FK added after)
-- ============================================================================

INSERT INTO resources (resource_id, current_approved_version_id, slug, is_active, created_by_user_id) VALUES
(1, NULL, 'ottawa-food-bank-main',           1, 4),
(2, NULL, 'the-well-community-centre',       1, 4),
(3, NULL, 'carleton-mental-health-services', 1, 3),
(4, NULL, 'employment-ottawa-downtown',      1, 4),
(5, NULL, 'newcomer-welcome-centre-ottawa',  1, 3);

-- ============================================================================
-- SECTION 8 — RESOURCE VERSIONS
-- ============================================================================

INSERT INTO resource_versions (
    resource_version_id, resource_id, resource_type, moderation_status,
    name, description, eligibility, cost_description, accessibility_notes,
    general_notes, image_url,
    submitted_by_user_id, reviewed_by_user_id, reviewed_at, approved_at
) VALUES
(1, 1, 'Organization', 'approved',
    'Ottawa Food Bank',
    'The Ottawa Food Bank supports a network of over 110 member agencies across Ottawa providing food assistance to those in need.',
    'Open to all Ottawa residents experiencing food insecurity. No referral required.',
    'Free',
    'Wheelchair accessible main entrance. Parking available on-site. On OC Transpo Route 14.',
    'Client choice model available at select locations.',
    '/uploads/resources/ottawa-food-bank.jpg',
    4, 3, '2026-01-10 14:00:00', '2026-01-10 15:00:00'),

(2, 2, 'Program', 'approved',
    'The Well Community Centre',
    'Drop-in community centre offering meals, showers, laundry, and social services to vulnerable residents.',
    'Open to all. Priority services for individuals experiencing homelessness.',
    'Free',
    'Ground floor accessible. Gender-neutral washrooms available.',
    'Hot meal served daily at noon. Clothing closet available Tuesdays.',
    '/uploads/resources/the-well.jpg',
    4, 3, '2026-01-15 10:00:00', '2026-01-15 11:00:00'),

(3, 3, 'Service', 'approved',
    'Carleton University Mental Health Services',
    'Free confidential counselling and mental health support for students and community members.',
    'Carleton students and staff. Community access by referral only.',
    'Free for students. Sliding scale for community.',
    'Fully accessible building. Quiet waiting room available.',
    'Same-day crisis appointments available. Call ahead for non-crisis bookings.',
    '/uploads/resources/carleton-mhs.jpg',
    3, 3, '2026-02-01 09:00:00', '2026-02-01 10:00:00'),

(4, 4, 'Organization', 'approved',
    'Employment Ottawa',
    'Employment Ontario-funded service offering job search support, resume workshops, and employer connections.',
    'Ontario residents 18+ who are unemployed or underemployed.',
    'Free',
    'Accessible entrance on Slater St. Near multiple bus routes.',
    NULL,
    '/uploads/resources/employment-ottawa.jpg',
    4, 3, '2026-02-20 11:00:00', '2026-02-20 12:00:00'),

(5, 5, 'Organization', 'approved',
    'Newcomer Welcome Centre Ottawa',
    'Settlement services for new immigrants and refugees including language classes, orientation, and referrals.',
    'Newcomers to Canada within the past 5 years. Permanent residents and refugees welcome.',
    'Free',
    'Accessible. Interpretation services available in 12 languages.',
    'Evening ESL classes available Monday and Wednesday.',
    '/uploads/resources/newcomer-welcome.jpg',
    5, 3, '2026-03-05 13:00:00', '2026-03-05 14:00:00'),

-- A pending version (proposed update to resource 1)
(6, 1, 'Organization', 'pending_review',
    'Ottawa Food Bank (Updated Hours)',
    'Updated description reflecting new Saturday hours and expanded client choice locations.',
    'Open to all Ottawa residents experiencing food insecurity. No referral required.',
    'Free',
    'Wheelchair accessible. New accessible parking spots added near east entrance.',
    'Saturday distribution added starting July 2026.',
    '/uploads/resources/ottawa-food-bank.jpg',
    5, NULL, NULL, NULL);

-- Now link resources to their approved versions
UPDATE resources SET current_approved_version_id = 1 WHERE resource_id = 1;
UPDATE resources SET current_approved_version_id = 2 WHERE resource_id = 2;
UPDATE resources SET current_approved_version_id = 3 WHERE resource_id = 3;
UPDATE resources SET current_approved_version_id = 4 WHERE resource_id = 4;
UPDATE resources SET current_approved_version_id = 5 WHERE resource_id = 5;

-- ============================================================================
-- SECTION 9 — RESOURCE LOCATIONS
-- ============================================================================

INSERT INTO resource_locations (
    resource_version_id, location_name, address_line1, city, province, postal_code,
    lat, lng, coordinates, is_primary, is_virtual
) VALUES
(1, 'Main Warehouse',      '1317 Baseline Rd',    'Ottawa', 'Ontario', 'K2C 0A1', 45.3797, -75.7453, ST_GeomFromText('POINT(-75.7453 45.3797)', 4326), 1, 0),
(2, 'The Well Drop-In',    '203 Guigues Ave',     'Ottawa', 'Ontario', 'K1N 5H7', 45.4287, -75.6919, ST_GeomFromText('POINT(-75.6919 45.4287)', 4326), 1, 0),
(3, 'Health & Counselling','50 Sunnyside Ave',    'Ottawa', 'Ontario', 'K1S 1A5', 45.3837, -75.6957, ST_GeomFromText('POINT(-75.6957 45.3837)', 4326), 1, 0),
(4, 'Downtown Office',     '211 Bronson Ave',     'Ottawa', 'Ontario', 'K1R 6H5', 45.4087, -75.7014, ST_GeomFromText('POINT(-75.7014 45.4087)', 4326), 1, 0),
(5, 'Main Centre',         '380 Hunt Club Rd',    'Ottawa', 'Ontario', 'K1V 1C1', 45.3659, -75.6778, ST_GeomFromText('POINT(-75.6778 45.3659)', 4326), 1, 0),
(5, 'East Satellite',      '1385 Ogilvie Rd',     'Ottawa', 'Ontario', 'K1J 7P8', 45.4412, -75.6221, ST_GeomFromText('POINT(-75.6221 45.4412)', 4326), 0, 0),
(6, 'Main Warehouse',      '1317 Baseline Rd',    'Ottawa', 'Ontario', 'K2C 0A1', 45.3797, -75.7453, ST_GeomFromText('POINT(-75.7453 45.3797)', 4326), 1, 0);

-- ============================================================================
-- SECTION 10 — RESOURCE CONTACTS
-- ============================================================================

INSERT INTO resource_contacts (resource_version_id, contact_type, contact_value, contact_label, is_primary) VALUES
(1, 'Phone',   '613-745-7001',              'Main Line',      1),
(1, 'Website', 'https://ottawafoodbank.ca', 'Website',        0),
(2, 'Phone',   '613-241-1573',              'Drop-In Line',   1),
(2, 'Email',   'info@thewell-ottawa.ca',    'General Inquiry',0),
(3, 'Phone',   '613-520-6674',              'Appointments',   1),
(3, 'Phone',   '613-520-2600',              'Crisis Line',    0),
(4, 'Phone',   '613-234-6627',              'Main Line',      1),
(4, 'Website', 'https://employmentottawa.ca','Website',       0),
(5, 'Phone',   '613-725-0202',              'Main Line',      1),
(5, 'Email',   'info@nwco.ca',              'General Inquiry',0);

-- ============================================================================
-- SECTION 11 — RESOURCE HOURS
-- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- ============================================================================

INSERT INTO resource_hours (resource_version_id, day_of_week, opens_at, closes_at, is_closed, by_appointment_only) VALUES
-- Ottawa Food Bank (v1) — Mon–Fri
(1, 0, NULL,    NULL,    1, 0),
(1, 1, '09:00', '17:00', 0, 0),
(1, 2, '09:00', '17:00', 0, 0),
(1, 3, '09:00', '17:00', 0, 0),
(1, 4, '09:00', '17:00', 0, 0),
(1, 5, '09:00', '17:00', 0, 0),
(1, 6, NULL,    NULL,    1, 0),
-- The Well — 7 days
(2, 0, '10:00', '14:00', 0, 0),
(2, 1, '08:00', '18:00', 0, 0),
(2, 2, '08:00', '18:00', 0, 0),
(2, 3, '08:00', '18:00', 0, 0),
(2, 4, '08:00', '18:00', 0, 0),
(2, 5, '08:00', '18:00', 0, 0),
(2, 6, '10:00', '14:00', 0, 0),
-- Carleton MHS — Mon–Fri, by appointment
(3, 0, NULL,    NULL,    1, 0),
(3, 1, '08:30', '16:30', 0, 1),
(3, 2, '08:30', '16:30', 0, 1),
(3, 3, '08:30', '16:30', 0, 1),
(3, 4, '08:30', '16:30', 0, 1),
(3, 5, '08:30', '16:30', 0, 1),
(3, 6, NULL,    NULL,    1, 0),
-- Employment Ottawa — Mon–Fri
(4, 0, NULL,    NULL,    1, 0),
(4, 1, '09:00', '17:00', 0, 0),
(4, 2, '09:00', '17:00', 0, 0),
(4, 3, '09:00', '17:00', 0, 0),
(4, 4, '09:00', '17:00', 0, 0),
(4, 5, '09:00', '17:00', 0, 0),
(4, 6, NULL,    NULL,    1, 0),
-- Newcomer Welcome Centre — Mon–Sat with evening classes
(5, 0, NULL,    NULL,    1, 0),
(5, 1, '09:00', '20:00', 0, 0),
(5, 2, '09:00', '17:00', 0, 0),
(5, 3, '09:00', '20:00', 0, 0),
(5, 4, '09:00', '17:00', 0, 0),
(5, 5, '09:00', '17:00', 0, 0),
(5, 6, '10:00', '14:00', 0, 0);

-- ============================================================================
-- SECTION 12 — RESOURCE VERSION CATEGORIES
-- ============================================================================

INSERT INTO resource_version_categories (resource_version_id, category_id, is_primary) VALUES
(1, 1, 1),   -- Ottawa Food Bank   → Food & Nutrition (primary)
(1, 8, 0),   -- Ottawa Food Bank   → Food Banks
(2, 1, 1),   -- The Well           → Food & Nutrition (primary)
(2, 2, 0),   -- The Well           → Housing & Shelter
(2, 3, 0),   -- The Well           → Mental Health
(3, 3, 1),   -- Carleton MHS       → Mental Health (primary)
(3, 10,0),   -- Carleton MHS       → Crisis Lines
(4, 4, 1),   -- Employment Ottawa  → Employment (primary)
(5, 7, 1),   -- Newcomer Centre    → Newcomers & Immigration (primary)
(5, 4, 0),   -- Newcomer Centre    → Employment
(6, 1, 1),   -- Ottawa Food Bank v2→ Food & Nutrition (primary)
(6, 8, 0);   -- Ottawa Food Bank v2→ Food Banks

-- ============================================================================
-- SECTION 13 — RESOURCE VERSION TAGS
-- ============================================================================

INSERT INTO resource_version_tags (resource_version_id, tag_id) VALUES
(1, 1),  -- Ottawa Food Bank   → Free
(1, 2),  -- Ottawa Food Bank   → Walk-in
(1, 5),  -- Ottawa Food Bank   → Wheelchair
(2, 1),  -- The Well           → Free
(2, 2),  -- The Well           → Walk-in
(2, 5),  -- The Well           → Wheelchair
(2, 11), -- The Well           → Evening Hours
(2, 12), -- The Well           → Weekend Hours
(3, 3),  -- Carleton MHS       → Appointment
(3, 5),  -- Carleton MHS       → Wheelchair
(4, 1),  -- Employment Ottawa  → Free
(4, 3),  -- Employment Ottawa  → Appointment
(4, 5),  -- Employment Ottawa  → Wheelchair
(5, 1),  -- Newcomer Centre    → Free
(5, 4),  -- Newcomer Centre    → Bilingual
(5, 5),  -- Newcomer Centre    → Wheelchair
(5, 11), -- Newcomer Centre    → Evening Hours
(6, 1),  -- Ottawa Food Bank v2→ Free
(6, 2),  -- Ottawa Food Bank v2→ Walk-in
(6, 5),  -- Ottawa Food Bank v2→ Wheelchair
(6, 12); -- Ottawa Food Bank v2→ Weekend Hours

-- ============================================================================
-- SECTION 14 — SUBMISSIONS
-- ============================================================================

INSERT INTO submissions (
    submission_id, submission_type, resource_id, proposed_version_id,
    submitted_by_user_id, submitter_name, submitter_email,
    submission_message, moderation_status
) VALUES
-- Approved submissions that created the original versions
(1, 'new_resource',    1, 1, 4,    NULL, NULL, 'Adding Ottawa Food Bank to the directory.',         'approved'),
(2, 'new_resource',    2, 2, 4,    NULL, NULL, 'The Well is a key hub for vulnerable residents.',  'approved'),
(3, 'new_resource',    3, 3, 3,    NULL, NULL, 'Student counselling services should be listed.',   'approved'),
(4, 'new_resource',    4, 4, 4,    NULL, NULL, 'Employment Ontario service in downtown Ottawa.',   'approved'),
(5, 'new_resource',    5, 5, 5,    NULL, NULL, 'Important settlement service for newcomers.',      'approved'),
-- Pending update submission for Ottawa Food Bank
(6, 'update_resource', 1, 6, 5,    NULL, NULL, 'Updated Saturday hours now available. Please review.', 'pending_review'),
-- Anonymous community submission
(7, 'new_resource',    NULL, NULL, NULL, 'Jane Doe', 'jane.doe@email.com', 'There is a new food pantry at 100 Main St that should be added.', 'pending_review');

-- ============================================================================
-- SECTION 15 — SUBMISSION REVIEWS
-- ============================================================================

INSERT INTO submission_reviews (submission_id, reviewed_by_user_id, moderation_status, review_comment) VALUES
(1, 3, 'approved',       'Verified with Ottawa Food Bank website. Approved.'),
(2, 3, 'approved',       'Confirmed active. Approved.'),
(3, 3, 'approved',       'Carleton MHS confirmed via phone. Approved.'),
(4, 3, 'approved',       'Employment Ontario listing verified. Approved.'),
(5, 3, 'approved',       'NWC confirmed active and accessible. Approved.');

-- ============================================================================
-- SECTION 16 — REPORTED ISSUES
-- ============================================================================

INSERT INTO reported_issues (
    resource_id, reported_by_user_id, reporter_name, reporter_email,
    issue_type, description, status, resolved_by_user_id, resolved_at, resolution_notes
) VALUES
(1, NULL, 'Anonymous User', 'anon@email.com',
    'hours_changed', 'The food bank was closed on Thursday when I arrived. Hours on the site may be outdated.',
    'open', NULL, NULL, NULL),
(3, 5, NULL, NULL,
    'wrong_info', 'The phone number listed goes to a voicemail that says it is disconnected.',
    'resolved', 3, '2026-05-20 11:00:00', 'Verified new number with Carleton website and updated contact record.'),
(2, NULL, 'Robert Smith', 'rsmith@email.com',
    'other', 'The Well has moved to a new location on Clarence St as of April 2026.',
    'open', NULL, NULL, NULL);

-- ============================================================================
-- SECTION 17 — RESOURCE CHANGE LOG
-- ============================================================================

INSERT INTO resource_change_log (resource_id, changed_by_user_id, change_type, change_summary, submission_id) VALUES
(1, 4, 'created',              'Resource shell created.',                                              1),
(1, 3, 'approved_submission',  'Version 1 approved. Set as current approved version.',                 1),
(2, 4, 'created',              'Resource shell created.',                                              2),
(2, 3, 'approved_submission',  'Version 2 approved. Set as current approved version.',                 2),
(3, 3, 'created',              'Resource shell created.',                                              3),
(3, 3, 'approved_submission',  'Version 3 approved. Set as current approved version.',                 3),
(4, 4, 'created',              'Resource shell created.',                                              4),
(4, 3, 'approved_submission',  'Version 4 approved. Set as current approved version.',                 4),
(5, 5, 'created',              'Resource shell created.',                                              5),
(5, 3, 'approved_submission',  'Version 5 approved. Set as current approved version.',                 5),
(1, 5, 'updated',              'Update submission v6 submitted. Pending moderator review.',            6);

-- ============================================================================
-- SECTION 18 — SUBMISSION RATE LIMITS
-- ============================================================================

INSERT INTO submission_rate_limits (ip_hash, window_start, count) VALUES
('a3f4c2d1e5b6789012345678901234567890abcdef1234567890abcdef123456', '2026-06-14 20:00:00', 2),
('deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678', '2026-06-14 19:00:00', 5),
('cafebabe9876543210fedcba9876543210fedcba9876543210fedcba98765432', '2026-06-14 18:00:00', 1);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- END OF DUMMY DATA
-- ============================================================================