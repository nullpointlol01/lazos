"""create post_images table

Revision ID: 001_create_post_images
Revises:
Create Date: 2025-12-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '001_create_post_images'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create post_images table
    op.create_table(
        'post_images',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('post_id', UUID(as_uuid=True), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('thumbnail_url', sa.String(500), nullable=False),
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_primary', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('idx_post_images_post_id', 'post_images', ['post_id'])
    op.create_index('idx_post_images_display_order', 'post_images', ['post_id', 'display_order'])

    # Migrate existing posts data to post_images
    # For each existing post, create one post_image entry with its current image_url/thumbnail_url
    op.execute("""
        INSERT INTO post_images (post_id, image_url, thumbnail_url, is_primary, display_order)
        SELECT id, image_url, thumbnail_url, TRUE, 0
        FROM posts
        WHERE image_url IS NOT NULL AND image_url != '';
    """)


def downgrade():
    # Drop indexes
    op.drop_index('idx_post_images_display_order', 'post_images')
    op.drop_index('idx_post_images_post_id', 'post_images')

    # Drop table
    op.drop_table('post_images')
