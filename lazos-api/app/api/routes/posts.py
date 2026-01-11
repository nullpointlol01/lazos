"""
Posts API routes - CRUD operations for pet sighting posts
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from typing import Optional, List
from uuid import UUID
from datetime import date
import math
import logging

from app.api.deps import get_db
from app.models.post import Post, SexEnum, SizeEnum, AnimalEnum
from app.models.post_image import PostImage
from app.schemas.post import PostCreate, PostResponse, PostUpdate, PostListResponse
from app.schemas.common import PaginationMeta
from app.services.image import ImageService
from app.services.storage import get_storage_service
from app.services.text_validation_ai import get_text_validation_ai
from app.services.hybrid_image_validator import get_hybrid_validator
from geoalchemy2.elements import WKTElement

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/posts", response_model=PostListResponse)
async def list_posts(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    animal_type: Optional[AnimalEnum] = Query(None, description="Filter by animal type"),
    size: Optional[SizeEnum] = Query(None, description="Filter by size"),
    sex: Optional[SexEnum] = Query(None, description="Filter by sex"),
    date_from: Optional[date] = Query(None, description="Filter by sighting date (from)"),
    date_to: Optional[date] = Query(None, description="Filter by sighting date (to)"),
    provincia: Optional[str] = Query(None, description="Filter by provincia"),
    localidad: Optional[str] = Query(None, description="Filter by localidad"),
    sort: str = Query("sighting_date", description="Sort field (created_at or sighting_date)"),
    order: str = Query("desc", description="Sort order (asc or desc)"),
    db: Session = Depends(get_db),
):
    """
    List all active posts with pagination and filters.

    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **animal_type**: Filter by animal type (dog/cat/other)
    - **size**: Filter by size (small/medium/large)
    - **sex**: Filter by sex (male/female/unknown)
    - **date_from**: Filter by sighting date from (YYYY-MM-DD)
    - **date_to**: Filter by sighting date to (YYYY-MM-DD)
    - **sort**: Sort by field (created_at or sighting_date)
    - **order**: Sort order (asc or desc)
    """
    # Build filters - only show active posts that are not pending approval
    filters = [Post.is_active == True, Post.pending_approval == False]

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
    if provincia:
        # location_name format: "street number, city, province"
        filters.append(Post.location_name.like(f'%, {provincia}'))
    if localidad:
        # location_name format: "street number, city, province"
        # Match localidad followed by provincia (requires provincia filter too)
        if provincia:
            filters.append(Post.location_name.like(f'%, {localidad}, {provincia}'))
        else:
            filters.append(Post.location_name.like(f'%, {localidad},%'))

    # Count total items
    count_stmt = select(func.count()).select_from(Post).where(and_(*filters))
    total = db.execute(count_stmt).scalar_one()

    # Build query with sorting
    query = select(Post).where(and_(*filters))

    # Apply sorting
    if sort == "sighting_date":
        sort_column = Post.sighting_date
    else:
        sort_column = Post.created_at

    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    # Execute query
    result = db.execute(query)
    posts = result.scalars().all()

    # Convert posts to response format
    posts_response = []
    for post in posts:
        # Extract lat/lng from geography
        db_geom = db.scalar(func.ST_AsText(post.location))
        # Parse POINT(lng lat) format
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        # Count images for this post
        image_count = db.query(PostImage).filter(PostImage.post_id == post.id).count()

        post_dict = {
            "id": post.id,
            "image_url": post.image_url,
            "thumbnail_url": post.thumbnail_url,
            "sex": post.sex,
            "size": post.size,
            "animal_type": post.animal_type,
            "description": post.description,
            "location_name": post.location_name,
            "latitude": latitude,
            "longitude": longitude,
            "sighting_date": post.sighting_date,
            "created_at": post.created_at,
            "is_active": post.is_active,
            "image_count": image_count,
        }
        posts_response.append(PostResponse(**post_dict))

    # Calculate total pages
    total_pages = math.ceil(total / limit) if total > 0 else 0

    # Calculate available_filters based on current filters
    available_filters = {}

    # Helper function to parse location_name
    def parse_location_parts(location_name_str):
        """Parse 'street number, city, province' -> (city, province)"""
        if not location_name_str:
            return None, None
        parts = [p.strip() for p in location_name_str.split(',')]
        if len(parts) >= 3:
            return parts[-2], parts[-1]  # city, province
        elif len(parts) == 2:
            return parts[0], parts[1]
        return None, None

    # Get distinct provincias (if not already filtered)
    if not provincia:
        # Query distinct provincias from filtered results
        distinct_query = select(Post.location_name).where(and_(*filters)).distinct()
        location_names = db.execute(distinct_query).scalars().all()

        provincia_counts = {}
        for loc_name in location_names:
            _, prov = parse_location_parts(loc_name)
            if prov:
                provincia_counts[prov] = provincia_counts.get(prov, 0) + 1

        available_filters['provincias'] = [
            {'value': prov, 'count': count}
            for prov, count in sorted(provincia_counts.items())
        ]

    # Get distinct localidades (if provincia selected but not localidad)
    if provincia and not localidad:
        distinct_query = select(Post.location_name).where(and_(*filters)).distinct()
        location_names = db.execute(distinct_query).scalars().all()

        localidad_counts = {}
        for loc_name in location_names:
            city, prov = parse_location_parts(loc_name)
            if city and prov == provincia:
                localidad_counts[city] = localidad_counts.get(city, 0) + 1

        available_filters['localidades'] = [
            {'value': city, 'count': count}
            for city, count in sorted(localidad_counts.items())
        ]

    # Get counts for other filter dimensions
    # Animal types
    if not animal_type:
        type_counts = db.execute(
            select(Post.animal_type, func.count())
            .where(and_(*filters))
            .group_by(Post.animal_type)
        ).all()
        available_filters['animal_types'] = [
            {'value': t.value, 'count': c} for t, c in type_counts
        ]

    # Sizes
    if not size:
        size_counts = db.execute(
            select(Post.size, func.count())
            .where(and_(*filters))
            .group_by(Post.size)
        ).all()
        available_filters['sizes'] = [
            {'value': s.value, 'count': c} for s, c in size_counts
        ]

    # Sexes
    if not sex:
        sex_counts = db.execute(
            select(Post.sex, func.count())
            .where(and_(*filters))
            .group_by(Post.sex)
        ).all()
        available_filters['sexes'] = [
            {'value': sx.value, 'count': c} for sx, c in sex_counts
        ]

    return PostListResponse(
        data=posts_response,
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        },
        available_filters=available_filters
    )


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    images: List[UploadFile] = File(..., description="Fotos del animal (1-3 imágenes, JPG/PNG/WEBP, max 10MB c/u)"),
    latitude: float = Form(..., ge=-90, le=90, description="Latitud"),
    longitude: float = Form(..., ge=-180, le=180, description="Longitud"),
    size: SizeEnum = Form(..., description="Tamaño del animal"),
    animal_type: AnimalEnum = Form(AnimalEnum.dog, description="Tipo de animal"),
    sex: SexEnum = Form(SexEnum.unknown, description="Sexo del animal"),
    sighting_date: date = Form(..., description="Fecha del avistamiento"),
    description: Optional[str] = Form(None, max_length=1000, description="Descripción"),
    location_name: Optional[str] = Form(None, max_length=200, description="Nombre del lugar"),
    contact_method: Optional[str] = Form(None, max_length=200, description="Método de contacto"),
    pending_approval: bool = Form(False, description="Si está pendiente de aprobación de moderación"),
    db: Session = Depends(get_db),
):
    """
    Crear nueva publicación de avistamiento con múltiples imágenes.

    **Campos requeridos:**
    - **images**: 1-3 archivos de imagen (JPG, PNG, WEBP, max 10MB c/u)
    - **latitude**: Latitud (-90 a 90)
    - **longitude**: Longitud (-180 a 180)
    - **size**: Tamaño (small/medium/large)
    - **sighting_date**: Fecha del avistamiento (YYYY-MM-DD)

    **Campos opcionales:**
    - **animal_type**: Tipo (dog/cat/other), default: dog
    - **sex**: Sexo (male/female/unknown), default: unknown
    - **description**: Descripción (max 1000 chars)
    - **location_name**: Nombre del lugar
    - **contact_method**: Email, teléfono o Instagram
    - **pending_approval**: Si está pendiente de moderación (default: False)
    """
    try:
        logger.info("📥 [BACKEND] Recibiendo request para crear post...")
        logger.info(f"📸 [BACKEND] {len(images)} imágenes recibidas")

        # Validar cantidad de imágenes
        if len(images) < 1 or len(images) > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes subir entre 1 y 3 imágenes"
            )

        # FASE 1: Leer y validar formato/tamaño de todas las imágenes
        logger.info(f"📦 [BACKEND] Leyendo {len(images)} imágenes...")
        raw_images_bytes = []

        for idx, image in enumerate(images):
            logger.info(f"📸 [BACKEND] Leyendo imagen {idx + 1}: {image.filename}, {image.content_type}")

            # Leer imagen
            image_bytes = await image.read()
            logger.info(f"📦 [BACKEND] Imagen {idx + 1} leída: {len(image_bytes)} bytes")

            # Validar formato y tamaño
            ImageService.validate_image(image_bytes, max_size_mb=10)

            raw_images_bytes.append(image_bytes)

        # FASE 2: Validación híbrida de contenido (TODAS las imágenes)
        logger.info(f"🔍 [BACKEND] Iniciando validación híbrida de {len(raw_images_bytes)} imágenes...")
        hybrid_validator = get_hybrid_validator()
        validation_result = await hybrid_validator.validate_all(raw_images_bytes)

        validation_service_used = None
        validation_reason = None

        if not validation_result["is_valid"]:
            # Marcar para moderación manual
            pending_approval = True
            validation_service_used = validation_result["service"]
            validation_reason = validation_result["reason"]
            logger.warning(f"⚠️ [BACKEND] Imágenes marcadas para moderación: {validation_reason}")
        else:
            logger.info(f"✅ [BACKEND] Todas las imágenes aprobadas por validador híbrido ({validation_result['service']})")

        # FASE 3: Procesar imágenes (resize + thumbnail)
        logger.info(f"🖼️ [BACKEND] Procesando {len(raw_images_bytes)} imágenes...")
        images_data = []

        for idx, image_bytes in enumerate(raw_images_bytes):
            processed_image, thumbnail = ImageService.process_upload(image_bytes)
            logger.info(f"✅ [BACKEND] Imagen {idx + 1} procesada: {len(processed_image)} bytes, thumbnail: {len(thumbnail)} bytes")
            images_data.append((processed_image, thumbnail))

        # Subir todas las imágenes a R2
        logger.info(f"☁️ [BACKEND] Subiendo {len(images_data)} imágenes a R2...")
        storage_service = get_storage_service()
        image_urls = storage_service.upload_images(images_data)
        logger.info(f"✅ [BACKEND] {len(image_urls)} imágenes subidas a R2")

        # Primera imagen para backward compatibility en el modelo Post
        first_image_url, first_thumb_url = image_urls[0]

        # Validar texto con IA si hay descripción (solo si no fue rechazado ya por imagen)
        if description and len(description.strip()) >= 10 and not validation_service_used:
            text_validator = get_text_validation_ai()
            text_validation = await text_validator.validate_sighting_text(description)
            text_is_valid = text_validation["is_valid"]
            logger.info(f"[Text Validation] valid={text_is_valid}, reason={text_validation['reason']}")

            # Si el texto no es válido, marcar para aprobación manual
            if not text_is_valid:
                pending_approval = True
                validation_service_used = "text_ai"
                validation_reason = text_validation["reason"]
                logger.warning(f"[Text Validation] Texto marcado para revisión: {text_validation['reason']}")

        # Crear punto geográfico
        point_wkt = f'POINT({longitude} {latitude})'
        logger.info(f"📍 [BACKEND] Ubicación: {point_wkt}, {location_name}")

        # Crear post en DB
        logger.info("💾 [BACKEND] Guardando post en DB...")
        new_post = Post(
            image_url=first_image_url,
            thumbnail_url=first_thumb_url,
            sex=sex,
            size=size,
            animal_type=animal_type,
            description=description,
            location=point_wkt,
            location_name=location_name,
            sighting_date=sighting_date,
            contact_method=contact_method,
            pending_approval=pending_approval,
            moderation_reason=validation_reason if validation_service_used else None,
            validation_service=validation_service_used,
        )

        db.add(new_post)
        db.flush()  # Get post.id without committing yet

        logger.info(f"✅ [BACKEND] Post creado: {new_post.id}")

        # Crear registros de post_images para cada imagen
        logger.info(f"💾 [BACKEND] Guardando {len(image_urls)} imágenes en post_images...")
        for idx, (img_url, thumb_url) in enumerate(image_urls):
            post_image = PostImage(
                post_id=new_post.id,
                image_url=img_url,
                thumbnail_url=thumb_url,
                display_order=idx,
                is_primary=(idx == 0)
            )
            db.add(post_image)
            logger.info(f"   📷 Imagen {idx + 1}: {img_url} (primary: {idx == 0})")

        # Commit all changes
        db.commit()
        db.refresh(new_post)

        logger.info(f"✅ [BACKEND] Post con {len(image_urls)} imágenes creado exitosamente")

        # Extraer lat/lng para respuesta
        db_geom = db.scalar(func.ST_AsText(new_post.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        resp_longitude = float(coords[0])
        resp_latitude = float(coords[1])

        post_dict = {
            "id": new_post.id,
            "image_url": new_post.image_url,
            "thumbnail_url": new_post.thumbnail_url,
            "sex": new_post.sex,
            "size": new_post.size,
            "animal_type": new_post.animal_type,
            "description": new_post.description,
            "location_name": new_post.location_name,
            "latitude": resp_latitude,
            "longitude": resp_longitude,
            "sighting_date": new_post.sighting_date,
            "created_at": new_post.created_at,
            "is_active": new_post.is_active,
        }

        return PostResponse(**post_dict)

    except ValueError as e:
        # Error de validación
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Error general
        logger.error(f"Error creando post: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando la imagen: {str(e)}"
        )


@router.get("/posts/{post_id}")
async def get_post_detail(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Obtener detalles de un post específico con todas sus imágenes.

    Retorna:
    - Datos del post
    - Array de imágenes (con URLs completas y orden de visualización)
    """
    logger.info(f"📥 [BACKEND] Obteniendo detalles del post {post_id}")

    # Buscar post
    post = db.query(Post).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post {post_id} not found"
        )

    # Buscar todas las imágenes del post
    post_images = db.query(PostImage).filter(
        PostImage.post_id == post_id
    ).order_by(PostImage.display_order).all()

    logger.info(f"✅ [BACKEND] Post encontrado con {len(post_images)} imágenes")

    # Extraer lat/lng
    db_geom = db.scalar(func.ST_AsText(post.location))
    coords = db_geom.replace('POINT(', '').replace(')', '').split()
    longitude = float(coords[0])
    latitude = float(coords[1])

    # Construir respuesta
    post_dict = {
        "id": post.id,
        "image_url": post.image_url,  # Backward compatibility
        "thumbnail_url": post.thumbnail_url,  # Backward compatibility
        "sex": post.sex,
        "size": post.size,
        "animal_type": post.animal_type,
        "description": post.description,
        "location_name": post.location_name,
        "latitude": latitude,
        "longitude": longitude,
        "sighting_date": post.sighting_date,
        "created_at": post.created_at,
        "is_active": post.is_active,
        "contact_method": post.contact_method,
        "images": [
            {
                "id": str(img.id),
                "image_url": img.image_url,
                "thumbnail_url": img.thumbnail_url,
                "display_order": img.display_order,
                "is_primary": img.is_primary,
            }
            for img in post_images
        ]
    }

    return post_dict


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    post_update: PostUpdate,
    db: Session = Depends(get_db),
):
    """
    Update an existing post.

    Note: Authentication will be added later to verify ownership.

    - **post_id**: UUID of the post to update
    - **sex**: Update animal sex
    - **size**: Update animal size
    - **description**: Update description
    - **is_active**: Update active status
    """
    # Get existing post
    stmt = select(Post).where(Post.id == post_id)
    result = db.execute(stmt)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )

    # Update fields
    update_data = post_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)

    # Extract lat/lng for response
    db_geom = db.scalar(func.ST_AsText(post.location))
    coords = db_geom.replace('POINT(', '').replace(')', '').split()
    longitude = float(coords[0])
    latitude = float(coords[1])

    post_dict = {
        "id": post.id,
        "image_url": post.image_url,
        "thumbnail_url": post.thumbnail_url,
        "sex": post.sex,
        "size": post.size,
        "animal_type": post.animal_type,
        "description": post.description,
        "location_name": post.location_name,
        "latitude": latitude,
        "longitude": longitude,
        "sighting_date": post.sighting_date,
        "created_at": post.created_at,
        "is_active": post.is_active,
    }

    return PostResponse(**post_dict)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a post (soft delete by setting is_active to False).

    Note: Authentication will be added later to verify ownership.

    - **post_id**: UUID of the post to delete
    """
    # Get existing post
    stmt = select(Post).where(Post.id == post_id)
    result = db.execute(stmt)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )

    # Soft delete
    post.is_active = False
    db.commit()

    return None
