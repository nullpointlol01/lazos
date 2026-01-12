# LAZOS API - Backend

Backend API de LAZOS, plataforma colaborativa para reportar avistamientos de mascotas en vía pública.

## 🚀 Stack Tecnológico

- **Python 3.11+** - Lenguaje
- **FastAPI 0.104+** - Framework web asíncrono
- **SQLAlchemy 2.0** - ORM
- **Pydantic v2** - Validación de datos
- **PostgreSQL 15+** - Base de datos
  - **PostGIS** - Extensión geoespacial
  - **pgvector** - Extensión para embeddings
- **Alembic** - Migraciones de base de datos
- **Cloudflare R2** - Storage de imágenes
- **Uvicorn** - ASGI server

## 📦 Instalación

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus credenciales
# (DATABASE_URL, R2_*, ADMIN_PASSWORD, etc.)

# Ejecutar migraciones
alembic upgrade head
```

## 🏃 Ejecución

```bash
# Desarrollo (con auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**URLs:**
- API: http://localhost:8000
- Docs interactivos (Swagger): http://localhost:8000/docs
- Docs alternativos (ReDoc): http://localhost:8000/redoc

## 📁 Estructura del Proyecto

```
lazos-api/
├── app/
│   ├── api/             # Endpoints de la API
│   │   └── routes/
│   │       ├── posts.py      # CRUD de posts
│   │       ├── alerts.py     # Avisos rápidos
│   │       ├── map.py        # Datos para mapa
│   │       ├── search.py     # Búsqueda unificada
│   │       ├── reports.py    # Sistema de reportes
│   │       └── admin.py      # Panel de administración
│   ├── models/          # Modelos SQLAlchemy
│   │   ├── post.py
│   │   ├── alert.py
│   │   ├── report.py
│   │   └── user.py
│   ├── schemas/         # Esquemas Pydantic
│   │   ├── post.py
│   │   ├── alert.py
│   │   └── report.py
│   ├── services/        # Lógica de negocio
│   │   └── image_processing.py
│   ├── config.py        # Configuración de la app
│   ├── database.py      # Configuración de DB
│   └── main.py          # Entry point de FastAPI
├── migrations/          # Migraciones de Alembic
│   ├── versions/        # Archivos de migración
│   │   ├── 20251225_0000-initial_schema.py
│   │   ├── 20251226_1359-add_alerts_table.py
│   │   ├── 20251227_1917-add_reports_table.py
│   │   ├── 20251228_0000-add_alert_id_to_reports.py
│   │   └── 20251231_0000-add_moderation_to_posts.py
│   ├── env.py           # Configuración de Alembic
│   └── script.py.mako   # Template de migraciones
├── scripts/             # Scripts de utilidad
│   └── sync_database.sql  # Script SQL de sincronización
├── .env.example         # Variables de entorno de ejemplo
├── requirements.txt     # Dependencias Python
└── alembic.ini          # Configuración de Alembic
```

## ⚙️ Variables de Entorno

Crear archivo `.env` en la raíz de `lazos-api/`:

```bash
# Database (PostgreSQL con PostGIS y pgvector)
DATABASE_URL=postgresql://user:password@localhost:5432/lazos

# CORS Origins (separados por coma)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Cloudflare R2 Storage
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_access_key_here
R2_SECRET_KEY=your_secret_key_here
R2_BUCKET=lazos-images
R2_PUBLIC_URL=https://pub-XXXXX.r2.dev  # ⚠️ CRÍTICO para mostrar imágenes

# JWT Auth (opcional, no implementado aún)
JWT_SECRET=change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Admin & Moderation
ADMIN_PASSWORD=change-this-secure-password
MODERATOR_EMAIL=admin@example.com

# Email (SMTP, opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-google-app-password
```

## 🗄️ Base de Datos

### Requisitos

PostgreSQL 15+ con las siguientes extensiones:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;        -- Geolocalización
CREATE EXTENSION IF NOT EXISTS vector;         -- Embeddings CLIP
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- Búsqueda fuzzy (opcional)
```

### Migraciones con Alembic

```bash
# Ver historial de migraciones
alembic history

# Ver migraciones pendientes
alembic current

# Aplicar todas las migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Crear nueva migración (autogenerar)
alembic revision --autogenerate -m "descripción del cambio"

