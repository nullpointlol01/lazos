"""
Post Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from uuid import UUID
from typing import Optional

from app.models.post import SexEnum, SizeEnum, AnimalEnum


class PostBase(BaseModel):
    """Base schema with common post fields"""
    sex: SexEnum = SexEnum.unknown
    size: SizeEnum
    animal_type: AnimalEnum = AnimalEnum.dog
    description: Optional[str] = Field(None, max_length=1000)
    sighting_date: date


class PostCreate(PostBase):
    """
    Schema for creating a new post
    Note: image upload will be handled separately as multipart/form-data
    """
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in WGS84")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in WGS84")
    contact_method: Optional[str] = Field(None, max_length=200)
    location_name: Optional[str] = Field(None, max_length=200)


class PostUpdate(BaseModel):
    """Schema for updating an existing post"""
    sex: Optional[SexEnum] = None
    size: Optional[SizeEnum] = None
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class PostResponse(PostBase):
    """
    Schema for post responses
    """
    id: UUID
    image_url: str
    thumbnail_url: str
    location_name: Optional[str] = None
    latitude: float
    longitude: float
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    """Schema for paginated list of posts"""
    data: list[PostResponse]
    meta: dict
    available_filters: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)
