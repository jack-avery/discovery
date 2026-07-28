# tests/conftest.py
"""
Pytest configuration: app and client fixtures shared across all test modules.
"""

import pytest

from app import create_app
from app.extensions import db as _db
from app.models import Role

# Every role name referenced anywhere in test_app.py via role_name=...
ROLE_NAMES = ["administrator", "moderator", "staff_editor", "contributor", "trusted_contributor"]

@pytest.fixture
def app():
    """
    Function-scoped: a brand-new in-memory SQLite DB per test, so tests
    never see another test's rows (required by TestRateLimit and every
    "fresh DB" comment throughout test_app.py).
    """
    flask_app = create_app("testing")

    with flask_app.app_context():
        _db.create_all()
        for name in ROLE_NAMES:
            _db.session.add(Role(role_name=name, description=f"{name.replace('_', ' ').title()} role")) # type: ignore
        _db.session.commit()

        yield flask_app

        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """Flask test client bound to the per-test app/DB above."""
    return app.test_client()