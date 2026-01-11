# CLAUDE.MD - Guía para Asistentes IA

**Versión**: 1.0
**Última actualización**: 2026-01-10
**Propósito**: Guía rápida para agentes IA (Claude, etc.) trabajando en el proyecto LAZOS

---

## 📚 Documentación Principal

**⚠️ IMPORTANTE**: Antes de realizar cambios, lee la documentación completa en **[/docs/ai/README.md](./docs/ai/README.md)**

La documentación está organizada en módulos:
- **[01-PROJECT-OVERVIEW.md](./docs/ai/01-PROJECT-OVERVIEW.md)** - Visión y contexto del proyecto
- **[02-ARCHITECTURE.md](./docs/ai/02-ARCHITECTURE.md)** - Stack tecnológico y estructura
- **[03-CURRENT-STATE.md](./docs/ai/03-CURRENT-STATE.md)** - Features implementadas y pendientes
- **[04-DATABASE-MODELS.md](./docs/ai/04-DATABASE-MODELS.md)** - Esquemas de base de datos
- **[05-API-REFERENCE.md](./docs/ai/05-API-REFERENCE.md)** - Endpoints REST completos
- **[06-FRONTEND-GUIDE.md](./docs/ai/06-FRONTEND-GUIDE.md)** - Componentes y páginas React
- **[07-USER-WORKFLOWS.md](./docs/ai/07-USER-WORKFLOWS.md)** - Flujos de usuario
- **[08-DEPLOYMENT.md](./docs/ai/08-DEPLOYMENT.md)** - Configuración y deployment
- **[09-ARCHITECTURE-DECISIONS.md](./docs/ai/09-ARCHITECTURE-DECISIONS.md)** - ADRs importantes
- **[10-ROADMAP.md](./docs/ai/10-ROADMAP.md)** - Próximos pasos

---

## 🎯 Resumen del Proyecto

**LAZOS** es una plataforma colaborativa para reportar avistamientos de mascotas en vía pública (Argentina).

### Stack Principal
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL (PostGIS + pgvector)
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Storage**: Cloudflare R2 para imágenes
- **Mapas**: Leaflet + OpenStreetMap + API Georef (INDEC)

### Estructura del Proyecto
```
lazos/
├── lazos-api/          # Backend FastAPI
│   ├── app/
│   │   ├── main.py     # Entry point
│   │   ├── models/     # SQLAlchemy models
│   │   ├── routers/    # API endpoints
│   │   ├── schemas/    # Pydantic schemas
│   │   └── services/   # Business logic
│   └── alembic/        # DB migrations
├── lazos-web/          # Frontend React
│   ├── src/
│   │   ├── components/ # Componentes reutilizables
│   │   ├── pages/      # Páginas principales
│   │   ├── hooks/      # Custom hooks
│   │   └── lib/        # Utilities
│   └── public/
└── docs/ai/            # Documentación para agentes IA
```

---

## ✅ Principios de Desarrollo

### 1. Código Limpio y Mantenible
- **No sobre-ingenierizar**: Solo implementa lo solicitado
- **No agregar features no pedidas**: Evita agregar validaciones, comentarios o refactorings innecesarios
- **DRY con moderación**: No crear abstracciones prematuras

### 2. Estándares de Código

#### Backend (Python)
```python
# ✅ BUENO: Tipo hints, nombres descriptivos, validación con Pydantic
from pydantic import BaseModel, Field

class PostCreate(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)
    province: str
    locality: str

# ❌ MALO: Sin tipos, sin validación
def create_post(data):
    description = data.get("description")
    # ...
```

**Convenciones Python**:
- Usar `async/await` para operaciones I/O
- Validación con Pydantic (no try/except innecesarios)
- SQLAlchemy 2.0 style (no legacy ORM)
- Type hints obligatorios

#### Frontend (React/TypeScript)
```tsx
// ✅ BUENO: Componente tipado, hooks, mobile-first
interface PostCardProps {
  post: Post;
  onReport: (id: number) => void;
}

export function PostCard({ post, onReport }: PostCardProps) {
  const [isReporting, setIsReporting] = useState(false);
  // ...
}

// ❌ MALO: Sin tipos, props desestructuradas sin tipo
export function PostCard({ post, onReport }) {
  // ...
}
```

**Convenciones React**:
- Componentes funcionales + hooks (no class components)
- Props tipadas con TypeScript
- Tailwind CSS para estilos (evitar CSS inline)
- shadcn/ui para componentes base
- Mobile-first responsive design

