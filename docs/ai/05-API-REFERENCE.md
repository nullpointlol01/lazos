## 5. API BACKEND

### 5.1 Endpoints

#### Posts

```yaml
GET /api/v1/posts
  Descripción: Listar posts con filtros dinámicos y paginación
  Query params:
    - page: int (default 1, ge 1)
    - limit: int (default 20, ge 1, le 100)
    - provincia: str (ej: "Buenos Aires")
    - localidad: str (ej: "La Plata")
    - animal_type: str (dog|cat|other)
    - size: str (small|medium|large)
    - sex: str (male|female|unknown)
    - date_from: date (YYYY-MM-DD)
    - date_to: date (YYYY-MM-DD)
    - sort: str (created_at|sighting_date, default created_at)
    - order: str (asc|desc, default desc)
  Response: 200
    {
      "data": [PostResponse],
      "meta": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "total_pages": 8
      },
      "available_filters": {
        "provincias": [
          { "value": "Buenos Aires", "count": 45 },
          { "value": "CABA", "count": 30 }
        ],
        "localidades": [
          { "value": "La Plata", "count": 15, "provincia": "Buenos Aires" }
        ],
        "animal_types": [
          { "value": "dog", "label": "Perros", "count": 80 },
          { "value": "cat", "label": "Gatos", "count": 50 }
        ],
        "sizes": [...],
        "sexes": [...]
      }
    }

GET /api/v1/posts/{id}
  Descripción: Obtener detalle de un post con todas sus imágenes
  Response: 200 PostResponse | 404
    {
      "id": "uuid",
      "sex": "male",
      "size": "medium",
      "animal_type": "dog",
      "description": "...",
      "location_name": "Av. 7 1234, La Plata, Buenos Aires",
      "latitude": -34.921,
      "longitude": -57.954,
      "sighting_date": "2025-12-29",
      "created_at": "2025-12-29T10:30:00",
      "is_active": true,
      "contact_method": "email@example.com",
      "images": [
        {
          "id": "uuid",
          "image_url": "https://pub-xxx.r2.dev/posts/uuid1.jpg",
          "thumbnail_url": "https://pub-xxx.r2.dev/posts/uuid1_thumb.jpg",
          "display_order": 0,
          "is_primary": true
        },
        {
          "id": "uuid",
          "image_url": "https://pub-xxx.r2.dev/posts/uuid2.jpg",
          "thumbnail_url": "https://pub-xxx.r2.dev/posts/uuid2_thumb.jpg",
          "display_order": 1,
          "is_primary": false
        }
      ]
    }

POST /api/v1/posts
  Descripción: Crear post con 1-3 imágenes
  Body (multipart/form-data):
    - images: File[] (1-3 archivos, max 10MB c/u, JPG/PNG/WEBP)
    - latitude: float (required, -90 to 90)
    - longitude: float (required, -180 to 180)
    - size: str (required, small|medium|large)
    - animal_type: str (optional, default dog)
    - sex: str (optional, default unknown)
    - sighting_date: date (required, YYYY-MM-DD)
    - description: str (optional, max 1000 chars)
    - location_name: str (optional, max 200)
    - contact_method: str (optional, max 200)
  Response: 201 PostResponse

PATCH /api/v1/posts/{id}
  Descripción: Actualizar post (sin auth por ahora)
  Body (JSON):
    - sex: str
    - size: str
    - description: str
    - is_active: bool
  Response: 200 PostResponse | 404

DELETE /api/v1/posts/{id}
  Descripción: Soft delete (is_active=False)
  Response: 204 | 404
```

#### Alerts

```yaml
GET /api/v1/alerts
  Descripción: Listar avisos rápidos activos
  Query params: (similares a /posts)
    - page, limit, animal_type, date_from, date_to, sort, order
  Response: 200
    {
      "data": [AlertResponse],
      "meta": { ... }
    }

GET /api/v1/alerts/{id}
  Response: 200 AlertResponse | 404

POST /api/v1/alerts
  Body (JSON):
    - description: str (required, max 1000)
    - animal_type: str (optional, default dog)
    - direction: str (optional, max 200)
    - latitude: float (required)
    - longitude: float (required)
    - location_name: str (optional)
  Response: 201 AlertResponse

DELETE /api/v1/alerts/{id}
  Response: 204 | 404
```

#### Búsqueda

