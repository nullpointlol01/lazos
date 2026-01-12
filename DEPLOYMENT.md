# Guía de Deployment

Guía completa para deployar LAZOS en producción.

## 📋 Arquitectura de Deployment

```
┌─────────────────────────────────────────────────────────┐
│                     USUARIO                              │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┴────────────────┐
       │                                │
       ▼                                ▼
┌─────────────┐                 ┌──────────────┐
│   Vercel    │                 │   Railway    │
│  (Frontend) │◄───────────────►│  (Backend)   │
│  React+Vite │      API        │   FastAPI    │
└─────────────┘                 └──────┬───────┘
                                       │
                       ┌───────────────┴────────────────┐
                       │                                │
                       ▼                                ▼
                ┌─────────────┐              ┌─────────────────┐
                │  Supabase   │              │  Cloudflare R2  │
                │ (PostgreSQL)│              │    (Storage)    │
                │  + PostGIS  │              │    Imágenes     │
                └─────────────┘              └─────────────────┘
```

## 🎯 Stack de Deployment Recomendado

| Componente | Servicio Recomendado | Alternativas |
|------------|---------------------|--------------|
| Frontend | **Vercel** | Netlify, Cloudflare Pages |
| Backend | **Railway** | Render, Fly.io, AWS |
| Base de Datos | **Supabase** | Railway PG, Neon, AWS RDS |
| Storage | **Cloudflare R2** | AWS S3, Supabase Storage |

## 🚀 Deployment del Frontend (Vercel)

### Preparación