### 3. Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato
type: description

# Types
feat:     Nueva feature
fix:      Bug fix
docs:     Cambios en documentación
chore:    Tareas de mantenimiento
test:     Tests
refactor: Refactoring sin cambio funcional
perf:     Mejoras de performance

# Ejemplos
feat: Agregar búsqueda por similitud con CLIP
fix: Corregir orientación de imágenes en móviles
docs: Actualizar guía de deployment con Railway
chore: Actualizar dependencias de FastAPI
```

---

## 🚀 Comandos Frecuentes

### Backend
```bash
cd lazos-api

# Setup inicial
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head

# Desarrollo
python -m uvicorn app.main:app --reload

# Migraciones
alembic revision --autogenerate -m "descripcion"
alembic upgrade head

# Tests (cuando se implementen)
pytest
```

### Frontend
```bash
cd lazos-web

# Setup inicial
npm install
cp .env.example .env

# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview
```

### Docker
```bash
# Levantar DB + API
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Rebuild
docker-compose up -d --build
```

---

## 🔑 Configuración Crítica

### Variables de Entorno

**Backend (`lazos-api/.env`)**:
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/lazos

# Cloudflare R2 (⚠️ CRÍTICO para imágenes)
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # ⚠️ Sin esto NO se ven imágenes
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_key
R2_SECRET_KEY=your_secret
R2_BUCKET=lazos-images

# Cloudflare AI (para validación de contenido)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Admin
ADMIN_PASSWORD=your_admin_password
MODERATOR_EMAIL=tu@email.com

# SMTP (opcional, para notificaciones de moderación)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASSWORD=tu_app_password
```

**Frontend (`lazos-web/.env`)**:
```bash
VITE_API_URL=http://localhost:8000
```

### ⚠️ Problema Común: Imágenes No Se Ven

Si las imágenes no cargan:
1. Verificar que `R2_PUBLIC_URL` esté configurado en `.env`
2. Verificar que el bucket R2 tenga "Public access via R2.dev subdomain" habilitado
3. Reiniciar el backend después de cambiar `.env`

### 📡 Configuración del Puerto (Railway)

El backend está configurado para usar la variable de entorno `PORT`:
- **Railway**: Inyecta automáticamente `$PORT` (puerto dinámico)
- **Desarrollo local**: Usa puerto 8000 por defecto (definido en `docker-compose.yml`)
- **Dockerfile**: `CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`

**No necesitas configurar PORT manualmente**, el Dockerfile usa fallback a 8000 si la variable no existe.

---

## 🧪 Testing (Pendiente)

Actualmente **NO hay tests implementados**. Cuando se agreguen:

### Backend
- Usar `pytest` + `httpx` para tests de API
- Tests en `lazos-api/tests/`
- Coverage mínimo: 70%

### Frontend
- Usar `vitest` + `@testing-library/react`
- Tests en `lazos-web/src/**/*.test.tsx`
- Tests de componentes críticos (PostCard, AlertCard, MapView)

---

## 📋 Checklist para Features Nuevas

Antes de crear un PR, verificar:

- [ ] **Código**
  - [ ] Type hints (Python) o TypeScript (React)
  - [ ] Sin errores de linting (`ruff` backend, `eslint` frontend)
  - [ ] Sin console.log innecesarios
  - [ ] Componentes responsive (mobile-first)

- [ ] **Base de Datos** (si aplica)
  - [ ] Migración de Alembic creada y probada
  - [ ] Índices agregados para queries frecuentes
  - [ ] Constraints (FK, unique, not null) correctos

- [ ] **API** (si aplica)
  - [ ] Endpoints documentados en docstrings
  - [ ] Pydantic schemas para request/response
  - [ ] Manejo de errores con HTTPException

- [ ] **Frontend** (si aplica)
  - [ ] Componentes tipados
  - [ ] Loading states y error handling
  - [ ] Accesibilidad (a11y) básica

- [ ] **Documentación**
  - [ ] Actualizar `docs/ai/03-CURRENT-STATE.md` con nueva feature
  - [ ] Actualizar `docs/ai/10-ROADMAP.md` si aplica
  - [ ] Si cambió API: actualizar `docs/ai/05-API-REFERENCE.md`
  - [ ] Si cambió DB: actualizar `docs/ai/04-DATABASE-MODELS.md`

