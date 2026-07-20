# app/config.py
from datetime import timedelta
import os


class Config:
    """Base config — values shared across all environments."""

    SECRET_KEY     = os.environ.get("SECRET_KEY",     "f6a90be0-80c1-4248-b307-481032a9d06b")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "a5946e4f-75cb-4d13-9339-01c7eca6b18e")

    # JWT
    JWT_TOKEN_LOCATION        = ["headers", "cookies"]
    JWT_COOKIE_SAMESITE       = "Lax"
    JWT_COOKIE_SECURE         = False      # overridden to True in ProductionConfig
    JWT_COOKIE_CSRF_PROTECT   = False      # overridden to True in ProductionConfig
    JWT_REFRESH_COOKIE_NAME   = "refresh_token_cookie"
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO                = False


class DevelopmentConfig(Config):
    """Local dev connects to the sandboxv2 MySQL instance via Docker."""

    DEBUG          = True
    SQLALCHEMY_ECHO = False

    _host = "db"
    _port = "3306"
    _name = "discovery"
    _user = "discoverer"
    _pass = "b1kcxz40"

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}"
    )


class ProductionConfig(Config):
    """Production same Docker service, hardened JWT settings."""

    DEBUG = False
    SQLALCHEMY_ECHO = False

    JWT_COOKIE_SECURE       = True
    JWT_COOKIE_CSRF_PROTECT = True

    _host = "db"
    _port = "3306"
    _name = "discovery"
    _user = "discoverer"
    _pass = "b1kcxz40"

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}"
    )


class TestingConfig(Config):
    """ Pytest uses an in-memory SQLite database and collapses token TTLs for fast expiry tests."""

    TESTING        = True
    DEBUG          = True
    SQLALCHEMY_ECHO = False

    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    # Collapse token TTL so expiry tests don't need real sleeps
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(seconds=5)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=10)

    # Disable CSRF for test clients
    WTF_CSRF_ENABLED = False

    # Prevent the rate-limit gate from blocking rapid anonymous test calls
    RATELIMIT_MAX_OVERRIDE = 999


# Registry __init__.py selects the right config by name string
config_map = {
    "development": DevelopmentConfig,
    "testing":     TestingConfig,
    "production":  ProductionConfig,
}