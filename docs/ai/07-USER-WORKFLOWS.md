## 7. FLUJOS PRINCIPALES

### 7.1 Crear Post con Múltiples Imágenes

```
1. Usuario accede a /new
2. Selecciona 1-3 imágenes desde galería o cámara
3. Frontend muestra preview de imágenes con opción de remover
4. Usuario marca una imagen como principal (radio buttons)
5. Completa ubicación:
   - Opción A: GPS automático → reverse geocoding con Nominatim
   - Opción B: Manual → autocomplete provincias/localidades → geocoding con API Georef
6. Completa formulario: tipo, sexo, tamaño, fecha, descripción, contacto (opcional)
7. Validación client-side (1-3 imágenes, todos los campos requeridos)
8. Submit: FormData con arrays
   - images[0], images[1], images[2]
   - primary_image_index
   - ...otros campos
9. Backend: POST /api/v1/posts
   - Valida cada imagen (tipo, tamaño max 10MB)
   - Procesa cada imagen:
     * ImageService.exif_transpose() → corrige orientación
     * Resize max 2000px
     * Genera thumbnail 400px
     * Compresión JPEG 85%
   - StorageService.upload_images() → sube a R2
   - Crea Post + múltiples PostImage records en DB
   - Primer imagen (o la marcada como primary) → is_primary=True
   - display_order según orden de upload
10. Retorna 201 con PostResponse completo (incluye array images)
11. Frontend navega a Home, muestra mensaje de éxito
```

### 7.2 Filtrar Posts Dinámicamente

```
1. Usuario abre FilterBar en Home (click en botón "Filtros")
2. Selecciona provincia en dropdown (ej: "Buenos Aires")
   - Frontend: onFiltersChange({ ...filters, provincia: "Buenos Aires" })
   - usePosts hook detecta cambio → refetch
3. Backend: GET /api/v1/posts?provincia=Buenos Aires
   - Query: WHERE location_name LIKE '%Buenos Aires%'
   - Calcula available_filters:
     * Provincias con conteos (incluyendo Buenos Aires con su count)
     * Localidades de Buenos Aires con conteos
     * Animal types, sizes, sexes con conteos
4. Backend retorna:
   {
     "data": [posts filtrados],
     "meta": { total: 45, ... },
     "available_filters": {
       "provincias": [
         { "value": "Buenos Aires", "count": 45 },
         { "value": "CABA", "count": 30 },
         ...
       ],
       "localidades": [
         { "value": "La Plata", "count": 15, "provincia": "Buenos Aires" },
         { "value": "Mar del Plata", "count": 10, "provincia": "Buenos Aires" },
         ...
       ],
       "animal_types": [
         { "value": "dog", "label": "Perros", "count": 30 },
         { "value": "cat", "label": "Gatos", "count": 15 }
       ],
       ...
     }
   }
5. Frontend:
   - Actualiza grilla de posts
   - FilterBar muestra opciones disponibles con conteos
   - Dropdown de localidad se habilita con opciones de Buenos Aires
   - Contador: "45 publicaciones encontradas"
6. Usuario selecciona localidad "La Plata"
   - Mismo flujo, ahora filtra por provincia AND localidad
7. Usuario selecciona tipo "Perros"
   - Cascada de filtros se aplica
8. Chips de filtros activos aparecen arriba:
   - [Buenos Aires ✕] [La Plata ✕] [Perros ✕]
   - Click en ✕ → remueve ese filtro → refetch
9. Botón "Limpiar filtros" → resetea todo → refetch sin filtros
```

### 7.3 Reportar Contenido

```
1. Usuario ve un post inapropiado en PostDetail
2. Click en botón "Reportar"
3. ReportModal abre con razones predefinidas:
   - ◯ No es un animal
   - ◯ Contenido inapropiado
   - ◯ Spam
   - ◯ Otro
4. Usuario selecciona razón (ej: "Spam")
5. Opcionalmente escribe descripción adicional (max 1000 chars)
6. Click en "Enviar reporte"
7. Frontend: POST /api/v1/reports
   {
     "post_id": "uuid",
     "reason": "spam",
     "description": "Publicación repetida 5 veces"
   }
8. Backend:
   - Extrae reporter_ip del request
   - Crea Report en DB:
     * post_id
     * reason
     * description
     * reporter_ip
     * resolved=False
   - Si SMTP configurado:
     * EmailService.send_report_notification()
     * Email al MODERATOR_EMAIL con:
       - Razón del reporte
       - Descripción
       - Link directo al post
       - IP del reportero
9. Backend retorna 201 con ReportResponse
10. Frontend:
    - Modal muestra "✓ Reporte enviado correctamente"
    - Auto-cierra después de 2 segundos
11. Moderador recibe email:
    Subject: "Nuevo reporte en LAZOS"
    Body:
      Se ha reportado un post:
      - Razón: Spam
      - Descripción: Publicación repetida 5 veces
      - Post ID: uuid
      - Link: https://lazos.app/post/uuid
      - IP reportero: 1.2.3.4
      - Fecha: 2025-12-29 10:30:00

      Accede al panel de administración para revisar:
      https://lazos.app/admin
```

