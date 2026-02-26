CREATE USER discoverer;

CREATE DATABASE discovery WITH OWNER discoverer;

\c discovery

-- List of users
CREATE TABLE users (
    user_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username  VARCHAR(32) NOT NULL UNIQUE,
    password  CHAR(256) NOT NULL
);

-- User session tokens
CREATE TABLE sessions (
    session_id    BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id       BIGINT REFERENCES users ON DELETE CASCADE,
    token         CHAR(256) NOT NULL,
    refresh       CHAR(256) NOT NULL,
    expiry        TIME NOT NULL
);

-- Adminstration: list of users and their level
CREATE TABLE admins (
    user_id   BIGINT PRIMARY KEY REFERENCES users ON DELETE CASCADE,
    authlevel SMALLINT NOT NULL
);

-- Events Listings: WIP
CREATE TABLE events (
    event_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- What should we track for events...?
    title         VARCHAR(256) NOT NULL,
    description   VARCHAR(2048)
);

-- Approvals
CREATE TABLE approvals (
    user_id   BIGINT REFERENCES admins ON DELETE CASCADE,
    event_id  BIGINT REFERENCES events,
    PRIMARY KEY (user_id, event_id)
);

-- Audit Logs
CREATE TABLE logs (
    log_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stamp         TIME NOT NULL,
    loglevel      CHAR(5) NOT NULL,
    description   VARCHAR(1024) NOT NULL
);
