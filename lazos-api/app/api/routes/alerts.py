"""
Alerts API routes
"""
import logging
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.post import AnimalEnum
from app.schemas.alert import AlertCreate, AlertResponse, AlertListResponse
from app.services.text_validation_ai import get_text_validation_ai

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/alerts", response_model=AlertListResponse)
def get_alerts(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    animal_type: Optional[AnimalEnum] = Query(None, description="Filter by animal type"),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of alerts with optional filters.

    - **page**: Page number (starts at 1)
    - **limit**: Number of items per page (max 100)
    - **animal_type**: Filter by animal type (dog/cat/other)
    """
    # Build filters
    filters = [Alert.is_active == True]

    if animal_type:
        filters.append(Alert.animal_type == animal_type)

    # Count total items
    count_stmt = select(func.count()).select_from(Alert).where(and_(*filters))
    total = db.execute(count_stmt).scalar_one()

    # Build query with sorting (newest first)
    query = select(Alert).where(and_(*filters)).order_by(Alert.created_at.desc())

    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    # Execute query
    result = db.execute(query)
    alerts = result.scalars().all()

    # Convert alerts to response format
    alerts_response = []
    for alert in alerts:
        # Extract lat/lng from geography
        db_geom = db.scalar(func.ST_AsText(alert.location))
        # Parse POINT(lng lat) format
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        alert_dict = {
            "id": alert.id,
            "description": alert.description,
            "animal_type": alert.animal_type,
            "direction": alert.direction,
            "latitude": latitude,
            "longitude": longitude,
            "location_name": alert.location_name,
            "created_at": alert.created_at,
            "is_active": alert.is_active,
        }
        alerts_response.append(AlertResponse(**alert_dict))

    # Calculate total pages
    total_pages = math.ceil(total / limit) if total > 0 else 0

    return AlertListResponse(
        data=alerts_response,
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    )


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a specific alert by ID.

    - **alert_id**: UUID of the alert
    """
    stmt = select(Alert).where(Alert.id == alert_id)
    result = db.execute(stmt)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with id {alert_id} not found"
        )

    # Extract lat/lng from geography
    db_geom = db.scalar(func.ST_AsText(alert.location))
    coords = db_geom.replace('POINT(', '').replace(')', '').split()
    longitude = float(coords[0])
    latitude = float(coords[1])

    alert_dict = {
        "id": alert.id,
        "description": alert.description,
        "animal_type": alert.animal_type,
        "direction": alert.direction,
        "latitude": latitude,
        "longitude": longitude,
        "location_name": alert.location_name,
        "created_at": alert.created_at,
        "is_active": alert.is_active,
    }

    return AlertResponse(**alert_dict)


@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new alert (quick sighting notification without image).

    **Required fields:**
    - **description**: Description of the sighting
    - **animal_type**: Type of animal (dog/cat/other)
    - **latitude**: Latitude (-90 to 90)
    - **longitude**: Longitude (-180 to 180)

    **Optional fields:**
    - **direction**: Direction the animal was heading (e.g., "hacia el sur")
    - **location_name**: Name of the location
    """
    try:
        logger.info("📥 [BACKEND] Creating new alert...")
        logger.info(f"📍 [BACKEND] Location: ({alert_data.latitude}, {alert_data.longitude})")

        # Validar descripción con IA
        if alert_data.description and len(alert_data.description.strip()) >= 10:
            validator = get_text_validation_ai()
            validation = await validator.validate_sighting_text(alert_data.description)
            text_is_valid = validation["is_valid"]
            logger.info(f"[AI Validation Alert] valid={text_is_valid}, reason={validation['reason']}")

            if not text_is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La descripción no parece corresponder a un avistamiento válido"
                )

        # Create point geographic
        point_wkt = f'POINT({alert_data.longitude} {alert_data.latitude})'

        # Create alert in DB
        new_alert = Alert(
            description=alert_data.description,
            animal_type=alert_data.animal_type,
            direction=alert_data.direction,
            location=point_wkt,
            location_name=alert_data.location_name,
        )

        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        logger.info(f"✅ [BACKEND] Alert created successfully: {new_alert.id}")

        # Extract lat/lng for response
        db_geom = db.scalar(func.ST_AsText(new_alert.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        resp_longitude = float(coords[0])
        resp_latitude = float(coords[1])

        alert_dict = {
            "id": new_alert.id,
            "description": new_alert.description,
            "animal_type": new_alert.animal_type,
            "direction": new_alert.direction,
            "latitude": resp_latitude,
            "longitude": resp_longitude,
            "location_name": new_alert.location_name,
            "created_at": new_alert.created_at,
            "is_active": new_alert.is_active,
        }

        return AlertResponse(**alert_dict)

    except Exception as e:
        db.rollback()
        logger.error(f"❌ [BACKEND] Error creating alert: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating alert: {str(e)}"
        )


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Soft delete an alert (sets is_active to False).

    - **alert_id**: UUID of the alert to delete
    """
    stmt = select(Alert).where(Alert.id == alert_id)
    result = db.execute(stmt)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with id {alert_id} not found"
        )

    alert.is_active = False
    db.commit()

    logger.info(f"🗑️ [BACKEND] Alert soft-deleted: {alert_id}")

    return None
