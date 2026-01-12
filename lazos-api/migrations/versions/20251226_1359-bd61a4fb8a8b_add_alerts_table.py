"""add_alerts_table

Revision ID: bd61a4fb8a8b
Revises: 001
Create Date: 2025-12-26 13:59:04.591445

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography


# revision identifiers, used by Alembic.
revision = 'bd61a4fb8a8b'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create animal_type_enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE animal_type_enum AS ENUM ('dog', 'cat', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create alerts table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            description TEXT NOT NULL,
            animal_type animal_type_enum NOT NULL,
            direction VARCHAR(200),
            location GEOGRAPHY(POINT, 4326) NOT NULL,
            location_name VARCHAR(200),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL
        );
    """)

    # Create spatial index on location if it doesn't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alerts_location
        ON alerts
        USING GIST (location);
    """)

    # Create index on created_at for sorting if it doesn't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alerts_created_at
        ON alerts (created_at);
    """)

    # Create index on animal_type for filtering if it doesn't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_alerts_animal_type
        ON alerts (animal_type);
    """)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_alerts_animal_type', table_name='alerts')
    op.drop_index('idx_alerts_created_at', table_name='alerts')
    op.execute("DROP INDEX IF EXISTS idx_alerts_location;")

    # Drop table
    op.drop_table('alerts')
