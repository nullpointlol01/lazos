## 10. PRÓXIMOS PASOS

### 10.1 Alta Prioridad

**1. Integración CLIP para Búsqueda por Similitud**

**Objetivo:** Permitir a usuarios subir foto de su mascota perdida y encontrar posts similares.

**Pasos:**
1. Instalar dependencias:
   ```bash
   pip install transformers torch pillow
   ```
2. Crear `app/services/embedding.py`:
   ```python
   from transformers import CLIPProcessor, CLIPModel
   import torch

   class EmbeddingService:
       def __init__(self):
           self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
           self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
           self.device = "cuda" if torch.cuda.is_available() else "cpu"
           self.model.to(self.device)

       def get_embedding(self, image: Image) -> np.ndarray:
           inputs = self.processor(images=image, return_tensors="pt")
           inputs = {k: v.to(self.device) for k, v in inputs.items()}
           with torch.no_grad():
               features = self.model.get_image_features(**inputs)
           embedding = features.cpu().numpy().flatten()
           return embedding / np.linalg.norm(embedding)  # normalizar
   ```
3. Modificar `app/api/routes/posts.py` → `create_post()`:
   - Después de procesar imagen, generar embedding
   - Guardar en `post.embedding`
4. Implementar `POST /api/v1/search/similar`:
   - Recibir imagen, generar embedding
   - Query: `SELECT * FROM posts ORDER BY embedding <=> $1 LIMIT 10`
   - Retornar posts con % de similitud
5. Frontend (`/buscar`):
   - Agregar sección "Buscar por imagen"
   - Input file → upload → mostrar resultados con % similitud

**Impacto:** Feature killer de la app, diferenciación clave vs competencia.

**2. PWA Completo**

**Objetivo:** App instalable en móviles con funcionalidad offline.

**Pasos:**
1. Crear `public/manifest.json`:
   ```json
   {
     "name": "LAZOS - Encuentra Mascotas",
     "short_name": "LAZOS",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ],
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#f97316"
   }
   ```
2. Instalar `vite-plugin-pwa`:
   ```bash
   npm install -D vite-plugin-pwa
   ```
3. Configurar `vite.config.js`:
   ```javascript
   import { VitePWA } from 'vite-plugin-pwa'

   plugins: [
     react(),
     VitePWA({
       registerType: 'autoUpdate',
       manifest: './public/manifest.json',
       workbox: {
         runtimeCaching: [
           {
             urlPattern: /^https:\/\/pub-.*\.r2\.dev\/.*/,
             handler: 'CacheFirst',
             options: {
               cacheName: 'images-cache',
               expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }
             }
           }
         ]
       }
     })
   ]
   ```
4. Crear iconos 192x192 y 512x512
5. Testear en Chrome DevTools → Application → Manifest

**Impacto:** Mejor UX móvil, app "nativa", funciona offline.

### 10.2 Media Prioridad

**3. Rate Limiting por IP**

**Objetivo:** Prevenir spam y abuse de API pública.

**Pasos:**
1. Instalar `slowapi`:
   ```bash
   pip install slowapi
   ```
2. Configurar en `app/main.py`:
   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter

   @app.post("/api/v1/posts")
   @limiter.limit("10/hour")
   async def create_post(...):
       ...
   ```
3. Límites sugeridos:
   - GET endpoints: 100 req/min
   - POST posts: 10 req/hora
   - POST reports: 5 req/hora

**4. Analytics Privacy-First (Plausible)**

**Objetivo:** Entender uso sin invadir privacidad.

**Pasos:**
1. Crear cuenta en Plausible.io
2. Agregar script en `index.html`:
   ```html
   <script defer data-domain="lazos.app" src="https://plausible.io/js/script.js"></script>
   ```
3. No requiere cookies ni GDPR banners
4. Métricas: páginas vistas, fuentes de tráfico, dispositivos

### 10.3 Baja Prioridad

**5. Autenticación JWT (Opcional)**

Si se decide implementar:
1. Endpoints `POST /auth/register`, `POST /auth/login`
2. Middleware de autenticación para rutas protegidas
3. Frontend: Login/registro UI, token storage en localStorage
4. Asociar posts a usuarios
5. Permitir editar/eliminar solo posts propios

**6. Testing**

Backend:
- pytest con fixtures para DB
- Coverage objetivo: >80%
- Tests de integración para endpoints críticos

Frontend:
- Vitest + React Testing Library
- Tests de componentes clave (FilterBar, PostCard)
- E2E con Playwright (flujo completo de crear post)

**7. Optimizaciones de Performance**

- CDN para imágenes (Cloudflare CDN ya incluido con R2)
- Redis para cache de GET /posts (resultados frecuentes)
- Connection pooling tuning en PostgreSQL
- Lazy loading de componentes React (React.lazy)
- Image lazy loading en grilla (loading="lazy")

---

## APÉNDICE A: TROUBLESHOOTING

### Problema: Imágenes no se muestran (403 Forbidden)

**Causa:** R2_PUBLIC_URL no configurado o bucket no público.

**Solución:**
1. Verificar `.env`: `R2_PUBLIC_URL=https://pub-xxxxx.r2.dev`
2. Cloudflare Dashboard → R2 → bucket → Settings → Public Access → Enable
3. Reiniciar backend: `docker-compose restart api`
4. Test: Abrir URL de imagen en navegador incógnito

### Problema: react-leaflet error "Cannot read properties of null"

**Causa:** Versión incompatible con React 18.

