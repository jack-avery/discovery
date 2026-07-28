# app/config.py
from datetime import timedelta
import os


def _split_csv(value: str | None) -> list[str]:
    """Turn 'a,b,c' env values into a clean list; '' -> []."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

# app/config.py
def _database_url(default_uri: str) -> str:
    """Empty-string env vars must fall through to the default, not raise later."""
    value = os.environ.get("DATABASE_URL", "").strip()
    return value or default_uri


class Config:
    """Base config - values shared across all environments."""

    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

    # JWT
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_SECURE = False  # overridden to True in ProductionConfig
    JWT_COOKIE_CSRF_PROTECT = False  # overridden to True in ProductionConfig
    JWT_REFRESH_COOKIE_NAME = "refresh_token_cookie"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # CORS
    CORS_ORIGINS = _split_csv(os.environ.get("CORS_ORIGINS"))
    CORS_SUPPORTS_CREDENTIALS = True

    # Uploaded resource images
    UPLOAD_FOLDER = os.environ.get(
        "UPLOAD_FOLDER",
        os.path.join(os.getcwd(), "instance", "uploads", "resources"),
    )
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB request body cap
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

    # Anonymous submission / issue rate limiting, utils.py reads this key
    RATELIMIT_MAX_OVERRIDE = int(os.environ.get("RATELIMIT_MAX_SUBMISSIONS", 5))
    TRUSTED_PROXY_COUNT = int(os.environ.get("TRUSTED_PROXY_COUNT", 0))


class DevelopmentConfig(Config):
    """Local dev connects to the sandboxv2 MySQL instance via Docker."""

    DEBUG = True
    SQLALCHEMY_ECHO = False

    _host = os.environ.get("DB_HOST", "db")
    _port = os.environ.get("DB_PORT", "3306")
    _name = os.environ.get("DB_NAME", "discovery")
    _user = os.environ.get("DB_USER", "discoverer")
    _pass = os.environ.get("DB_PASSWORD")

    SQLALCHEMY_DATABASE_URI = _database_url(f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}")

class ProductionConfig(Config):
    """Production: same Docker service, hardened JWT/cookie settings."""

    DEBUG = False
    SQLALCHEMY_ECHO = False

    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True

    _host = os.environ.get("DB_HOST", "db")
    _port = os.environ.get("DB_PORT", "3306")
    _name = os.environ.get("DB_NAME", "discovery")
    _user = os.environ.get("DB_USER", "discoverer")
    _pass = os.environ.get("DB_PASSWORD")

    SQLALCHEMY_DATABASE_URI = _database_url(f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}")

    # Required at startup
    REQUIRED_ENV_VARS = ("SECRET_KEY", "JWT_SECRET_KEY", "DB_PASSWORD", "CORS_ORIGINS")


class TestingConfig(Config):
    """Pytest uses an in-memory SQLite database and collapses token TTLs for fast expiry tests."""

    TESTING = True
    DEBUG = True
    SQLALCHEMY_ECHO = False

    SECRET_KEY = "testing-secret-key"
    JWT_SECRET_KEY = "testing-jwt-secret-key"

    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    # Collapse token TTL
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=5)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=10)

    # Disable CSRF
    WTF_CSRF_ENABLED = False
    JWT_COOKIE_CSRF_PROTECT = False

    # Prevent the rate-limit
    RATELIMIT_MAX_OVERRIDE = 5

    UPLOAD_FOLDER = os.path.join(os.getcwd(), "instance", "uploads", "resources")


# Registry, __init__.py selects the right config by name string
config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
