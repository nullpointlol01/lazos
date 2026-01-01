# LAZOS 🐕🐈

![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

**Plataforma colaborativa para reportar avistamientos de mascotas en vía pública**

Ayuda a dueños a encontrar sus mascotas perdidas mediante reportes ciudadanos con foto y ubicación.

> 🌐 **Demo en vivo**: [Próximamente]
> 📖 **Documentación API**: [Próximamente]

---

## ✨ Características

- **📸 Posts con múltiples imágenes** - Hasta 3 fotos por publicación con corrección automática de orientación
- **🗺️ Mapa interactivo** - Visualiza avistamientos en tiempo real con Leaflet + OpenStreetMap
- **⚡ Avisos rápidos** - Reportes sin foto para animales en movimiento
- **🔍 Búsqueda unificada** - Busca en publicaciones y avisos simultáneamente
- **🎯 Filtros dinámicos** - Provincia, localidad, tipo, tamaño, sexo con conteos en tiempo real
- **📍 Geocodificación precisa** - Datos oficiales de Argentina (INDEC) + OpenStreetMap
- **🛡️ Sistema de moderación IA** - Validación automática de contenido con NSFW.js + TensorFlow.js
- **🔒 Validación de texto** - Detección de spam, lenguaje ofensivo y contenido inapropiado
- **👮 Panel de administración** - Moderación de posts pendientes, aprobación/rechazo, gestión de reportes
- **🌓 Tema día/noche** - Modo claro y oscuro con tonos cálidos
- **📱 PWA Ready** - Instalable en dispositivos móviles, diseño responsive mobile-first

---

## 🚀 Stack Tecnológico

### Frontend
- **React 18** + Vite 5
- **Tailwind CSS** + shadcn/ui
- **React Router** DOM 6
- **Leaflet** para mapas interactivos

### Backend
- **Python 3.11** + FastAPI
- **SQLAlchemy 2.0** + Pydantic v2
- **PostgreSQL 15+** con PostGIS + pgvector
- **Cloudflare R2** para storage de imágenes

### Servicios
- **API Georef** (INDEC Argentina) para geocodificación
- **Nominatim** (OpenStreetMap) para reverse geocoding
- **SMTP** para notificaciones de moderación

---

## 📦 Instalación

### Prerequisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ con PostGIS
- Cuenta Cloudflare R2

### Setup

```bash
# Clonar repositorio
git clone https://github.com/nullpointlol01/lazos.git
cd lazos

# Backend
cd lazos-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales (DB, R2, etc.)
alembic upgrade head

# Frontend
cd ../lazos-web
npm install
cp .env.example .env
# Editar .env con VITE_API_URL
```

### Ejecución (Desarrollo)

```bash
# Terminal 1 - Backend
cd lazos-api
source venv/bin/activate
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd lazos-web
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🐳 Docker

```bash
docker-compose up -d
```

Servicios:
- **db**: PostgreSQL 16 + PostGIS + pgvector
- **api**: FastAPI backend en http://localhost:8000

---

## 📚 Documentación

### Para Agentes IA

**📖 [Guía Completa para Agentes IA](/docs/ai/COMPREHENSIVE_GUIDE.md)**

Documentación exhaustiva que incluye:
- Origen y visión del proyecto
- Arquitectura técnica completa (backend + frontend)
- Estado actual de todas las features
- Modelos de datos y esquemas
- API endpoints con ejemplos
- Flujos de usuario detallados
- Configuración y deployment
- Decisiones de arquitectura
- Próximos pasos y roadmap

## ⚙️ Configuración Importante

### Cloudflare R2

⚠️ **CRÍTICO:** Las imágenes no se mostrarán hasta configurar el bucket como público.

**Opción rápida (R2.dev subdomain):**

1. Cloudflare Dashboard → R2 → Bucket settings
2. Enable "Public access via R2.dev subdomain"
3. Actualizar `.env`:
   ```bash
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

### Variables de Entorno

**Backend (.env):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # ⚠️ CRÍTICO
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_key
R2_SECRET_KEY=your_secret
R2_BUCKET=lazos-images
ADMIN_PASSWORD=your_admin_password
MODERATOR_EMAIL=tu@email.com
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:8000
```

Ver `.env.example` en cada carpeta para la configuración completa.

---

## 🗺️ Roadmap

### ✅ Implementado

- [x] Sistema de posts con 1-3 imágenes
- [x] Filtros dinámicos con cascada (provincia → localidades)
- [x] Mapa interactivo con Leaflet
- [x] Sistema de avisos rápidos
- [x] Búsqueda unificada
- [x] Reportes y moderación con panel admin
- [x] **Validación de contenido con IA** (NSFW.js + TensorFlow.js)
- [x] **Validación de texto** (spam, lenguaje ofensivo, URLs sospechosas)
- [x] **Sistema de aprobación de posts** (pending_approval)
- [x] Tema día/noche
- [x] PWA con prompt de instalación
- [x] Geocodificación con API Georef (3,979 localidades de Argentina)

### 🚧 En Progreso

- [ ] Búsqueda por similitud con CLIP embeddings
- [ ] Service worker para modo offline
- [ ] Rate limiting por IP
- [ ] Analytics privacy-first (Plausible)
- [ ] Optimización de bundle size (code splitting)

### 💡 Futuro

- [ ] Autenticación JWT (opcional)
- [ ] Testing (backend + frontend)
- [ ] Optimizaciones de performance (Redis cache, CDN)

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crear branch: `git checkout -b feature/nueva-feature`
3. Commit: `git commit -m "feat: agregar nueva feature"`
4. Push: `git push origin feature/nueva-feature`
5. Abrir Pull Request

### Formato de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
type: description

Types: feat, fix, docs, chore, test, refactor, perf
```

Ejemplos:
- `feat: Agregar búsqueda por similitud con CLIP`
- `fix: Corregir orientación de imágenes móviles`
- `docs: Actualizar guía de deployment`

---

## 📄 Licencia

**CC BY-NC-SA 4.0** (Creative Commons Atribución-NoComercial-CompartirIgual)

Este proyecto está bajo la licencia Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.

Eres libre de:
- **Compartir** — copiar y redistribuir el material en cualquier medio o formato
- **Adaptar** — remezclar, transformar y construir sobre el material

Bajo los siguientes términos:
- **Atribución** — Debes dar crédito apropiado, proporcionar un enlace a la licencia e indicar si se realizaron cambios
- **NoComercial** — No puedes usar el material con fines comerciales
- **CompartirIgual** — Si remezclas, transformas o construyes sobre el material, debes distribuir tus contribuciones bajo la misma licencia

Ver el archivo [LICENSE](LICENSE) para más detalles o visita https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es

---

## 🙏 Agradecimientos

- **OpenStreetMap** por Nominatim
- **INDEC Argentina** por API Georef
- **Cloudflare** por R2 Storage
- **shadcn/ui** por componentes React
- **FastAPI** por framework backend

---

## 📞 Soporte

Para bugs o sugerencias, [abrir un issue](https://github.com/nullpointlol01/lazos/issues).

---

**Desarrollado con ❤️ por Agustín Arena usando Claude Code**
