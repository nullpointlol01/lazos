"""
LAZOS API - Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

from app.config import settings
from app.api.routes import posts, map, alerts, reports, admin, search

logger = logging.getLogger(__name__)

# 🔍 DIAGNÓSTICO CORS - Log al inicio
print("=" * 80)
print("🔍 DIAGNÓSTICO CORS")
print("=" * 80)
print(f"CORS_ORIGINS (raw string): {settings.CORS_ORIGINS}")
print(f"cors_origins_list (parsed): {settings.cors_origins_list}")
print(f"Tipo: {type(settings.cors_origins_list)}")
print(f"Cantidad de orígenes: {len(settings.cors_origins_list)}")
print("=" * 80)

# Create FastAPI app
app = FastAPI(
    title="LAZOS API",
    description="API pública para reportar avistamientos de mascotas en la vía pública",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self)"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "LAZOS API",
        "version": "1.0.0",
        "description": "API pública para reportar avistamientos de mascotas",
        "docs": "/docs",
        "health": "/health",
    }


# Include routers
app.include_router(posts.router, prefix="/api/v1", tags=["Posts"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
app.include_router(map.router, prefix="/api/v1", tags=["Map"])
app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(search.router, prefix="/api/v1", tags=["Search"])


# Startup event - Mostrar configuración crítica
@app.on_event("startup")
async def startup_event():
    """Log de configuración al iniciar el servidor"""
    logger.info("=" * 80)
    logger.info("LAZOS API - CONFIGURACIÓN AL INICIO")
    logger.info("=" * 80)
    logger.info(f"R2_ENDPOINT: {settings.R2_ENDPOINT[:50]}..." if settings.R2_ENDPOINT else "R2_ENDPOINT: NOT SET")
    logger.info(f"R2_BUCKET: {settings.R2_BUCKET}")
    logger.info(f"R2_PUBLIC_URL: {settings.R2_PUBLIC_URL}")

    if not settings.R2_PUBLIC_URL:
        logger.error("⚠️  ADVERTENCIA CRÍTICA: R2_PUBLIC_URL está vacío!")
        logger.error("⚠️  Las URLs de imágenes serán rutas relativas (/posts/uuid.jpg)")
        logger.error("⚠️  Solución: Agregar R2_PUBLIC_URL en .env y reiniciar el servidor")
    else:
        logger.info(f"✅ R2_PUBLIC_URL configurado correctamente")

    logger.info("=" * 80)
