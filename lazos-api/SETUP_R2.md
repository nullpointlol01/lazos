# Configuración de Cloudflare R2 para LAZOS

## ⚠️ CRÍTICO: R2_PUBLIC_URL

Para que las imágenes se muestren correctamente en el frontend, **DEBES** configurar `R2_PUBLIC_URL` en tu archivo `.env`.

## ¿Qué es R2_PUBLIC_URL?

Es la URL pública del subdomain R2.dev de tu bucket. Permite acceder a las imágenes sin autenticación.

## ¿Por qué es necesario?

Sin `R2_PUBLIC_URL`, las URLs de las imágenes se guardan como rutas relativas (`/posts/uuid.jpg`) en lugar de URLs completas, y **las imágenes NO se cargan** en el navegador.

## Cómo obtener tu R2_PUBLIC_URL

### Opción 1: Dashboard de Cloudflare

1. Ve a tu dashboard de Cloudflare: https://dash.cloudflare.com
2. Click en **R2** en el menú lateral
3. Selecciona tu bucket (`lazos-images`)
4. Ve a la pestaña **Settings**
5. En la sección **Public access**, activa **Allow Access**
6. Copia la URL que aparece (formato: `https://pub-XXXXXXXXXXXXX.r2.dev`)

### Opción 2: Wrangler CLI

```bash
wrangler r2 bucket domain list lazos-images
```

## Configuración en .env

Agrega esta línea a tu archivo `lazos-api/.env`:

```bash
R2_PUBLIC_URL=https://pub-XXXXXXXXXXXXX.r2.dev
```

**Reemplaza `XXXXXXXXXXXXX` con el ID real de tu bucket.**

## Ejemplo completo de .env

```bash
# Storage (Cloudflare R2)
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_access_key_here
R2_SECRET_KEY=your_secret_key_here
R2_BUCKET=lazos-images
R2_PUBLIC_URL=https://pub-XXXXXXXXXXXXX.r2.dev
```

## Verificación

Después de agregar `R2_PUBLIC_URL` a tu `.env`:

### 1. Reinicia el backend

```bash
cd lazos-api
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Verifica los logs de inicio

Deberías ver:

```
================================================================================
LAZOS API - CONFIGURACIÓN AL INICIO
================================================================================
R2_PUBLIC_URL: https://pub-XXXXXXXXXXXXX.r2.dev
✅ R2_PUBLIC_URL configurado correctamente
================================================================================
```

### 3. Crea un post de prueba

Al subir una imagen, verifica los logs del backend:

```
[StorageService] base_url = 'https://pub-XXXXXXXXXXXXX.r2.dev'
[StorageService] image_url generada: https://pub-XXXXXXXXXXXXX.r2.dev/posts/{uuid}.jpg
```

### 4. Verifica en el frontend

La imagen debería cargarse correctamente. En la consola del navegador:

```
[FRONTEND] image_url: https://pub-XXXXXXXXXXXXX.r2.dev/posts/{uuid}.jpg
[PostCard] Imagen cargada exitosamente: https://...
```

## Troubleshooting

### Las imágenes NO se cargan (error 403 o 404)

**Problema**: El bucket R2 no está configurado como público.

**Solución**:
1. Ve a tu bucket en el dashboard de Cloudflare
2. Settings → Public access
3. Activa **Allow Access**
4. Confirma que aparece la URL pública

### Las URLs siguen siendo relativas (/posts/uuid.jpg)

**Problema**: El backend no se reinició después de agregar `R2_PUBLIC_URL`.

**Solución**:
1. Detén el backend (Ctrl+C)
2. Verifica que `.env` tiene `R2_PUBLIC_URL`
3. Reinicia el backend
4. Verifica los logs de startup

### R2_PUBLIC_URL aparece vacío en los logs

**Problema**: El archivo `.env` no está en la ubicación correcta o tiene un error de sintaxis.

**Solución**:
1. Verifica que el `.env` está en `lazos-api/.env` (NO en la raíz del proyecto)
2. Verifica que no hay espacios antes/después del `=`
3. Verifica que la URL está correctamente escrita

## Más ayuda

Si sigues teniendo problemas, ejecuta el script de verificación:

```bash
cd lazos-api
source venv/bin/activate
python verificar_configuracion.py
```

Este script te dirá exactamente qué está mal.
