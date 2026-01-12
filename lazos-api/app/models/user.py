"""
User model - Optional, for authenticated users
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database import Base


class User(Base):
    """
    User model - Optional authentication system

    Fields:
    - id: Unique identifier (UUID)
    - email: User's email (unique)
    - password_hash: Hashed password
    - created_at: Timestamp when the user registered
    - is_active: Whether the user account is active
    """
    __tablename__ = "users"

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Email (unique)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Password hash
    password_hash = Column(String(255), nullable=False)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<User {self.email}>"
