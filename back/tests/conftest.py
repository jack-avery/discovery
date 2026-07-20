# tests/conftest.py
"""
Pytest configuration: app and client fixtures shared across all test modules.

Key decisions
─────────────
StaticPool  — sqlite:///:memory: creates a NEW empty database for every new
              connection. Without StaticPool, db.create_all() builds the
              tables on connection #1, but every Flask test-client request
              opens connection #2 and sees empty schema. StaticPool pins
              ALL SQLAlchemy operations to a single physical connection so
              the in-memory tables survive for the life of the test.

Function scope — each test function gets its own fresh Flask app instance,
              its own StaticPool / in-memory DB, and its own seeded roles.
              Tests cannot pollute each other's data.
"""

import pytest
from sqlalchemy.pool import StaticPool

from app import create_app
from app.extensions import db as _db
from app.models import Role


@pytest.fixture()
def app():
    """
    Spin up a fully isolated Flask test instance.

    Steps executed for every test function:
      1. create_app("testing")  — builds the app with TestingConfig
         (sqlite:///:memory:, short JWT TTLs, CSRF disabled)
      2. Inject StaticPool into SQLALCHEMY_ENGINE_OPTIONS BEFORE the first
         db call so SQLAlchemy honours it when the engine is created lazily.
      3. db.create_all()        — builds all ORM-mapped tables in the
         in-memory DB.
      4. Seed four standard roles so tests can assign them to users.
      5. yield                  — test runs here.
      6. Teardown: close session and drop all tables.
    """
    flask_app = create_app("testing")

    # Must be set before the first db operation (engine is created lazily).
    flask_app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }

    with flask_app.app_context():
        _db.create_all()

        # Seed the four standard roles expected by every test.
        for name, desc in (
            ("contributor",   "Can view own submissions"),
            ("staff_editor",  "Can create/edit resources directly"),
            ("moderator",     "Can approve/reject submissions and issues"),
            ("administrator", "Full access including soft-delete"),
        ):
            if not Role.query.filter_by(role_name=name).first():
                _db.session.add(Role(role_name=name, description=desc)) # pyright: ignore[reportCallIssue]
        _db.session.commit()

        yield flask_app  # ← test body executes here

        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    """Flask test client bound to the isolated test app fixture above."""
    return app.test_client()