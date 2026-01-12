from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography

from app.database import Base
from app.models.post import AnimalEnum


class Alert(Base):
    """
    Alert model for quick sighting notifications.

    Simple alerts without images to quickly notify about animal sightings.
    """
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    description = Column(Text, nullable=False)
    animal_type = Column(Enum(AnimalEnum, name="animal_type_enum"), nullable=False)
    direction = Column(String(200), nullable=True)  # e.g., "hacia el sur", "entrando al parque"
    location = Column(Geography('POINT', srid=4326), nullable=False)
    location_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = Column(Boolean, server_default="true", nullable=False)

    def __repr__(self):
        return f"<Alert {self.id} - {self.animal_type} at {self.location_name}>"
