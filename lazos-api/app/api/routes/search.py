"""
Unified search API endpoints for posts and alerts
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, String
from typing import Optional, Literal

from app.database import get_db
from app.models.post import Post
from app.models.alert import Alert
from app.schemas.search import SearchResponse, PostSearchResult, AlertSearchResult

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query text"),
    type: Literal["posts", "alerts", "all"] = Query("all", description="Type of results to return"),
    lat: Optional[float] = Query(None, description="Latitude for proximity search"),
    lon: Optional[float] = Query(None, description="Longitude for proximity search"),
    radius_km: Optional[float] = Query(None, ge=0, le=100, description="Search radius in kilometers"),
    db: Session = Depends(get_db),
):
    """
    Unified search across posts and alerts.

    - **q**: Search text (searches in description, location_name, animal_type)
    - **type**: Filter by type (posts, alerts, or all)
    - **lat, lon, radius_km**: Optional proximity search parameters

    Returns posts and alerts matching the search criteria, optionally ordered by distance.
    """
    posts = []
    alerts = []

    # Normalize search query
    search_term = f"%{q.lower()}%"

    # Map Spanish animal types to English enum values for search
    animal_type_mapping = {
        "perro": "dog",
        "gato": "cat",
        "otro": "other"
    }

    # Check if search term matches a Spanish animal type
    search_lower = q.lower().strip()
    mapped_animal_type = animal_type_mapping.get(search_lower)

    # Determine if proximity search is enabled
    proximity_search = lat is not None and lon is not None

    # Search posts
    if type in ["posts", "all"]:
        # Build search conditions
        search_conditions = [
            func.lower(Post.description).like(search_term),
            func.lower(Post.location_name).like(search_term),
            func.lower(cast(Post.animal_type, String)).like(search_term),
        ]

        # If search term is a Spanish animal type, add exact match condition
        if mapped_animal_type:
            search_conditions.append(cast(Post.animal_type, String) == mapped_animal_type)

        post_query = db.query(Post).filter(
            Post.is_active == True,
            or_(*search_conditions)
        )

        # Add proximity filter if coordinates provided
        if proximity_search and radius_km:
            # ST_DWithin uses meters, so convert km to m
            post_query = post_query.filter(
                func.ST_DWithin(
                    Post.location,
                    func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                    radius_km * 1000  # Convert km to meters
                )
            )

        # Get results
        post_results = post_query.all()

        # Add distance if proximity search
        if proximity_search:
            posts = []
            for post in post_results:
                # Calculate distance in km
                distance = db.query(
                    func.ST_Distance(
                        post.location,
                        func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
                    ) / 1000.0  # Convert meters to km
                ).scalar()

                # Create result with distance
                post_dict = {
                    "id": post.id,
                    "thumbnail_url": post.thumbnail_url,
                    "sex": post.sex,
                    "size": post.size,
                    "animal_type": post.animal_type,
                    "description": post.description,
                    "location_name": post.location_name,
                    "sighting_date": post.sighting_date,
                    "created_at": post.created_at,
                    "distance_km": round(distance, 2) if distance else None
                }
                posts.append(PostSearchResult(**post_dict))

            # Sort by distance
            posts.sort(key=lambda x: x.distance_km if x.distance_km is not None else float('inf'))
        else:
            posts = [PostSearchResult.model_validate(post) for post in post_results]

    # Search alerts
    if type in ["alerts", "all"]:
        # Build search conditions
        search_conditions_alert = [
            func.lower(Alert.description).like(search_term),
            func.lower(Alert.location_name).like(search_term),
            func.lower(Alert.direction).like(search_term),
            func.lower(cast(Alert.animal_type, String)).like(search_term),
        ]

        # If search term is a Spanish animal type, add exact match condition
        if mapped_animal_type:
            search_conditions_alert.append(cast(Alert.animal_type, String) == mapped_animal_type)

        alert_query = db.query(Alert).filter(
            Alert.is_active == True,
            or_(*search_conditions_alert)
        )

        # Add proximity filter if coordinates provided
        if proximity_search and radius_km:
            alert_query = alert_query.filter(
                func.ST_DWithin(
                    Alert.location,
                    func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                    radius_km * 1000
                )
            )

        # Get results
        alert_results = alert_query.all()

        # Add distance if proximity search
        if proximity_search:
            alerts = []
            for alert in alert_results:
                # Calculate distance in km
                distance = db.query(
                    func.ST_Distance(
                        alert.location,
                        func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
                    ) / 1000.0
                ).scalar()

                # Create result with distance
                alert_dict = {
                    "id": alert.id,
                    "description": alert.description,
                    "animal_type": alert.animal_type,
                    "direction": alert.direction,
                    "location_name": alert.location_name,
                    "created_at": alert.created_at,
                    "distance_km": round(distance, 2) if distance else None
                }
                alerts.append(AlertSearchResult(**alert_dict))

            # Sort by distance
            alerts.sort(key=lambda x: x.distance_km if x.distance_km is not None else float('inf'))
        else:
            alerts = [AlertSearchResult.model_validate(alert) for alert in alert_results]

    return SearchResponse(
        posts=posts,
        alerts=alerts,
        total_posts=len(posts),
        total_alerts=len(alerts)
    )
