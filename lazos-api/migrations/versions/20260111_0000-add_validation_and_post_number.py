"""add validation_service, post_number and incorrect_location report reason

Revision ID: 20260111_0000
Revises: 20251231_0000
Create Date: 2026-01-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260111_0000'
down_revision = '20251231_0000'
branch_labels = None
depends_on = None


def upgrade():
    # Add validation_service column to posts
    op.add_column('posts',
        sa.Column('validation_service', sa.String(length=50), nullable=True)
    )

    # Add post_number column to posts (if not exists)
    # Note: User may have already added this via SQL, so we check first
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('posts')]

    if 'post_number' not in columns:
        op.add_column('posts',
            sa.Column('post_number', sa.Integer(), nullable=True)
        )
        # Create unique index on post_number
        op.create_index('ix_posts_post_number', 'posts', ['post_number'], unique=True)

    # Add 'incorrect_location' to report_reason_enum
    # PostgreSQL requires us to use ALTER TYPE for adding enum values
    op.execute("""
        ALTER TYPE report_reason_enum ADD VALUE IF NOT EXISTS 'incorrect_location'
    """)


def downgrade():
    # Drop validation_service column
    op.drop_column('posts', 'validation_service')

    # Drop post_number column and index (if we created them)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('posts')]

    if 'post_number' in columns:
        op.drop_index('ix_posts_post_number', table_name='posts')
        op.drop_column('posts', 'post_number')

    # Note: PostgreSQL doesn't support removing enum values easily
    # We would need to recreate the entire enum type, which is complex
    # For now, we'll leave the enum value in place on downgrade
    pass
