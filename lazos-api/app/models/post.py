"""
Post model - Represents a pet sighting
"""
import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, Enum, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from pgvector.sqlalchemy import Vector
import uuid

from app.database import Base


class SexEnum(str, enum.Enum):
    """Sex enumeration"""
    male = "male"
    female = "female"
    unknown = "unknown"


class SizeEnum(str, enum.Enum):
    """Size enumeration"""
    small = "small"
    medium = "medium"
    large = "large"


class AnimalEnum(str, enum.Enum):
    """Animal type enumeration"""
    dog = "dog"
    cat = "cat"
    other = "other"


class Post(Base):
    """
    Post model - Represents a pet sighting report

    Fields:
    - id: Unique identifier (UUID)
    - image_url: URL to the full-size image
    - thumbnail_url: URL to the thumbnail image
    - sex: Animal's sex (male/female/unknown)
    - size: Animal's size (small/medium/large)
    - animal_type: Type of animal (dog/cat/other)
    - description: Text description of the sighting
    - location: Geographic point (PostGIS GEOGRAPHY)
    - location_name: Human-readable location name
    - sighting_date: Date when the animal was seen
    - created_at: Timestamp when the post was created
    - updated_at: Timestamp when the post was last updated
    - is_active: Whether the post is active/visible
    - pending_approval: Whether the post is pending moderation approval
    - moderation_reason: Optional reason for moderation action
    - moderation_date: Timestamp when the post was moderated
    - contact_method: Optional contact information
    - embedding: CLIP image embedding vector (512 dimensions)
    - user_id: Optional reference to the user who created the post
    """
    __tablename__ = "posts"

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Sequential post number for display (e.g., #1, #2, #3)
    post_number = Column(Integer, nullable=True, unique=True, index=True)

    # Image URLs (required)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)

    # Animal characteristics
    sex = Column(
        Enum(SexEnum, name="sex_enum"),
        default=SexEnum.unknown,
        nullable=False,
        index=True,
    )
    size = Column(
        Enum(SizeEnum, name="size_enum"),
        nullable=False,
        index=True,
    )
    animal_type = Column(
        Enum(AnimalEnum, name="animal_enum"),
        default=AnimalEnum.dog,
        nullable=False,
        index=True,
    )

    # Description (max 1000 characters)
    description = Column(
        Text,
        CheckConstraint("char_length(description) <= 1000", name="description_length_check"),
        nullable=True,
    )

    # Location (PostGIS Geography, SRID 4326 = WGS84)
    location = Column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True,
    )
    location_name = Column(String(200), nullable=True)

    # Dates
    sighting_date = Column(Date, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=datetime.utcnow,
        nullable=True,
    )

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Content moderation fields
    pending_approval = Column(Boolean, default=False, nullable=False, index=True)
    moderation_reason = Column(String(500), nullable=True)
    moderation_date = Column(DateTime(timezone=True), nullable=True)
    validation_service = Column(String(50), nullable=True)  # "cloudflare_ai", "python_nsfw", "text_ai", etc.

    # Optional contact
    contact_method = Column(String(200), nullable=True)

    # CLIP embedding (512 dimensions)
    embedding = Column(Vector(512), nullable=True)

    # User reference (optional, will be implemented later)
    # user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    def __repr__(self):
        return f"<Post {self.id} - {self.animal_type.value} at {self.location_name}>"
