from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.post import AnimalEnum


class AlertCreate(BaseModel):
    """Schema for creating a new alert."""
    description: str = Field(..., max_length=1000, description="Descripción del avistamiento")
    animal_type: AnimalEnum = Field(..., description="Tipo de animal")
    direction: Optional[str] = Field(None, max_length=200, description="Dirección/rumbo del animal")
    latitude: float = Field(..., ge=-90, le=90, description="Latitud")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud")
    location_name: Optional[str] = Field(None, max_length=200, description="Nombre del lugar")


class AlertResponse(BaseModel):
    """Schema for alert response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    animal_type: AnimalEnum
    direction: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    created_at: datetime
    is_active: bool


class AlertListResponse(BaseModel):
    """Schema for paginated alert list response."""
    data: list[AlertResponse]
    meta: dict
