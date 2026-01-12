"""
Map API routes - Endpoints for map functionality
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, text, DateTime
from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from uuid import UUID

from app.api.deps import get_db
from app.models.post import Post, SexEnum, SizeEnum, AnimalEnum
from app.models.alert import Alert

router = APIRouter()


class MapPostPoint(BaseModel):
    """Post point for map display"""
    id: UUID
    lat: float
    lon: float
    thumbnail_url: str
    animal_type: str


class MapAlertPoint(BaseModel):
    """Alert point for map display"""
    id: UUID
    lat: float
    lon: float
    animal_type: str
    description: str


class MapPoint(BaseModel):
    """Punto en el mapa con información básica (legacy)"""
    id: str
    lat: float
    lng: float
    thumbnail_url: str
    animal_type: str
    size: str


class MapPointsResponse(BaseModel):
    """Respuesta con puntos para el mapa (legacy)"""
    data: List[MapPoint]


class UnifiedMapPointsResponse(BaseModel):
    """Unified response with posts and alerts for map display"""
    posts: List[MapPostPoint]
    alerts: List[MapAlertPoint]


@router.get("/map/points", response_model=MapPointsResponse)
async def get_map_points(
    # Bounds del mapa (opcional)
    sw_lat: Optional[float] = Query(None, ge=-90, le=90, description="Southwest latitude"),
    sw_lng: Optional[float] = Query(None, ge=-180, le=180, description="Southwest longitude"),
    ne_lat: Optional[float] = Query(None, ge=-90, le=90, description="Northeast latitude"),
    ne_lng: Optional[float] = Query(None, ge=-180, le=180, description="Northeast longitude"),
    # Filtros
    animal_type: Optional[AnimalEnum] = Query(None, description="Filter by animal type"),
    size: Optional[SizeEnum] = Query(None, description="Filter by size"),
    sex: Optional[SexEnum] = Query(None, description="Filter by sex"),
    date_from: Optional[date] = Query(None, description="Filter by sighting date (from)"),
    date_to: Optional[date] = Query(None, description="Filter by sighting date (to)"),
    # Límite
    limit: int = Query(500, ge=1, le=1000, description="Max points to return"),
    db: Session = Depends(get_db),
):
    """
    Obtiene puntos para mostrar en el mapa.

    **Bounds (opcional):**
    - Si se proporcionan sw_lat, sw_lng, ne_lat, ne_lng: filtra por área visible
    - Si no se proporcionan: retorna todos los puntos activos

    **Filtros opcionales:**
    - animal_type, size, sex, date_from, date_to

    **Respuesta:**
    - Lista de puntos con: id, lat, lng, thumbnail_url, animal_type, size
    """
    # Build filters
    filters = [Post.is_active == True]

    # Filtros por bounds (si se proporcionan todos)
    if all([sw_lat is not None, sw_lng is not None, ne_lat is not None, ne_lng is not None]):
        # Crear polígono del área visible
        # PostGIS: ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid)
        filters.append(
            text(
                "ST_Within(location, ST_MakeEnvelope(:sw_lng, :sw_lat, :ne_lng, :ne_lat, 4326))"
            ).bindparams(sw_lng=sw_lng, sw_lat=sw_lat, ne_lng=ne_lng, ne_lat=ne_lat)
        )

    # Otros filtros
    if animal_type:
        filters.append(Post.animal_type == animal_type)
    if size:
        filters.append(Post.size == size)
    if sex:
        filters.append(Post.sex == sex)
    if date_from:
        filters.append(Post.sighting_date >= date_from)
    if date_to:
        filters.append(Post.sighting_date <= date_to)

    # Query: obtener posts que cumplan los filtros
    query = select(Post).where(and_(*filters)).limit(limit)
    result = db.execute(query)
    posts = result.scalars().all()

    # Convertir a MapPoint
    points = []
    for post in posts:
        # Extraer lat/lng del campo location
        db_geom = db.scalar(func.ST_AsText(post.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        points.append(MapPoint(
            id=str(post.id),
            lat=latitude,
            lng=longitude,
            thumbnail_url=post.thumbnail_url,
            animal_type=post.animal_type.value,
            size=post.size.value
        ))

    return MapPointsResponse(data=points)


@router.get("/map/points/unified", response_model=UnifiedMapPointsResponse)
async def get_unified_map_points(
    # Bounds del mapa (opcional)
    sw_lat: Optional[float] = Query(None, ge=-90, le=90, description="Southwest latitude"),
    sw_lng: Optional[float] = Query(None, ge=-180, le=180, description="Southwest longitude"),
    ne_lat: Optional[float] = Query(None, ge=-90, le=90, description="Northeast latitude"),
    ne_lng: Optional[float] = Query(None, ge=-180, le=180, description="Northeast longitude"),
    # Filtros
    animal_type: Optional[AnimalEnum] = Query(None, description="Filter by animal type"),
    date_from: Optional[date] = Query(None, description="Filter by date (from)"),
    date_to: Optional[date] = Query(None, description="Filter by date (to)"),
    # Límite
    limit: int = Query(1000, ge=1, le=2000, description="Max points to return"),
    db: Session = Depends(get_db),
):
    """
    Get unified map points including both posts and alerts.

    **Returns:**
    - posts: Array of post points with id, lat, lon, thumbnail_url, animal_type
    - alerts: Array of alert points with id, lat, lon, animal_type, description

    **Optional filters:**
    - Bounding box (sw_lat, sw_lng, ne_lat, ne_lng)
    - animal_type
    - date_from, date_to
    """
    # Build filters for posts
    post_filters = [Post.is_active == True]

    # Bounds filter
    if all([sw_lat is not None, sw_lng is not None, ne_lat is not None, ne_lng is not None]):
        post_filters.append(
            text(
                "ST_Within(location, ST_MakeEnvelope(:sw_lng, :sw_lat, :ne_lng, :ne_lat, 4326))"
            ).bindparams(sw_lng=sw_lng, sw_lat=sw_lat, ne_lng=ne_lng, ne_lat=ne_lat)
        )

    # Other filters
    if animal_type:
        post_filters.append(Post.animal_type == animal_type)
    if date_from:
        post_filters.append(Post.sighting_date >= date_from)
    if date_to:
        post_filters.append(Post.sighting_date <= date_to)

    # Query posts
    post_query = select(Post).where(and_(*post_filters)).limit(limit)
    post_results = db.execute(post_query)
    posts = post_results.scalars().all()

    # Build filters for alerts
    alert_filters = [Alert.is_active == True]

    # Bounds filter
    if all([sw_lat is not None, sw_lng is not None, ne_lat is not None, ne_lng is not None]):
        alert_filters.append(
            text(
                "ST_Within(location, ST_MakeEnvelope(:sw_lng, :sw_lat, :ne_lng, :ne_lat, 4326))"
            ).bindparams(sw_lng=sw_lng, sw_lat=sw_lat, ne_lng=ne_lng, ne_lat=ne_lat)
        )

    # Other filters
    if animal_type:
        alert_filters.append(Alert.animal_type == animal_type)
    if date_from:
        alert_filters.append(Alert.created_at >= func.cast(date_from, DateTime))
    if date_to:
        # Add one day to include the entire day
        alert_filters.append(Alert.created_at <= func.cast(date_to, DateTime))

    # Query alerts
    alert_query = select(Alert).where(and_(*alert_filters)).limit(limit)
    alert_results = db.execute(alert_query)
    alerts = alert_results.scalars().all()

    # Convert posts to MapPostPoint
    post_points = []
    for post in posts:
        # Extract lat/lon from location field
        db_geom = db.scalar(func.ST_AsText(post.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        post_points.append(MapPostPoint(
            id=post.id,
            lat=latitude,
            lon=longitude,
            thumbnail_url=post.thumbnail_url,
            animal_type=post.animal_type.value
        ))

    # Convert alerts to MapAlertPoint
    alert_points = []
    for alert in alerts:
        # Extract lat/lon from location field
        db_geom = db.scalar(func.ST_AsText(alert.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        alert_points.append(MapAlertPoint(
            id=alert.id,
            lat=latitude,
            lon=longitude,
            animal_type=alert.animal_type.value,
            description=alert.description[:100] + ('...' if len(alert.description) > 100 else '')
        ))

    return UnifiedMapPointsResponse(posts=post_points, alerts=alert_points)
