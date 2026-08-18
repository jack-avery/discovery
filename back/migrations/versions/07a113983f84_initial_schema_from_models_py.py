"""Initial schema from models.py

Revision ID: 07a113983f84
Revises: 
Create Date: 2026-06-27 21:02:18.904381

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '07a113983f84'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from app.extensions import db
    import app.models  # noqa: F401

    db.metadata.create_all(bind=op.get_bind())


def downgrade():
    from app.extensions import db
    import app.models  # noqa: F401

    db.metadata.drop_all(bind=op.get_bind())