# Crear migración vacía (manual)
alembic revision -m "descripción"
```

### Sincronización Manual (Supabase)

Si usás Supabase y las migraciones de Alembic no se aplicaron automáticamente:

```bash
# Ejecutar script SQL en Supabase Dashboard → SQL Editor
cat scripts/sync_database.sql
```

## 📡 API Endpoints

### Posts

```http
GET    /api/v1/posts              # Listar posts (con filtros)
POST   /api/v1/posts              # Crear post
GET    /api/v1/posts/{id}         # Obtener post por ID
PATCH  /api/v1/posts/{id}         # Actualizar post
DELETE /api/v1/posts/{id}         # Eliminar post (soft delete)
```

### Alerts

```http
GET    /api/v1/alerts             # Listar avisos
POST   /api/v1/alerts             # Crear aviso
GET    /api/v1/alerts/{id}        # Obtener aviso por ID
DELETE /api/v1/alerts/{id}        # Eliminar aviso
```

### Map

```http
GET    /api/v1/map/posts          # Posts para mapa (optimizado)
GET    /api/v1/map/alerts         # Alertas para mapa
```

### Search

```http
GET    /api/v1/search             # Búsqueda unificada (posts + alerts)
GET    /api/v1/search/similar     # Búsqueda por similitud (CLIP)
```

### Reports

```http
POST   /api/v1/reports            # Crear reporte
GET    /api/v1/reports            # Listar reportes (admin)
```

### Admin

```http
GET    /api/v1/admin/stats        # Estadísticas (requiere password)
GET    /api/v1/admin/pending      # Posts pendientes de aprobación
POST   /api/v1/admin/pending/{id}/approve  # Aprobar post
POST   /api/v1/admin/pending/{id}/reject   # Rechazar post
```

**Autenticación Admin:**
- Header: `X-Admin-Password: tu-password`

Ver documentación completa en: http://localhost:8000/docs

## 🖼️ Storage de Imágenes

### Cloudflare R2

El proyecto usa Cloudflare R2 para almacenar imágenes. Configuración:

1. **Crear bucket** en Cloudflare Dashboard → R2
2. **Crear API Token** con permisos de lectura/escritura
3. **Habilitar acceso público**:
   - R2 → Settings → Public Access
   - Enable "R2.dev subdomain"
4. **Configurar .env**:
   ```bash
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

### Procesamiento de Imágenes

Las imágenes se procesan automáticamente:
- Corrección de orientación EXIF
- Redimensionamiento (max 1920x1920)
- Generación de thumbnails (400x400)
- Compresión JPEG (quality=85)

## 🛡️ Sistema de Moderación

### Campos en tabla `posts`:

```python
pending_approval: bool = False  # Requiere aprobación de moderador
moderation_reason: str = None   # Razón de moderación
moderation_date: datetime = None  # Fecha de revisión
```

### Workflow:

1. Post se crea con `pending_approval = True` (si fue flagueado por IA)
2. No aparece en queries públicas (`WHERE pending_approval = false`)
3. Moderador revisa en `/admin/pending`
4. Aprueba → `pending_approval = false` (se hace visible)
5. Rechaza → `is_active = false` (se oculta permanentemente)

## 🐛 Troubleshooting

### Error: "column posts.pending_approval does not exist"

Ejecutar migraciones:

```bash
alembic upgrade head
```

O aplicar manualmente (Supabase):

```bash
cat scripts/sync_database.sql
# Ejecutar en Supabase SQL Editor
```

### Imágenes no se muestran

Verificar que `R2_PUBLIC_URL` esté configurado y el bucket sea público.

### CORS errors en frontend

Agregar el origen del frontend a `CORS_ORIGINS`:

```bash
CORS_ORIGINS=http://localhost:5173,https://tu-dominio.com
```

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
pytest

# Con coverage
pytest --cov=app --cov-report=html
```

## 🌐 Deployment

### Railway (Recomendado)

```yaml
# railway.toml (opcional)
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

Variables de entorno:
- Configurar todas las variables de `.env.example`
- Railway detecta automáticamente `requirements.txt`

### Docker

```bash
# Build
docker build -t lazos-api .

# Run
docker run -p 8000:8000 --env-file .env lazos-api
```

## 📚 Recursos

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [PostGIS](https://postgis.net/)
- [pgvector](https://github.com/pgvector/pgvector)

## 🤝 Contribuir

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) en la raíz del proyecto.

---

**Parte de [LAZOS](../README.md)**
