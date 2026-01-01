## 9. DECISIONES DE ARQUITECTURA

### 9.1 Múltiples Imágenes vs Imagen Única

**Decisión:** Múltiples imágenes (hasta 3)

**Razón:**
- Mejor contexto visual del animal (frente, perfil, marcas distintivas)
- Mayor probabilidad de matching para dueños buscando
- No sobrecarga el storage (límite de 3)

**Implementación:**
- Tabla `post_images` separada (relación 1:N)
- Campos `is_primary` (imagen principal para thumbnails), `display_order` (orden de visualización)
- Backward compatibility: `posts.image_url` y `posts.thumbnail_url` apuntan a imagen primaria

**Alternativa descartada:**
- JSON array en `posts.images` → dificulta queries, no aprovecha relaciones SQL

### 9.2 Geocodificación: API Georef vs Nominatim

**Decisión:** Híbrido (API Georef prioritario, Nominatim fallback)

**Razón:**
- API Georef: Datos oficiales INDEC Argentina, más preciso para direcciones argentinas
- Nominatim: Coverage global, útil para reverse geocoding GPS
- Datos offline (provincias.json, localidades.json): Rápido, sin rate limits, UX mejorada

**Implementación:**
- Frontend autocomplete usa JSONs estáticos (3,979 localidades)
- Geocodificación de dirección completa: API Georef primero, Nominatim si falla
- Reverse geocoding GPS: Nominatim (más rápido)

**Formato de ubicación:**
```
"calle número, ciudad, provincia"
Ejemplo: "Av. 7 1234, La Plata, Buenos Aires"
```

### 9.3 Filtros Dinámicos vs Estáticos

**Decisión:** Dinámicos con conteos en backend

**Razón:**
- UX superior: Usuario ve solo opciones disponibles con resultados
- Evita "0 resultados" por combinaciones imposibles
- Más complejidad en backend, pero frontend más simple

**Implementación:**
- Backend calcula `available_filters` con conteos después de aplicar filtros actuales
- Filtros en cascada: provincia → localidades disponibles
- Parsing de `location_name` para extraer provincia y localidad

**Ejemplo:**
```json
{
  "available_filters": {
    "provincias": [
      { "value": "Buenos Aires", "count": 45 },
      { "value": "CABA", "count": 30 }
    ],
    "localidades": [
      { "value": "La Plata", "count": 15, "provincia": "Buenos Aires" }
    ]
  }
}
```

### 9.4 Autenticación: JWT vs Anónimo

**Decisión:** Anónimo en MVP (JWT config lista pero no implementado)

**Razón:**
- **PRO anónimo:** Menos fricción para reportar, API pública sin auth, foco en adopción
- **CONTRA anónimo:** Riesgo de spam, no se puede editar posts propios, sin tracking de usuario

**Mitigación de riesgos:**
- Sistema de reportes + moderación manual
- Rate limiting por IP (pendiente)
- Captcha en formularios (pendiente)

**Futuro:**
- Implementar JWT como opcional
- Usuarios autenticados pueden editar/eliminar sus posts
- Posts anónimos siguen permitidos

### 9.5 Storage: Cloudflare R2 vs S3

**Decisión:** Cloudflare R2

**Razón:**
- **Costo:** Sin egress fees (S3 cobra por transferencia)
- **Compatibilidad:** S3-compatible (usa boto3)
- **Performance:** CDN de Cloudflare integrado

**Costos estimados:**
- 1000 fotos/mes × 500KB = 500MB
- Storage: $0.015/GB/mes = ~$0.01/mes
- Operaciones: insignificantes
- Egress: **$0** (principal ventaja)

**Total: < $1/mes**

### 9.6 Tema Visual: Fijo vs Día/Noche

**Decisión:** Día/Noche con CSS variables

**Razón:**
- Mejor UX, menos fatiga visual en horarios nocturnos
- Preferencia de usuario respetada
- Implementación simple con Tailwind dark mode

**Implementación:**
- CSS variables en `index.css` con tonos cálidos (día) y oscuros (noche)
- Toggle en header con persistencia en localStorage
- Tailwind classes: `dark:bg-background`, `dark:text-foreground`, etc.

---

