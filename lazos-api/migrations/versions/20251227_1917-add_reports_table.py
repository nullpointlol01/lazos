"""add reports table

Revision ID: 20251227_1917
Revises: bd61a4fb8a8b
Create Date: 2025-12-27 19:17:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251227_1917'
down_revision = 'bd61a4fb8a8b'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum for report reasons (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE report_reason_enum AS ENUM ('not_animal', 'inappropriate', 'spam', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create reports table (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY,
            post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            reason report_reason_enum NOT NULL,
            description TEXT,
            reporter_ip VARCHAR(45),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            resolved BOOLEAN NOT NULL
        );
    """)

    # Create indexes (idempotent)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_reports_id ON reports (id);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_reports_post_id ON reports (post_id);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_reports_reason ON reports (reason);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_reports_created_at ON reports (created_at);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_reports_resolved ON reports (resolved);
    """)


def downgrade():
    op.drop_index(op.f('ix_reports_resolved'), table_name='reports')
    op.drop_index(op.f('ix_reports_created_at'), table_name='reports')
    op.drop_index(op.f('ix_reports_reason'), table_name='reports')
    op.drop_index(op.f('ix_reports_post_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_id'), table_name='reports')
    op.drop_table('reports')
    op.execute("DROP TYPE report_reason_enum")
