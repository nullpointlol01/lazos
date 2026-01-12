## 2. ARQUITECTURA TÉCNICA

### 2.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  Web App (PWA)                                                   │
│  - Framework: React 18 + Vite 5                                 │
│  - Styling: Tailwind CSS 3.4 + shadcn/ui                        │
│  - Router: React Router DOM 6                                   │
│  - Mapas: Leaflet 1.9.4 + React Leaflet 4.2.1                  │
│  - Icons: Lucide React                                          │
│  - Theme: Día/Noche con CSS variables                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  API REST                                                        │
│  - Framework: Python 3.11 + FastAPI 0.109                       │
│  - ORM: SQLAlchemy 2.0 + GeoAlchemy2                            │
│  - Validación: Pydantic v2                                      │
│  - Migraciones: Alembic 1.13                                    │
│  - Storage: boto3 para Cloudflare R2 (S3-compatible)            │
│  - Image Processing: Pillow 10.2                                │
│  - Email: SMTP para notificaciones                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PERSISTENCIA                                │
├─────────────────────────────────────────────────────────────────┤
│  Base de datos: PostgreSQL 15+ con extensiones:                 │
│  - PostGIS: queries geoespaciales (Geography POINT)             │
│  - pgvector: embeddings para similitud de imágenes CLIP         │
│  - uuid-ossp: generación de UUIDs                               │
│                                                                  │
│  Storage de imágenes: Cloudflare R2 (S3-compatible)             │
│  - Bucket público con R2.dev subdomain                          │
│  - Organización: /posts/{uuid}.jpg, /posts/{uuid}_thumb.jpg     │
│                                                                  │
│  Servicios externos:                                             │
│  - API Georef (INDEC Argentina): geocodificación precisa        │
│  - Nominatim (OpenStreetMap): reverse geocoding y fallback      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Directorios

```
lazos/
├── lazos-api/              # Backend FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # Entry point, CORS, routers
│   │   ├── config.py       # Pydantic Settings
│   │   ├── database.py     # SQLAlchemy engine
│   │   ├── api/
│   │   │   ├── deps.py     # Dependency injection (get_db)
│   │   │   └── routes/
│   │   │       ├── posts.py    # CRUD posts + filtros dinámicos
│   │   │       ├── alerts.py   # CRUD alerts (avisos rápidos)
│   │   │       ├── search.py   # Búsqueda unificada
│   │   │       ├── map.py      # Endpoints para mapa
│   │   │       ├── reports.py  # Sistema de reportes
│   │   │       └── admin.py    # Panel de moderación
│   │   ├── models/
│   │   │   ├── post.py         # Post + enums (Sex, Size, Animal)
│   │   │   ├── post_image.py   # PostImage (1:N con Post)
│   │   │   ├── alert.py        # Alert (avisos sin imágenes)
│   │   │   ├── report.py       # Report + ReportReasonEnum
│   │   │   └── user.py         # User (opcional, no usado)
│   │   ├── schemas/
│   │   │   ├── post.py         # PostCreate, PostResponse, etc.
│   │   │   ├── alert.py        # AlertCreate, AlertResponse, etc.
│   │   │   ├── report.py       # ReportCreate, ReportResponse
│   │   │   ├── search.py       # SearchResponse con results
│   │   │   └── common.py       # PaginationMeta, schemas compartidos
│   │   ├── services/
│   │   │   ├── storage.py      # StorageService (Cloudflare R2)
│   │   │   ├── image.py        # ImageService (resize, thumbnail, EXIF)
│   │   │   └── email.py        # EmailService (SMTP notifications)
│   │   └── utils/
│   ├── migrations/             # Alembic migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── lazos-web/              # Frontend React
│   ├── public/
│   │   └── data/
│   │       ├── provincias.json     # 24 provincias Argentina
│   │       └── localidades.json    # 3,979 localidades
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                 # Router principal
│   │   ├── index.css               # Tailwind + CSS variables
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx      # Wrapper con BottomNav
│   │   │   │   └── BottomNav.jsx   # Navegación inferior fija
│   │   │   ├── posts/
│   │   │   │   └── PostCard.jsx    # Tarjeta de post
│   │   │   ├── common/
│   │   │   │   └── FAB.jsx         # Floating Action Button
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   │   ├── button.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── textarea.jsx
│   │   │   │   ├── label.jsx
│   │   │   │   ├── select.jsx
│   │   │   │   └── card.jsx
│   │   │   ├── FilterBar.jsx       # Barra de filtros colapsable
│   │   │   └── ReportModal.jsx     # Modal para reportar contenido
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Feed principal con grilla
│   │   │   ├── Search.jsx          # Búsqueda unificada
│   │   │   ├── Map.jsx             # Mapa con Leaflet
│   │   │   ├── NewPost.jsx         # Formulario crear post (1-3 fotos)
│   │   │   ├── PostDetail.jsx      # Detalle con carousel
│   │   │   ├── Alerts.jsx          # Lista de avisos rápidos
│   │   │   ├── NewAlert.jsx        # Formulario crear aviso
│   │   │   ├── AlertDetail.jsx     # Detalle de aviso
│   │   │   └── Admin.jsx           # Panel de moderación
│   │   ├── hooks/
│   │   │   ├── usePosts.js         # Fetch posts con filtros
│   │   │   ├── useAlerts.js        # Fetch alerts
│   │   │   ├── usePullToRefresh.js # Pull-to-refresh gesture
│   │   │   └── useAutoRefresh.js   # Auto-refresh periódico
│   │   ├── lib/
│   │   │   └── utils.js            # cn() helper para Tailwind
│   │   └── services/
│   │       └── api.js              # Cliente HTTP
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── docs/                   # Documentación
    ├── ai/
    │   └── COMPREHENSIVE_GUIDE.md  # Este archivo
    └── README.md           # Índice de documentación
```

---

