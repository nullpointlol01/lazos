"""add alert_id to reports

Revision ID: 20251228_0000
Revises: 20251227_1917
Create Date: 2025-12-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251228_0000'
down_revision = '20251227_1917'
branch_labels = None
depends_on = None


def upgrade():
    # Get connection and inspector to check existing schema
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Get existing columns in reports table
    columns = [col['name'] for col in inspector.get_columns('reports')]

    # Get existing constraints
    constraints = [c['name'] for c in inspector.get_check_constraints('reports')]
    foreign_keys = [fk['name'] for fk in inspector.get_foreign_keys('reports')]

    # Make post_id nullable if it's not already
    column_info = next((col for col in inspector.get_columns('reports') if col['name'] == 'post_id'), None)
    if column_info and not column_info['nullable']:
        op.alter_column('reports', 'post_id',
                        existing_type=postgresql.UUID(),
                        nullable=True)

    # Add alert_id column if it doesn't exist
    if 'alert_id' not in columns:
        op.add_column('reports', sa.Column('alert_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Create index on alert_id if it doesn't exist
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('reports')]
    if 'ix_reports_alert_id' not in existing_indexes:
        op.create_index(op.f('ix_reports_alert_id'), 'reports', ['alert_id'], unique=False)

    # Add foreign key constraint if it doesn't exist
    if 'fk_reports_alert_id_alerts' not in foreign_keys:
        op.create_foreign_key(
            'fk_reports_alert_id_alerts', 'reports', 'alerts',
            ['alert_id'], ['id'], ondelete='CASCADE'
        )

    # Add check constraint (post_id OR alert_id) if it doesn't exist
    if 'check_post_or_alert' not in constraints:
        op.create_check_constraint(
            'check_post_or_alert',
            'reports',
            '(post_id IS NOT NULL AND alert_id IS NULL) OR (post_id IS NULL AND alert_id IS NOT NULL)'
        )


def downgrade():
    # Drop check constraint
    op.drop_constraint('check_post_or_alert', 'reports', type_='check')

    # Drop foreign key
    op.drop_constraint('fk_reports_alert_id_alerts', 'reports', type_='foreignkey')

    # Drop index
    op.drop_index(op.f('ix_reports_alert_id'), table_name='reports')

    # Drop alert_id column
    op.drop_column('reports', 'alert_id')

    # Make post_id NOT NULL again
    op.alter_column('reports', 'post_id',
                    existing_type=postgresql.UUID(),
                    nullable=False)