**Solución:**
```bash
npm install react-leaflet@4.2.1
```

### Problema: CORS error en frontend

**Causa:** CORS_ORIGINS no incluye URL de frontend.

**Solución:**
1. Verificar `.env` backend:
   ```
   CORS_ORIGINS=http://localhost:5173,https://lazos.app
   ```
2. Reiniciar backend
3. Verificar en Network tab (F12) que header `Access-Control-Allow-Origin` está presente

### Problema: Localidades no cargan en desplegable

**Causa:** JSON no encontrado o error de parsing.

**Solución:**
1. Verificar archivos existen:
   ```bash
   ls -lh lazos-web/public/data/
   # Debe mostrar provincias.json y localidades.json
   ```
2. Verificar JSON válido:
   ```bash
   jq . lazos-web/public/data/localidades.json | head
   ```
3. Check console browser (F12) por errores de fetch

### Problema: Emails de reportes no se envían

**Causa:** SMTP no configurado o credenciales incorrectas.

**Solución:**
1. Verificar `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASSWORD=tu_app_password  # NO tu password normal
   ```
2. Gmail: Generar App Password en https://myaccount.google.com/apppasswords
3. Test endpoint:
   ```bash
   curl -X POST http://localhost:8000/api/v1/reports \
     -H "Content-Type: application/json" \
     -d '{"post_id":"uuid","reason":"spam"}'
   ```
4. Check logs backend por errores SMTP

---

## APÉNDICE B: GLOSARIO TÉCNICO

**Alert:** Aviso rápido sin imágenes, para reportes temporales de animales en movimiento.

**API Georef:** Servicio de georeferenciación del INDEC (Argentina) con datos oficiales de provincias, localidades, calles.

**Available Filters:** Filtros dinámicos calculados por el backend que muestran solo opciones con resultados disponibles, incluyendo conteos.

**CLIP:** Contrastive Language-Image Pre-training. Modelo de IA de OpenAI que genera embeddings de imágenes para búsqueda por similitud semántica.

**Embedding:** Vector numérico de 512 dimensiones que representa una imagen en espacio semántico. Permite comparar similitud entre imágenes con distancia coseno.

**EXIF Transpose:** Corrección de orientación de imágenes basada en metadatos EXIF. Esencial para fotos de móviles que pueden estar rotadas.

**Geocoding:** Conversión de dirección (ej: "Av. 7 1234, La Plata") a coordenadas (lat, lon).

**Geography POINT:** Tipo de dato PostGIS que almacena coordenadas geográficas (lat, lon) en formato WGS84 (SRID 4326).

**HNSW:** Hierarchical Navigable Small World. Algoritmo de indexación para búsqueda rápida de vecinos más cercanos en espacios vectoriales (usado en pgvector).

**PostGIS:** Extensión de PostgreSQL para queries geoespaciales (distancias, áreas, intersecciones).

**pgvector:** Extensión de PostgreSQL para almacenar y buscar vectores (embeddings). Soporta índices HNSW para búsqueda rápida.

**R2.dev Subdomain:** URL pública generada por Cloudflare R2 para acceder a archivos en buckets (ej: https://pub-xxxxx.r2.dev).

**Reverse Geocoding:** Conversión de coordenadas (lat, lon) a dirección legible (ej: "Av. 7 1234, La Plata").

**Soft Delete:** Marcar registro como inactivo (is_active=False) en lugar de eliminarlo físicamente. Permite recuperación y auditoría.

**shadcn/ui:** Colección de componentes React reutilizables construidos con Tailwind CSS y Radix UI. No es una biblioteca instalable, se copian componentes al proyecto.

---

## APÉNDICE C: CHECKLIST DE DESARROLLO

### Al agregar una nueva feature:

- [ ] Actualizar este documento (COMPREHENSIVE_GUIDE.md) con detalles técnicos
- [ ] Agregar entry en CHANGELOG.md
- [ ] Si cambia DB: Crear migración Alembic
- [ ] Si cambia API: Actualizar schemas Pydantic y documentación de endpoints
- [ ] Si cambia frontend: Actualizar sección de componentes/páginas
- [ ] Tests (backend): pytest para nuevos endpoints
- [ ] Tests (frontend): Vitest para componentes críticos (si testing implementado)
- [ ] Verificar que no rompe features existentes
- [ ] Commit con mensaje convencional (ej: `feat: Agregar búsqueda por similitud CLIP`)

### Al arreglar un bug:

- [ ] Actualizar CHANGELOG.md en sección "Fixed"
- [ ] Si bug estaba en PENDING.md → removerlo
- [ ] Commit con mensaje: `fix: Descripción del bug arreglado`
- [ ] Verificar que fix no introduce regresiones

### Al hacer deployment:

- [ ] Verificar todas las variables de entorno configuradas
- [ ] Ejecutar migraciones: `alembic upgrade head`
- [ ] Verificar R2_PUBLIC_URL configurado
- [ ] Testear flujo completo: crear post → ver en home → filtrar → reportar
- [ ] Verificar que imágenes se muestran correctamente
- [ ] Verificar emails de reportes funcionan (si SMTP configurado)
- [ ] Monitorear logs por errores

---

**FIN DE LA GUÍA COMPLETA**

Esta documentación debe mantenerse sincronizada con el código. Actualízala después de cada cambio significativo.

**Última actualización:** 2025-12-29
**Versión del proyecto:** 2.0
**Mantenido por:** Agentes IA + Claude Code
