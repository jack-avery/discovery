from datetime import timedelta
import os

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


class ProductionConfig(Config):
    """Local dev, connects to my sandboxv2 MySQL instance."""

    DEBUG = False
    SQLALCHEMY_ECHO = False

    _host = "db"
    _port = "3306"
    _name = "discovery"
    _user = "discoverer"
    _pass = "b1kcxz40"

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}"
    )

# Registry __init__.py uses this dict to select the right config by name
config_map = {
    "production": ProductionConfig,
}
