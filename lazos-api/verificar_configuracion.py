#!/usr/bin/env python3
"""
Script para verificar la configuración de R2_PUBLIC_URL
Ejecutar: python verificar_configuracion.py
"""

import sys
import os

# Agregar path para importar app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.config import settings

    print("=" * 80)
    print("VERIFICACIÓN DE CONFIGURACIÓN - LAZOS API")
    print("=" * 80)
    print()

    # Verificar R2_ENDPOINT
    print(f"R2_ENDPOINT: {settings.R2_ENDPOINT[:50]}..." if settings.R2_ENDPOINT else "R2_ENDPOINT: ❌ NO CONFIGURADO")

    # Verificar R2_BUCKET
    print(f"R2_BUCKET: {settings.R2_BUCKET}")

    # Verificar R2_PUBLIC_URL (CRÍTICO)
    print(f"R2_PUBLIC_URL: {settings.R2_PUBLIC_URL}")
    print()

    if not settings.R2_PUBLIC_URL:
        print("❌ ERROR CRÍTICO: R2_PUBLIC_URL está vacío!")
        print()
        print("Consecuencias:")
        print("  - Las URLs de imágenes serán rutas relativas: /posts/uuid.jpg")
        print("  - Las imágenes NO se cargarán en el frontend")
        print()
        print("Solución:")
        print("  1. Verificar que lazos-api/.env contiene:")
        print("     R2_PUBLIC_URL=https://pub-XXXXXXXXXXXXX.r2.dev")
        print("  2. REINICIAR el servidor backend (Ctrl+C y volver a ejecutar)")
        print("  3. Ejecutar este script de nuevo para verificar")
        print()
        sys.exit(1)
    else:
        print("✅ R2_PUBLIC_URL configurado correctamente")
        print()

        # Simular generación de URL
        test_uuid = "abc123-def456"
        test_image_url = f"{settings.R2_PUBLIC_URL}/posts/{test_uuid}.jpg"
        test_thumb_url = f"{settings.R2_PUBLIC_URL}/posts/{test_uuid}_thumb.jpg"

        print("URLs de ejemplo que se generarían:")
        print(f"  - image_url: {test_image_url}")
        print(f"  - thumb_url: {test_thumb_url}")
        print()

        if test_image_url.startswith("http"):
            print("✅ Las URLs generadas son URLs completas (correcto)")
        else:
            print("❌ Las URLs generadas son rutas relativas (incorrecto)")

    print("=" * 80)

except ImportError as e:
    print(f"❌ Error importando configuración: {e}")
    print()
    print("Asegúrate de ejecutar desde el directorio lazos-api:")
    print("  cd lazos-api")
    print("  python verificar_configuracion.py")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
