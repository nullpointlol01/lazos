"""
Report model - Represents a user report on a post or alert
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class ReportReasonEnum(str, enum.Enum):
    """Report reason enumeration"""
    incorrect_location = "incorrect_location"
    not_animal = "not_animal"
    inappropriate = "inappropriate"
    spam = "spam"
    other = "other"


class Report(Base):
    """
    Report model - Represents a user report on a post or alert

    Fields:
    - id: Unique identifier (UUID)
    - post_id: Reference to the reported post (nullable)
    - alert_id: Reference to the reported alert (nullable)
    - reason: Reason for the report
    - description: Optional detailed description
    - reporter_ip: IP address of the reporter
    - created_at: Timestamp when the report was created
    - resolved: Whether the report has been reviewed

    Note: Either post_id OR alert_id must be set, but not both.
    """
    __tablename__ = "reports"

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Foreign keys - one of these must be set
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    alert_id = Column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Report details
    reason = Column(
        Enum(ReportReasonEnum, name="report_reason_enum"),
        nullable=False,
        index=True,
    )
    description = Column(Text, nullable=True)

    # Reporter info
    reporter_ip = Column(String(45), nullable=True)  # IPv6 compatible

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Status
    resolved = Column(Boolean, default=False, nullable=False, index=True)

    # Constraint: post_id OR alert_id must be set
    __table_args__ = (
        CheckConstraint(
            '(post_id IS NOT NULL AND alert_id IS NULL) OR (post_id IS NULL AND alert_id IS NOT NULL)',
            name='check_post_or_alert'
        ),
    )

    # Relationships
    post = relationship("Post", backref="reports", foreign_keys=[post_id])
    alert = relationship("Alert", backref="reports", foreign_keys=[alert_id])

    def __repr__(self):
        target = f"post {self.post_id}" if self.post_id else f"alert {self.alert_id}"
        return f"<Report {self.id} - {self.reason.value} on {target}>"
