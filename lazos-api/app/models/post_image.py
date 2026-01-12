"""
PostImage model - Represents an image associated with a post
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class PostImage(Base):
    """
    PostImage model - Represents a single image for a post

    A post can have multiple images (1-3), allowing users to upload
    multiple photos of the same animal sighting.

    Fields:
    - id: Unique identifier (UUID)
    - post_id: Foreign key to posts table
    - image_url: URL to the full-size image in R2
    - thumbnail_url: URL to the thumbnail image in R2
    - display_order: Order in which to display images (0 = first)
    - is_primary: Whether this is the primary/main image
    - created_at: Timestamp when the image was uploaded
    """
    __tablename__ = "post_images"

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Foreign key to posts
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Image URLs (required)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)

    # Display metadata
    display_order = Column(Integer, nullable=False, default=0, index=True)
    is_primary = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationship back to Post (optional, uncomment if using ORM queries)
    # post = relationship("Post", back_populates="images")

    def __repr__(self):
        return f"<PostImage {self.id} - Post {self.post_id} (order: {self.display_order})>"