1. **Crear cuenta** en [Vercel](https://vercel.com)
2. **Conectar GitHub** con tu repositorio

### Configuración

```bash
# Configuración del proyecto
Framework Preset: Vite
Root Directory: lazos-web
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node Version: 18.x
```

### Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_URL=https://tu-api.railway.app
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_ENV=production
```

### Deploy

```bash
# Opción 1: Deploy automático (recomendado)
# Push a main → deploy automático

# Opción 2: Deploy manual
npm install -g vercel
cd lazos-web
vercel
```

### Post-Deploy

1. **Configurar dominio custom** (opcional):
   - Vercel → Settings → Domains
   - Agregar tu dominio y configurar DNS

2. **Verificar**:
   - Abrir tu sitio
   - Verificar que conecte con la API
   - Verificar que las imágenes carguen

## 🔧 Deployment del Backend (Railway)

### Preparación

1. **Crear cuenta** en [Railway](https://railway.app)
2. **Crear nuevo proyecto** → Deploy from GitHub repo

### Configuración

Railway detecta automáticamente Python y usa Nixpacks.

**Start Command** (en Settings → Deploy):
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Variables de Entorno

En Railway → Variables:

```bash
# Base de Datos
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

# CORS (importante!)
CORS_ORIGINS=https://tu-frontend.vercel.app,http://localhost:5173

# Cloudflare R2
R2_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com
R2_ACCESS_KEY=tu_access_key
R2_SECRET_KEY=tu_secret_key
R2_BUCKET=lazos-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Admin
ADMIN_PASSWORD=tu-password-seguro-aqui
MODERATOR_EMAIL=admin@tudominio.com

# JWT (opcional)
JWT_SECRET=un-secret-muy-seguro-generado-aleatoriamente

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

### Migraciones

⚠️ **IMPORTANTE**: Railway NO ejecuta migraciones automáticamente.

**Opción A: Script de inicio (recomendado)**

Crear `lazos-api/start.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Aplicando migraciones..."
alembic upgrade head

echo "🚀 Iniciando servidor..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Configurar en Railway:
```bash
Start Command: bash start.sh
```

**Opción B: Aplicar manualmente**

```bash
# Conectarse a Railway CLI
railway login
railway link

# Ejecutar migraciones
railway run alembic upgrade head
```

### Deploy

```bash
# Deploy automático desde GitHub
git push origin main

# O deploy manual
railway up
```

### Logs y Monitoring

```bash
# Ver logs en tiempo real
railway logs

# Ver deployments
railway status
```

## 🗄️ Setup de Base de Datos (Supabase)

### Crear Proyecto

1. Ir a [Supabase](https://supabase.com)
2. Create New Project
3. Guardar la contraseña de PostgreSQL

### Extensiones Requeridas

En Supabase → SQL Editor → New Query:

```sql
-- Extensión geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- Extensión para embeddings vectoriales
CREATE EXTENSION IF NOT EXISTS vector;

-- Extensión para búsqueda fuzzy (opcional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Aplicar Migraciones

**Opción A: Script SQL completo**

```bash
# Copiar contenido de lazos-api/scripts/sync_database.sql
# Pegar en Supabase SQL Editor
# Ejecutar
```

**Opción B: Schema inicial + migraciones**

```bash
# 1. Ejecutar schema inicial manualmente
# Ver lazos-api/migrations/versions/20251225_0000-initial_schema.py
# Convertir a SQL y ejecutar en Supabase

# 2. Ejecutar migraciones subsecuentes
# Convertir cada archivo .py a SQL y ejecutar en orden
```

### Conexión

Copiar connection string de Supabase:

```
Project Settings → Database → Connection String → URI
```

Formato:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

## 📦 Setup de Storage (Cloudflare R2)

### Crear Bucket

1. Cloudflare Dashboard → R2 → Create Bucket
2. Nombre: `lazos-images`
3. Location: Automático

### Crear API Token

1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: Object Read & Write
3. Guardar Access Key ID y Secret Access Key

### Habilitar Acceso Público

**⚠️ CRÍTICO**: Sin esto, las imágenes NO se mostrarán.

**Opción 1: R2.dev subdomain (más fácil)**

1. Bucket → Settings → Public Access
2. Enable "Allow Access" for R2.dev subdomain
3. Copiar URL: `https://pub-xxxxx.r2.dev`
4. Configurar `R2_PUBLIC_URL` con esta URL

**Opción 2: Custom Domain**

1. Cloudflare → R2 → Bucket → Settings → Custom Domains
2. Conectar dominio (ej: `cdn.tudominio.com`)
3. Configurar DNS (CNAME)
4. Usar `https://cdn.tudominio.com` como `R2_PUBLIC_URL`

### Verificación

```bash
# Subir imagen de prueba (desde backend)
curl -X POST https://tu-api.railway.app/api/v1/posts \
  -F "images=@test.jpg" \
  -F "animal_type=dog" \
  # ... otros campos

# Verificar que la URL retornada sea accesible
# Debería ser: https://pub-xxxxx.r2.dev/posts/[UUID].jpg
```

## 🔒 Seguridad

### Variables de Entorno

- ✅ **NUNCA** commitear archivos `.env`
- ✅ Usar contraseñas fuertes (min 16 caracteres)
- ✅ Rotar JWT_SECRET en cada deploy
- ✅ Usar secretos diferentes para dev y producción

### CORS

Configurar solo orígenes permitidos:

```bash
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

### Rate Limiting

```python
# TODO: Implementar en futuro
# Limitar requests por IP para prevenir abuse
```

## 📊 Monitoring

### Logs

**Frontend (Vercel)**:
- Vercel Dashboard → Deployments → [Tu deploy] → Function Logs

**Backend (Railway)**:
```bash
railway logs --tail
```

### Errores

**Frontend**:
- Sentry (recomendado)
- Vercel Analytics

**Backend**:
- Railway Logs
- Sentry para Python

### Performance

**Frontend**:
- Vercel Analytics (incluido gratis)
- Web Vitals en producción

**Backend**:
- Railway Metrics (CPU, RAM, Network)

## 🐛 Troubleshooting

### Frontend no conecta con Backend

```bash
# Verificar CORS
# En Railway, agregar URL de Vercel a CORS_ORIGINS
CORS_ORIGINS=https://tu-app.vercel.app

# Verificar VITE_API_URL en Vercel
# Debe apuntar a Railway (con HTTPS)
VITE_API_URL=https://tu-api.railway.app
```

### Imágenes no cargan

```bash
# 1. Verificar que R2_PUBLIC_URL esté configurado
echo $R2_PUBLIC_URL

# 2. Verificar que el bucket sea público
# Cloudflare R2 → Bucket → Settings → Public Access

# 3. Testear URL manualmente
curl https://pub-xxxxx.r2.dev/test.jpg
```

### Error: "column does not exist"

```bash
# Aplicar migraciones
railway run alembic upgrade head

# O ejecutar SQL en Supabase
# Ver lazos-api/scripts/sync_database.sql
```

### 500 Internal Server Error

```bash
# Ver logs
railway logs --tail

# Verificar variables de entorno
railway variables

# Verificar DATABASE_URL
railway run python -c "from app.database import engine; print(engine.url)"
```

## ✅ Checklist de Deployment

### Pre-Deploy

- [ ] Tests pasan localmente
- [ ] Build completa sin errores
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] Secretos NO están en el código
- [ ] Migraciones creadas y testeadas

### Deploy Inicial

- [ ] Base de datos creada (Supabase)
- [ ] Extensiones instaladas (PostGIS, pgvector)
- [ ] Migraciones aplicadas
- [ ] Storage configurado (R2)
- [ ] Bucket público habilitado
- [ ] Backend deployado (Railway)
- [ ] Frontend deployado (Vercel)
- [ ] Variables de entorno configuradas
- [ ] CORS configurado correctamente

### Post-Deploy

- [ ] Frontend accesible
- [ ] API responde (https://api/docs)
- [ ] Imágenes cargan correctamente
- [ ] Mapa funciona
- [ ] Crear post funciona
- [ ] Panel admin funciona
- [ ] Logs sin errores críticos

### Opcional

- [ ] Dominio custom configurado
- [ ] SSL/HTTPS funcionando
- [ ] Monitoring configurado
- [ ] Backups de DB configurados
- [ ] CDN configurado (si aplica)

## 🔄 Actualizaciones

### Deploy de Updates

```bash
# 1. Hacer cambios localmente
git add .
git commit -m "feat: nueva funcionalidad"

# 2. Push a GitHub
git push origin main

# 3. Deploy automático
# Vercel y Railway deployean automáticamente

# 4. Verificar
# Revisar logs en ambos servicios
```

### Rollback

**Vercel**:
- Dashboard → Deployments → [Deploy anterior] → Promote to Production

**Railway**:
- Dashboard → Deployments → [Deploy anterior] → Rollback

## 📞 Soporte

Si encontrás problemas:

1. Revisar [Troubleshooting](#-troubleshooting)
2. Revisar logs de Railway/Vercel
3. Abrir [issue en GitHub](https://github.com/nullpointlol01/lazos/issues)

---

**¡Buena suerte con el deployment!** 🚀
