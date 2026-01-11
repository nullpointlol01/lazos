"""
Detector NSFW de Python - Fallback cuando Cloudflare AI falla
Usa análisis básico de imagen para detectar contenido potencialmente inapropiado
"""
import logging
from io import BytesIO
from PIL import Image
import colorsys
from typing import Dict

logger = logging.getLogger(__name__)


class NSFWDetector:
    """
    Detector NSFW básico usando análisis de colores de piel.
    Implementación simple sin dependencias pesadas.
    """

    @staticmethod
    def _is_skin_tone(r: int, g: int, b: int) -> bool:
        """
        Detecta si un píxel es tono de piel humana.
        Basado en rangos RGB conocidos para tonos de piel.
        """
        # Convertir a HSV para mejor detección
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)

        # Rangos para tonos de piel en HSV
        # H: 0-50 (tonos naranjas/rojizos)
        # S: 0.2-0.7 (saturación media)
        # V: 0.4-1.0 (luminosidad media-alta)
        skin_h = 0 <= h <= 0.15 or 0.95 <= h <= 1.0
        skin_s = 0.15 <= s <= 0.75
        skin_v = 0.35 <= v <= 0.95

        # También verificar en RGB
        skin_rgb = (
            r > 60 and r < 255 and
            g > 40 and g < 255 and
            b > 20 and b < 255 and
            r > g and g > b and
            (r - g) > 15 and
            (r - b) > 15
        )

        return (skin_h and skin_s and skin_v) or skin_rgb

    @staticmethod
    async def detect_nsfw(image_bytes: bytes) -> Dict[str, any]:
        """
        Analiza imagen para detectar alto porcentaje de tonos de piel.
        Un alto porcentaje PUEDE indicar contenido NSFW.

        Args:
            image_bytes: Bytes de la imagen a analizar

        Returns:
            dict: {
                "is_valid": bool,
                "reason": str,
                "confidence": float (0.0-1.0),
                "service": str  # "python_nsfw"
            }
        """
        try:
            # Abrir imagen
            img = Image.open(BytesIO(image_bytes))

            # Convertir a RGB si es necesario
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Redimensionar para análisis rápido (max 300x300)
            img.thumbnail((300, 300), Image.Resampling.LANCZOS)

            # Obtener todos los píxeles
            pixels = list(img.getdata())
            total_pixels = len(pixels)

            if total_pixels == 0:
                return {
                    "is_valid": True,
                    "reason": "Imagen vacía",
                    "confidence": 0.0,
                    "service": "python_nsfw"
                }

            # Contar píxeles con tonos de piel
            skin_pixels = sum(1 for r, g, b in pixels if NSFWDetector._is_skin_tone(r, g, b))

            # Calcular porcentaje de tonos de piel
            skin_percentage = (skin_pixels / total_pixels) * 100

            logger.info(f"[Python NSFW] Análisis: {skin_percentage:.1f}% tonos de piel")

            # Umbrales:
            # < 30%: Probablemente OK (animales tienen poco tono de piel)
            # 30-50%: Zona gris, pasar a revisión manual
            # > 50%: Alto riesgo NSFW

            if skin_percentage < 30:
                return {
                    "is_valid": True,
                    "reason": "Bajo porcentaje de tonos de piel",
                    "confidence": 0.8,
                    "service": "python_nsfw"
                }
            elif skin_percentage < 50:
                # Zona gris: marcar para moderación manual
                return {
                    "is_valid": False,
                    "reason": f"Porcentaje medio de tonos de piel ({skin_percentage:.1f}%) - requiere revisión",
                    "confidence": 0.5,
                    "service": "python_nsfw"
                }
            else:
                # Alto riesgo
                return {
                    "is_valid": False,
                    "reason": f"Alto porcentaje de tonos de piel ({skin_percentage:.1f}%) - posible NSFW",
                    "confidence": 0.7,
                    "service": "python_nsfw"
                }

        except Exception as e:
            logger.error(f"Error en detector Python NSFW: {str(e)}")
            # En caso de error, aprobar para que no se bloquee todo
            return {
                "is_valid": True,
                "reason": f"Error en análisis: {str(e)}",
                "confidence": 0.0,
                "service": "python_nsfw"
            }


# Instancia global
detector = NSFWDetector()


async def detect_nsfw(image_bytes: bytes) -> Dict[str, any]:
    """Función helper para usar el detector"""
    return await detector.detect_nsfw(image_bytes)