```yaml
GET /api/v1/search
  Descripción: Búsqueda unificada en posts y alerts
  Query params:
    - q: str (búsqueda en description, location_name, animal_type)
    - type: str (posts|alerts|all, default all)
    - lat: float (para búsqueda por proximidad)
    - lon: float (para búsqueda por proximidad)
    - radius_km: float (default 10)
    - limit: int (default 20, max 100)
  Response: 200
    {
      "results": [
        {
          "type": "post",
          "id": "uuid",
          "title": "Perro mediano marrón",
          "snippet": "...texto con <mark>término</mark> destacado...",
          "location_name": "...",
          "thumbnail_url": "...",
          "created_at": "...",
          "distance_km": 2.5  // si lat/lon provisto
        },
        {
          "type": "alert",
          "id": "uuid",
          ...
        }
      ],
      "total": 15
    }

POST /api/v1/search/similar
  Descripción: Búsqueda por similitud de imagen con CLIP
  Body (multipart/form-data):
    - image: File (required)
    - limit: int (default 10, max 50)
    - min_similarity: float (0-1, default 0.7)
  Response: 200
    {
      "data": [
        {
          "post": PostResponse,
          "similarity": 0.89
        }
      ]
    }
  NOTA: Requiere embeddings generados (pendiente)
```

#### Mapa

```yaml
GET /api/v1/map/points/unified
  Descripción: Obtener puntos de posts y alerts para mapa
  Query params:
    - sw_lat, sw_lng, ne_lat, ne_lng: float (bounds del mapa)
    - animal_type: str (filtro opcional)
    - date_from, date_to: date (filtros opcionales)
    - limit: int (default 500, max 2000)
  Response: 200
    {
      "data": [
        {
          "type": "post",
          "id": "uuid",
          "latitude": -34.603,
          "longitude": -58.381,
          "thumbnail_url": "...",
          "animal_type": "dog",
          "size": "medium",
          "location_name": "..."
        },
        {
          "type": "alert",
          "id": "uuid",
          ...
        }
      ],
      "count": 150
    }
```

#### Reportes

```yaml
POST /api/v1/reports
  Descripción: Reportar un post o alert
  Body (JSON):
    - post_id: str (uuid, optional)
    - alert_id: str (uuid, optional)
    - reason: str (required, not_animal|inappropriate|spam|other)
    - description: str (optional, max 1000)
  Response: 201 ReportResponse
  Nota: Guarda reporter_ip automáticamente

GET /api/v1/admin/reports
  Descripción: Listar reportes pendientes (requiere autenticación)
  Headers:
    - X-Admin-Password: str (required)
  Response: 200
    {
      "data": [
        {
          "id": "uuid",
          "post_id": "uuid",
          "alert_id": null,
          "reason": "spam",
          "description": "...",
          "reporter_ip": "1.2.3.4",
          "created_at": "...",
          "resolved": false,
          "post_data": {  // si post_id
            "id": "uuid",
            "thumbnail_url": "...",
            "description": "...",
            ...
          },
          "total_reports": 3  // total de reportes para este post/alert
        }
      ]
    }

POST /api/v1/admin/reports/{id}/resolve
  Headers: X-Admin-Password
  Response: 200 ReportResponse

DELETE /api/v1/admin/posts/{id}
  Descripción: Eliminar post (soft delete is_active=False)
  Headers: X-Admin-Password
  Response: 204

GET /api/v1/admin/stats
  Headers: X-Admin-Password
  Response: 200
    {
      "total_posts": 150,
      "active_posts": 145,
      "total_alerts": 50,
      "active_alerts": 48,
      "pending_reports": 5
    }
```

### 5.2 Schemas Pydantic

**Post:**
```python
class PostResponse(BaseModel):
    id: UUID
    sex: SexEnum  # male/female/unknown
    size: SizeEnum  # small/medium/large
    animal_type: AnimalEnum  # dog/cat/other
    description: str | None
    location_name: str | None
    latitude: float
    longitude: float
    sighting_date: date
    created_at: datetime
    is_active: bool
    contact_method: str | None
    images: list[PostImageResponse]  # array de imágenes

class PostImageResponse(BaseModel):
    id: UUID
    image_url: str
    thumbnail_url: str
    display_order: int
    is_primary: bool
```

**Alert:**
```python
class AlertResponse(BaseModel):
    id: UUID
    description: str
    animal_type: AnimalEnum
    direction: str | None
    location_name: str | None
    latitude: float
    longitude: float
    created_at: datetime
    is_active: bool
```

**Report:**
```python
class ReportCreate(BaseModel):
    post_id: UUID | None = None
    alert_id: UUID | None = None
    reason: ReportReasonEnum  # not_animal/inappropriate/spam/other
    description: str | None = Field(None, max_length=1000)

class ReportResponse(BaseModel):
    id: UUID
    post_id: UUID | None
    alert_id: UUID | None
    reason: ReportReasonEnum
    description: str | None
    reporter_ip: str
    created_at: datetime
    resolved: bool
```

---

