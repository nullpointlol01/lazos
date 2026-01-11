"""add moderation fields to posts

Revision ID: 20251231_0000
Revises: 20251228_0000
Create Date: 2025-12-31 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251231_0000'
down_revision = '20251228_0000'
branch_labels = None
depends_on = None


def upgrade():
    # Get connection and inspector to check existing schema
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Get existing columns in posts table
    columns = [col['name'] for col in inspector.get_columns('posts')]

    # Add pending_approval column if it doesn't exist
    if 'pending_approval' not in columns:
        op.add_column('posts',
            sa.Column('pending_approval', sa.Boolean(), nullable=False, server_default='false')
        )

    # Add moderation_reason column if it doesn't exist
    if 'moderation_reason' not in columns:
        op.add_column('posts',
            sa.Column('moderation_reason', sa.String(length=500), nullable=True)
        )

    # Add moderation_date column if it doesn't exist
    if 'moderation_date' not in columns:
        op.add_column('posts',
            sa.Column('moderation_date', sa.DateTime(timezone=True), nullable=True)
        )

    # Get existing indexes
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('posts')]

    # Create index on pending_approval if it doesn't exist
    if 'ix_posts_pending_approval' not in existing_indexes:
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_posts_pending_approval
            ON posts (pending_approval);
        """)

    # Create composite index for active and approved posts if it doesn't exist
    if 'ix_posts_active_approved' not in existing_indexes:
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_posts_active_approved
            ON posts (is_active, pending_approval)
            WHERE is_active = true AND pending_approval = false;
        """)


def downgrade():
    # Drop indexes
    op.drop_index('ix_posts_active_approved', table_name='posts')
    op.drop_index('ix_posts_pending_approval', table_name='posts')

    # Drop columns
    op.drop_column('posts', 'moderation_date')
    op.drop_column('posts', 'moderation_reason')
    op.drop_column('posts', 'pending_approval')
