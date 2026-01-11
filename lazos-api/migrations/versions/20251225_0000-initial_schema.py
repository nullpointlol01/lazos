"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-12-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM types (idempotent with checkfirst)
    sex_enum = postgresql.ENUM('male', 'female', 'unknown', name='sex_enum')
    sex_enum.create(op.get_bind(), checkfirst=True)

    size_enum = postgresql.ENUM('small', 'medium', 'large', name='size_enum')
    size_enum.create(op.get_bind(), checkfirst=True)

    animal_enum = postgresql.ENUM('dog', 'cat', 'other', name='animal_enum')
    animal_enum.create(op.get_bind(), checkfirst=True)

    # Create users table (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true
        );
    """)

    # Create indexes for users (idempotent)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
    """)

    # Create posts table (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id UUID PRIMARY KEY,
            image_url VARCHAR(500) NOT NULL,
            thumbnail_url VARCHAR(500) NOT NULL,
            sex sex_enum NOT NULL DEFAULT 'unknown',
            size size_enum NOT NULL,
            animal_type animal_enum NOT NULL DEFAULT 'dog',
            description TEXT,
            location GEOGRAPHY(POINT, 4326) NOT NULL,
            location_name VARCHAR(200),
            sighting_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            contact_method VARCHAR(200),
            embedding VECTOR(512),
            user_id UUID,
            CONSTRAINT description_length_check CHECK (char_length(description) <= 1000)
        );
    """)

    # Create indexes for posts (idempotent)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_id ON posts (id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_sex ON posts (sex);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_size ON posts (size);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_animal_type ON posts (animal_type);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_sighting_date ON posts (sighting_date DESC);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_created_at ON posts (created_at DESC);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_posts_is_active ON posts (is_active) WHERE is_active = true;
    """)

    # Create spatial index for location (idempotent)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_posts_location ON posts USING GIST (location);
    """)

    # Create vector index for embeddings (HNSW) - idempotent
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes WHERE indexname = 'idx_posts_embedding'
            ) THEN
                CREATE INDEX idx_posts_embedding ON posts
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Drop indexes
    op.execute('DROP INDEX IF EXISTS idx_posts_embedding;')
    op.execute('DROP INDEX IF EXISTS idx_posts_location;')
    op.drop_index('ix_posts_is_active', 'posts')
    op.drop_index('ix_posts_created_at', 'posts')
    op.drop_index('ix_posts_sighting_date', 'posts')
    op.drop_index('ix_posts_animal_type', 'posts')
    op.drop_index('ix_posts_size', 'posts')
    op.drop_index('ix_posts_sex', 'posts')
    op.drop_index('ix_posts_id', 'posts')

    # Drop tables
    op.drop_table('posts')

    op.drop_index('ix_users_email', 'users')
    op.drop_index('ix_users_id', 'users')
    op.drop_table('users')

    # Drop ENUMs
    animal_enum = postgresql.ENUM('dog', 'cat', 'other', name='animal_enum')
    animal_enum.drop(op.get_bind(), checkfirst=True)

    size_enum = postgresql.ENUM('small', 'medium', 'large', name='size_enum')
    size_enum.drop(op.get_bind(), checkfirst=True)

    sex_enum = postgresql.ENUM('male', 'female', 'unknown', name='sex_enum')
    sex_enum.drop(op.get_bind(), checkfirst=True)