### 7.4 Moderar Contenido (Panel Admin)

```
1. Admin accede a /admin
2. Si no tiene password guardado en localStorage:
   - Muestra input de password
   - Ingresa password
   - Click en "Ingresar"
3. Frontend: GET /api/v1/admin/reports
   - Headers: { "X-Admin-Password": password }
4. Backend:
   - Valida password contra settings.ADMIN_PASSWORD
   - Si incorrecto → 401 Unauthorized
   - Si correcto → retorna reportes pendientes con post_data
5. Frontend:
   - Guarda password en localStorage
   - Muestra dashboard con stats
   - Lista de reportes:
     ┌────────────────────────────────────────────────┐
     │ REPORTE #1 - Spam (3 reportes totales)        │
     │ ┌──────┐                                       │
     │ │THUMB │ Perro marrón con...                   │
     │ └──────┘ Reportado por: 1.2.3.4                │
     │          Descripción: Publicación repetida...  │
     │                                                 │
     │ [Ver post] [Ignorar reporte] [Eliminar post]  │
     └────────────────────────────────────────────────┘
6. Admin tiene 3 opciones:

   OPCIÓN A - Ver post:
   - Click en "Ver post"
   - Abre /post/:id en nueva pestaña
   - Admin revisa contenido

   OPCIÓN B - Ignorar reporte:
   - Click en "Ignorar reporte"
   - POST /api/v1/admin/reports/:id/resolve
   - Backend: marca report.resolved=True
   - Frontend: remueve de lista, actualiza stats

   OPCIÓN C - Eliminar post:
   - Click en "Eliminar post"
   - Confirmación: "¿Seguro? Esto marcará el post como inactivo"
   - DELETE /api/v1/admin/posts/:id
   - Backend:
     * Post.is_active = False
     * Marca todos los reportes de ese post como resolved=True
   - Frontend: remueve de lista, actualiza stats
7. Dashboard stats actualiza en tiempo real:
   - Total posts: 150
   - Posts activos: 145 (-1 si eliminó)
   - Reportes pendientes: 5 (-1 si resolvió)
```

### 7.5 Búsqueda Unificada

```
1. Usuario accede a /buscar
2. Escribe en input: "perro marrón palermo"
3. Debounce de 300ms
4. Frontend: GET /api/v1/search?q=perro marrón palermo&type=all
5. Backend:
   - Busca en posts.description, posts.location_name, posts.animal_type
   - Busca en alerts.description, alerts.location_name, alerts.animal_type
   - Aplica ILIKE con % (case-insensitive)
   - Ordena por created_at DESC
   - Retorna resultados con:
     * type (post|alert)
     * snippet con término destacado (usa <mark>)
     * thumbnail_url (si post)
     * location_name
     * created_at
6. Frontend muestra resultados:
   ┌────────────────────────────────────────────┐
   │ 🐕 POST                                    │
   │ ┌──────┐                                   │
   │ │THUMB │ Perro marrón con collar...        │
   │ └──────┘ ...visto en <mark>Palermo</mark> │
   │          Hace 2 horas                      │
   └────────────────────────────────────────────┘
   ┌────────────────────────────────────────────┐
   │ 📢 AVISO                                   │
   │ <mark>Perro marrón</mark> corriendo hacia  │
   │ Av. Santa Fe, <mark>Palermo</mark>         │
   │ Hace 30 minutos                            │
   └────────────────────────────────────────────┘
7. Usuario puede filtrar por tabs:
   - [Todos (15)] [Posts (10)] [Avisos (5)]
8. Click en resultado → navega a /post/:id o /avisos/:id
```

---