- [ ] **Deployment**
  - [ ] Variables de entorno documentadas en `.env.example`
  - [ ] Sin secretos hardcodeados
  - [ ] Compatible con Railway (backend) y Vercel (frontend)

---

## 🐛 Debugging

### Backend
```bash
# Logs detallados
uvicorn app.main:app --reload --log-level debug

# Inspeccionar DB
docker exec -it lazos-db psql -U postgres -d lazos
\dt  # Listar tablas
SELECT * FROM posts LIMIT 5;

# Ver queries SQL
# En app/main.py agregar:
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

### Frontend
```bash
# Inspeccionar requests en DevTools → Network
# Ver estado de React con React DevTools
# Inspeccionar errores de hydration en consola
```

---

## 🚨 Errores Comunes

### Error: "Images not loading"
**Causa**: R2_PUBLIC_URL no configurado o bucket no público
**Solución**: Ver sección [Configuración Crítica](#-configuración-crítica)

### Error: "CORS error on API requests"
**Causa**: Frontend en puerto diferente al esperado
**Solución**: Verificar `VITE_API_URL` en frontend y CORS origins en backend

### Error: "Alembic can't detect model changes"
**Causa**: Modelo no importado en `alembic/env.py`
**Solución**: Importar modelo en `alembic/env.py` → `target_metadata`

### Error: "ModuleNotFoundError in backend"
**Causa**: Dependencias no instaladas o venv no activado
**Solución**: `pip install -r requirements.txt` con venv activado

---

## 🎨 Estilo y UX

### Diseño
- **Mobile-first**: Diseñar primero para móvil, luego desktop
- **Tema día/noche**: Soportar ambos modos (Tailwind dark:)
- **Tonos cálidos**: Naranja (#f97316) como color primario
- **Accesibilidad**: Contraste WCAG AA mínimo

### Componentes UI
- Usar **shadcn/ui** para componentes base (Button, Card, Dialog, etc.)
- Personalizar con Tailwind CSS
- Evitar CSS-in-JS o styled-components

---

## 🔐 Seguridad

### Backend
- **No confiar en input del usuario**: Validar con Pydantic
- **SQL injection**: Usar SQLAlchemy ORM (nunca raw SQL con f-strings)
- **XSS**: FastAPI escapa automáticamente JSON
- **NSFW content**:
  - Cloudflare AI Workers para validación de imágenes (modelo ResNet-50)
  - Fallback Python NSFW detector (análisis de tonos de piel)
  - Validación semántica de texto con Cloudflare AI (Llama-3-8b)
  - Posts sospechosos van a moderación manual (pending_approval=True)
- **Rate limiting**: Implementar en producción (pendiente)

### Frontend
- **No almacenar secretos**: Nunca en localStorage/sessionStorage
- **HTTPS**: Solo en producción (Vercel lo maneja automáticamente)
- **Content validation**: NSFW.js + validación de texto antes de enviar

---

## 📦 Deployment

### Backend (Railway)
1. Conectar repo GitHub
2. Configurar variables de entorno (ver `.env.example`)
3. Railway detecta `Dockerfile` automáticamente
4. **Importante**: Habilitar PostgreSQL plugin con PostGIS

### Frontend (Vercel)
1. Conectar repo GitHub
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables: `VITE_API_URL`

Ver **[docs/ai/08-DEPLOYMENT.md](./docs/ai/08-DEPLOYMENT.md)** para detalles completos.

---

## 🤝 Workflow de Desarrollo

1. **Crear branch** desde `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-feature
   ```

2. **Desarrollar** con commits frecuentes:
   ```bash
   git add .
   git commit -m "feat: agregar nueva feature"
   ```

3. **Push** y crear PR:
   ```bash
   git push -u origin feature/nueva-feature
   # Crear PR en GitHub hacia develop
   ```

4. **Code review** y merge a `develop`

5. **Release**: Merge `develop` → `main` cuando esté estable

---

## 📞 Soporte

- **Issues**: https://github.com/nullpointlol01/lazos/issues
- **Documentación completa**: [/docs/ai/README.md](./docs/ai/README.md)
- **API Docs (Swagger)**: http://localhost:8000/docs (con backend corriendo)

---

## 📄 Licencia

**CC BY-NC-SA 4.0** - Creative Commons Atribución-NoComercial-CompartirIgual

⚠️ No usar con fines comerciales sin permiso explícito.

---

**Desarrollado con ❤️ por Agustín Arena usando Claude Code**
