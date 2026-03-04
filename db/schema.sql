-- this db will only be accessible by the back-end within the docker network
-- so a placeholder password like this is probably fine
CREATE USER 'discoverer'@'back' IDENTIFIED BY 'password123';

CREATE DATABASE discovery;
USE discovery;

-- List of users
CREATE TABLE users (
    user_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    username  VARCHAR(32) NOT NULL UNIQUE,
    password  VARCHAR(256) NOT NULL
);

-- User session tokens
CREATE TABLE sessions (
    session_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    token         VARCHAR(256) NOT NULL,
    refresh       VARCHAR(256) NOT NULL,
    expiry        DATETIME NOT NULL
);

-- Adminstration: list of users and their level
CREATE TABLE admins (
    user_id   BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    authlevel SMALLINT NOT NULL
);

-- Events Listings
CREATE TABLE events (
    event_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(256) NOT NULL,
    description   VARCHAR(2048)
);

-- Approvals
CREATE TABLE approvals (
    user_id   BIGINT REFERENCES admins(user_id) ON DELETE CASCADE,
    event_id  BIGINT REFERENCES events(event_id),
    PRIMARY KEY (user_id, event_id)
);

-- Audit Logs
CREATE TABLE logs (
    log_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    stamp         DATETIME NOT NULL,
    loglevel      VARCHAR(5) NOT NULL,
    description   VARCHAR(1024) NOT NULL
);
