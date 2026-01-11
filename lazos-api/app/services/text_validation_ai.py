"""
Servicio de validación semántica de texto usando Cloudflare Workers AI
"""
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TextValidationAI:
    def __init__(self, account_id: Optional[str] = None, api_token: Optional[str] = None):
        self.account_id = account_id
        self.api_token = api_token
        self.model = "@cf/meta/llama-3-8b-instruct"

        if self.account_id and self.api_token:
            self.endpoint = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{self.model}"
        else:
            self.endpoint = None

    async def validate_sighting_text(self, text: str) -> dict:
        """
        Valida si el texto describe un avistamiento de mascota.

        Returns:
            dict: {
                "is_valid": bool,
                "reason": str,
                "confidence": float (0.0-1.0)
            }
        """
        if not self.account_id or not self.api_token:
            logger.warning("Cloudflare AI no configurado, aprobando por defecto")
            return {"is_valid": True, "reason": "AI no configurada", "confidence": 0.0}

        if not text or len(text.strip()) < 10:
            return {"is_valid": True, "reason": "Texto muy corto, skip validación", "confidence": 0.0}

        try:
            prompt = f"""Analiza si el siguiente texto describe un avistamiento de animal (perro, gato, mascota) o da indicaciones de ubicación/dirección donde se vio.

Texto: "{text}"

Responde ÚNICAMENTE una palabra:
- VALIDO si describe un animal, ubicación, características físicas, o dirección
- INVALIDO si es spam, prueba, sin sentido, o no relacionado con avistamientos

Respuesta:"""

            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }

            payload = {
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 10,
                "temperature": 0.1
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.endpoint, headers=headers, json=payload)

                if response.status_code != 200:
                    logger.error(f"Cloudflare AI error: {response.status_code}")
                    return {"is_valid": True, "reason": "API error", "confidence": 0.0}

                result = response.json()
                ai_response = result.get("result", {}).get("response", "").upper().strip()

                logger.info(f"[AI] Texto: '{text[:50]}...' → {ai_response}")

                is_valid = "VALIDO" in ai_response and "INVALIDO" not in ai_response

                return {
                    "is_valid": is_valid,
                    "reason": "Aprobado por IA" if is_valid else "Texto no parece describir un avistamiento",
                    "confidence": 0.8 if is_valid else 0.2
                }

        except Exception as e:
            logger.error(f"Error AI: {str(e)}")
            return {"is_valid": True, "reason": f"Error: {str(e)}", "confidence": 0.0}


_instance = None


def get_text_validation_ai() -> TextValidationAI:
    """
    Singleton para obtener instancia de TextValidationAI.
    Carga credenciales desde settings en primera llamada.
    """
    global _instance
    if _instance is None:
        from app.config import settings
        _instance = TextValidationAI(
            account_id=getattr(settings, 'CLOUDFLARE_ACCOUNT_ID', None),
            api_token=getattr(settings, 'CLOUDFLARE_API_TOKEN', None)
        )
    return _instance
