#!/bin/bash
# Script para levantar backend y frontend en desarrollo

set -e

echo "🚀 LAZOS - Iniciando entorno de desarrollo"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para manejar Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill 0
    exit 0
}

trap cleanup SIGINT SIGTERM

# Verificar que estamos en el directorio correcto
if [ ! -d "lazos-api" ] || [ ! -d "lazos-web" ]; then
    echo "❌ Error: Ejecutar desde la raíz del proyecto (directorio lazos/)"
    exit 1
fi

# Iniciar Backend
echo -e "${BLUE}📦 Iniciando Backend (API)...${NC}"
cd lazos-api

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No existe .env, copiando desde .env.example${NC}"
    cp .env.example .env
    echo "   Por favor configura las credenciales en lazos-api/.env"
fi

# Activar entorno virtual si existe, sino sugerir crearlo
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activado"
else
    echo -e "${YELLOW}⚠️  No existe virtual environment${NC}"
    echo "   Creando venv..."
    python3 -m venv venv
    source venv/bin/activate
    echo "   Instalando dependencias..."
    pip install -q -r requirements.txt
    echo "✓ Dependencias instaladas"
fi

# Iniciar backend en background
echo "   Iniciando API en puerto 8000..."
uvicorn app.main:app --reload --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend corriendo (PID: $BACKEND_PID)${NC}"
echo "   Logs: backend.log"

cd ..

# Esperar a que el backend esté listo
echo "   Esperando a que la API esté lista..."
sleep 3

# Verificar si el backend está corriendo
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API respondiendo en http://localhost:8000${NC}"
else
    echo -e "${YELLOW}⚠️  API aún no responde, puede tardar unos segundos${NC}"
fi

# Iniciar Frontend
echo ""
echo -e "${BLUE}🎨 Iniciando Frontend (Web)...${NC}"
cd lazos-web

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependencias npm..."
    npm install
fi

# Iniciar frontend en background
echo "   Iniciando app en puerto 5173..."
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend corriendo (PID: $FRONTEND_PID)${NC}"
echo "   Logs: frontend.log"

cd ..

# Mostrar URLs
echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Entorno de desarrollo iniciado${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "🌐 ${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "🔧 ${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "📚 ${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"
echo ""

# Seguir logs del frontend (más interesante para desarrollo)
tail -f frontend.log
