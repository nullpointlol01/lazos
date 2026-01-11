"""add found report reason

Revision ID: 20260111_0001
Revises: 20260111_0000
Create Date: 2026-01-11 04:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260111_0001'
down_revision = '20260111_0000'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'found' to report_reason_enum
    # This is for reports of animals that have already been found/adopted
    op.execute("""
        ALTER TYPE report_reason_enum ADD VALUE IF NOT EXISTS 'found'
    """)


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values easily
    # We would need to recreate the entire enum type, which is complex
    # For now, we'll leave the enum value in place on downgrade
    pass
