#!/bin/bash
# Script de verificación del backend LAZOS
# Verifica que todos los archivos Python tengan sintaxis correcta

set -e

echo "🔍 Verificando sintaxis de archivos Python..."
echo ""

# Verificar archivos principales
echo "📋 Verificando configuración..."
python -m py_compile lazos-api/app/config.py
python -m py_compile lazos-api/app/database.py
python -m py_compile lazos-api/app/main.py
echo "✓ Configuración OK"
echo ""

# Verificar modelos
echo "📋 Verificando modelos..."
python -m py_compile lazos-api/app/models/post.py
python -m py_compile lazos-api/app/models/user.py
echo "✓ Modelos OK"
echo ""

# Verificar schemas
echo "📋 Verificando schemas..."
python -m py_compile lazos-api/app/schemas/post.py
python -m py_compile lazos-api/app/schemas/common.py
echo "✓ Schemas OK"
echo ""

# Verificar API
echo "📋 Verificando API routes..."
python -m py_compile lazos-api/app/api/deps.py
python -m py_compile lazos-api/app/api/routes/posts.py
echo "✓ API routes OK"
echo ""

# Verificar migraciones
echo "📋 Verificando migraciones..."
python -m py_compile lazos-api/migrations/env.py
python -m py_compile lazos-api/migrations/versions/20251225_0000-initial_schema.py
echo "✓ Migraciones OK"
echo ""

# Verificar tests
echo "📋 Verificando tests..."
python -m py_compile lazos-api/tests/test_main.py
echo "✓ Tests OK"
echo ""

echo "✅ Todas las verificaciones pasaron correctamente!"
echo ""
echo "📝 Próximos pasos:"
echo "  1. docker-compose up -d              # Iniciar servicios"
echo "  2. docker-compose exec api alembic upgrade head  # Ejecutar migraciones"
echo "  3. Abrir http://localhost:8000/docs  # Ver documentación API"
