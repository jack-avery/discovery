from datetime import timedelta
import os
from dotenv import load_dotenv

# Load .env from the project root into os.environ before anything reads it.
# This is a no-op in production where env vars are injected by the host.
load_dotenv()


class Config:
    """Base config, values shared across all environments."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "f6a90be0-80c1-4248-b307-481032a9d06b")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "a5946e4f-75cb-4d13-9339-01c7eca6b18e")

    # JWT
    JWT_TOKEN_LOCATION        = ["headers", "cookies"]
    JWT_COOKIE_SAMESITE       = "Lax"
    JWT_COOKIE_SECURE         = False       # Overridden to True in ProductionConfig
    JWT_COOKIE_CSRF_PROTECT   = False       # Overridden to True in ProductionConfig
    JWT_REFRESH_COOKIE_NAME   = "refresh_token_cookie"
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False                       


class DevelopmentConfig(Config):
    """Local dev, connects to my sandboxv2 MySQL instance."""

    DEBUG = True
    SQLALCHEMY_ECHO = True # See every SQL query in the console for debugging, good

    # Assemble the PyMySQL connection URI from .env values
    _host = os.environ.get("DB_HOST")
    _port = os.environ.get("DB_PORT")
    _name = os.environ.get("DB_NAME")
    _user = os.environ.get("DB_USER")
    _pass = os.environ.get("DB_PASSWORD")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}"
    )


class TestingConfig(Config):
    """Test suite, in-memory SQLite, never touches sandboxv2. Good for quickly running tests"""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ECHO = False
    JWT_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Production,all values must come from real environment variables."""

    DEBUG = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")  # set by us


# Registry __init__.py uses this dict to select the right config by name
config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}