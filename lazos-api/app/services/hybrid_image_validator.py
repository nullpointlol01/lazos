"""
Validador híbrido de imágenes - Estrategia de 2 fases
Fase 1: Python NSFW (rápido, todas las imágenes)
Fase 2: Cloudflare AI (preciso, solo imágenes sospechosas)
"""
import asyncio
import logging
from typing import List, Dict, Tuple
from app.services.nsfw_detector import detect_nsfw
from app.services.image_validation_ai import get_image_validation_ai

logger = logging.getLogger(__name__)


class HybridImageValidator:
    """
    Validador híbrido con estrategia de 2 fases:

    1. Python NSFW valida TODAS las imágenes en paralelo (~200ms total)
    2. Si encuentra sospechosas, Cloudflare AI las valida en paralelo (~1-2s)

    Ventajas:
    - Rápido para casos normales (95%+): solo 200ms
    - Preciso para casos sospechosos: doble validación
    - Ahorra 97% de llamadas a Cloudflare AI
    """

    def __init__(self):
        self.cloudflare_validator = get_image_validation_ai()

    async def validate_all(self, images_data: List[bytes]) -> Dict[str, any]:
        """
        Valida todas las imágenes con estrategia híbrida.

        Args:
            images_data: Lista de bytes de imágenes a validar

        Returns:
            dict: {
                "is_valid": bool,
                "reason": str,
                "service": str,  # "python_nsfw" o "cloudflare_ai"
                "flagged_images": List[int],  # índices de imágenes problemáticas
                "confidence": float
            }
        """
        if not images_data:
            return {
                "is_valid": True,
                "reason": "No hay imágenes para validar",
                "service": "none",
                "flagged_images": [],
                "confidence": 0.0
            }

        total_images = len(images_data)
        logger.info(f"[Hybrid Validator] Iniciando validación de {total_images} imágenes")

        # ========================================
        # FASE 1: Python NSFW (TODAS en paralelo)
        # ========================================
        logger.info(f"[Hybrid Validator] Fase 1: Python NSFW validando {total_images} imágenes...")

        try:
            python_results = await asyncio.gather(*[
                detect_nsfw(img_bytes) for img_bytes in images_data
            ])
        except Exception as e:
            logger.error(f"[Hybrid Validator] Error en Fase 1 Python NSFW: {str(e)}")
            # Si Python NSFW falla, aprobar por defecto (no bloquear subida)
            return {
                "is_valid": True,
                "reason": f"Error en validación Python NSFW: {str(e)}",
                "service": "python_nsfw",
                "flagged_images": [],
                "confidence": 0.0
            }

        # Identificar imágenes sospechosas (Python marcó como no válidas)
        suspicious_indices = [
            i for i, result in enumerate(python_results)
            if not result["is_valid"]
        ]

        logger.info(f"[Hybrid Validator] Fase 1 completada: {len(suspicious_indices)}/{total_images} imágenes sospechosas")

        # Si Python no encontró nada sospechoso → aprobar todo ✅
        if not suspicious_indices:
            logger.info("[Hybrid Validator] ✅ Todas las imágenes aprobadas por Python NSFW")
            return {
                "is_valid": True,
                "reason": f"Todas las imágenes ({total_images}) aprobadas por Python NSFW",
                "service": "python_nsfw",
                "flagged_images": [],
                "confidence": 0.8
            }

        # ========================================
        # FASE 2: Cloudflare AI (solo sospechosas)
        # ========================================
        logger.info(f"[Hybrid Validator] Fase 2: Cloudflare AI validando {len(suspicious_indices)} imágenes sospechosas...")

        # Si Cloudflare AI no está configurado → confiar en Python NSFW
        if not self.cloudflare_validator.endpoint:
            logger.warning("[Hybrid Validator] Cloudflare AI no configurado, confiando en Python NSFW")
            flagged_reasons = [
                python_results[i]["reason"] for i in suspicious_indices
            ]
            return {
                "is_valid": False,
                "reason": f"Imágenes {suspicious_indices} marcadas por Python NSFW: {', '.join(flagged_reasons)}",
                "service": "python_nsfw",
                "flagged_images": suspicious_indices,
                "confidence": 0.6
            }

        # Validar solo las sospechosas con Cloudflare AI (en paralelo)
        try:
            cloudflare_tasks = [
                self.cloudflare_validator.validate_image(images_data[i])
                for i in suspicious_indices
            ]

            cloudflare_results = await asyncio.gather(*cloudflare_tasks)

        except Exception as e:
            logger.error(f"[Hybrid Validator] Error en Fase 2 Cloudflare AI: {str(e)}")
            # Si Cloudflare AI falla → confiar en Python NSFW
            flagged_reasons = [
                python_results[i]["reason"] for i in suspicious_indices
            ]
            return {
                "is_valid": False,
                "reason": f"Imágenes {suspicious_indices} marcadas por Python NSFW (Cloudflare AI error: {str(e)})",
                "service": "python_nsfw",
                "flagged_images": suspicious_indices,
                "confidence": 0.6
            }

        # Verificar qué imágenes Cloudflare AI confirmó como problemáticas
        confirmed_flagged = []
        for original_idx, cf_result in zip(suspicious_indices, cloudflare_results):
            if cf_result is None:
                # Cloudflare AI falló para esta imagen → confiar en Python
                confirmed_flagged.append(original_idx)
                logger.warning(f"[Hybrid Validator] Imagen {original_idx}: Cloudflare AI falló, confiando en Python NSFW")
            elif not cf_result["is_valid"]:
                # Cloudflare AI confirmó el problema
                confirmed_flagged.append(original_idx)
                logger.warning(f"[Hybrid Validator] Imagen {original_idx}: Cloudflare AI confirmó problema: {cf_result['reason']}")
            else:
                # Cloudflare AI aprobó la imagen que Python marcó como sospechosa
                logger.info(f"[Hybrid Validator] Imagen {original_idx}: Cloudflare AI aprobó (Python fue falso positivo)")

        # Resultado final
        if confirmed_flagged:
            logger.warning(f"[Hybrid Validator] ❌ {len(confirmed_flagged)}/{total_images} imágenes rechazadas: {confirmed_flagged}")
            return {
                "is_valid": False,
                "reason": f"Imágenes {confirmed_flagged} contienen contenido inapropiado (confirmado por Cloudflare AI)",
                "service": "cloudflare_ai",
                "flagged_images": confirmed_flagged,
                "confidence": 0.85
            }
        else:
            # Python marcó como sospechosas, pero Cloudflare AI las aprobó todas
            logger.info(f"[Hybrid Validator] ✅ Cloudflare AI aprobó todas las imágenes marcadas por Python (falsos positivos)")
            return {
                "is_valid": True,
                "reason": f"Cloudflare AI aprobó las {len(suspicious_indices)} imágenes marcadas por Python (falsos positivos)",
                "service": "cloudflare_ai",
                "flagged_images": [],
                "confidence": 0.9
            }


# Singleton global
_validator_instance = None


def get_hybrid_validator() -> HybridImageValidator:
    """Obtiene instancia singleton del validador híbrido"""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = HybridImageValidator()
    return _validator_instance
