"""
Search Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, date
from uuid import UUID

from app.models.post import SexEnum, SizeEnum, AnimalEnum


class PostSearchResult(BaseModel):
    """Schema for post search results"""
    id: UUID
    thumbnail_url: str
    sex: SexEnum
    size: SizeEnum
    animal_type: AnimalEnum
    description: Optional[str] = None
    location_name: Optional[str] = None
    sighting_date: date
    created_at: datetime
    distance_km: Optional[float] = None

    model_config = {"from_attributes": True}


class AlertSearchResult(BaseModel):
    """Schema for alert search results"""
    id: UUID
    description: str
    animal_type: AnimalEnum
    direction: Optional[str] = None
    location_name: Optional[str] = None
    created_at: datetime
    distance_km: Optional[float] = None

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    """Schema for unified search response"""
    posts: List[PostSearchResult]
    alerts: List[AlertSearchResult]
    total_posts: int
    total_alerts: int
