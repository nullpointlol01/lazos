"""
Servicio de almacenamiento en Cloudflare R2 (S3-compatible)
"""
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import uuid
from typing import Tuple, List
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Servicio para subir archivos a Cloudflare R2"""

    def __init__(self):
        """Inicializa el cliente S3 para R2"""
        # Verificar configuración de R2_PUBLIC_URL
        logger.info(f"[StorageService] R2_PUBLIC_URL configurado: '{settings.R2_PUBLIC_URL}'")
        if not settings.R2_PUBLIC_URL:
            logger.error("[StorageService] ¡ADVERTENCIA! R2_PUBLIC_URL está vacío. Las URLs de imágenes serán rutas relativas.")

        # Configurar cliente S3 para R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY,
            aws_secret_access_key=settings.R2_SECRET_KEY,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )
        self.bucket = settings.R2_BUCKET

    def upload_image(self, image_bytes: bytes, thumbnail_bytes: bytes) -> Tuple[str, str]:
        """
        Sube imagen y thumbnail a R2

        Args:
            image_bytes: Bytes de la imagen principal
            thumbnail_bytes: Bytes del thumbnail

        Returns:
            Tuple[str, str]: (url_imagen, url_thumbnail)

        Raises:
            Exception: Si falla la subida
        """
        try:
            # Generar nombre único usando UUID
            file_id = str(uuid.uuid4())

            # Nombres de archivos
            image_key = f"posts/{file_id}.jpg"
            thumb_key = f"posts/{file_id}_thumb.jpg"

            # Subir imagen principal
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=image_key,
                Body=image_bytes,
                ContentType='image/jpeg',
                # ACL='public-read'  # Comentado: configurar permisos en bucket
            )

            # Subir thumbnail
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=thumb_key,
                Body=thumbnail_bytes,
                ContentType='image/jpeg',
                # ACL='public-read'  # Comentado: configurar permisos en bucket
            )

            # Construir URLs públicas usando R2.dev subdomain público
            base_url = settings.R2_PUBLIC_URL
            logger.info(f"[StorageService] base_url = '{base_url}'")

            image_url = f"{base_url}/{image_key}"
            thumb_url = f"{base_url}/{thumb_key}"

            logger.info(f"[StorageService] Imagen subida exitosamente: {image_key}")
            logger.info(f"[StorageService] image_url generada: {image_url}")
            logger.info(f"[StorageService] thumb_url generada: {thumb_url}")

            return image_url, thumb_url

        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"Error subiendo a R2: {error_code} - {error_msg}")
            raise Exception(f"Error subiendo imagen: {error_msg}")
        except Exception as e:
            logger.error(f"Error inesperado subiendo imagen: {str(e)}")
            raise Exception(f"Error subiendo imagen: {str(e)}")

    def upload_images(self, images_data: List[Tuple[bytes, bytes]]) -> List[Tuple[str, str]]:
        """
        Sube múltiples imágenes y thumbnails a R2

        Args:
            images_data: Lista de tuplas (image_bytes, thumbnail_bytes)

        Returns:
            List[Tuple[str, str]]: Lista de tuplas (url_imagen, url_thumbnail)

        Raises:
            Exception: Si falla la subida de alguna imagen
        """
        results = []

        for idx, (image_bytes, thumbnail_bytes) in enumerate(images_data):
            try:
                # Generar nombre único usando UUID
                file_id = str(uuid.uuid4())

                # Nombres de archivos
                image_key = f"posts/{file_id}.jpg"
                thumb_key = f"posts/{file_id}_thumb.jpg"

                # Subir imagen principal
                self.s3_client.put_object(
                    Bucket=self.bucket,
                    Key=image_key,
                    Body=image_bytes,
                    ContentType='image/jpeg',
                )

                # Subir thumbnail
                self.s3_client.put_object(
                    Bucket=self.bucket,
                    Key=thumb_key,
                    Body=thumbnail_bytes,
                    ContentType='image/jpeg',
                )

                # Construir URLs públicas
                base_url = settings.R2_PUBLIC_URL
                image_url = f"{base_url}/{image_key}"
                thumb_url = f"{base_url}/{thumb_key}"

                logger.info(f"[StorageService] Imagen {idx + 1} subida: {image_key}")
                logger.info(f"[StorageService] URLs generadas: {image_url}, {thumb_url}")

                results.append((image_url, thumb_url))

            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_msg = e.response['Error']['Message']
                logger.error(f"Error subiendo imagen {idx + 1} a R2: {error_code} - {error_msg}")
                raise Exception(f"Error subiendo imagen {idx + 1}: {error_msg}")
            except Exception as e:
                logger.error(f"Error inesperado subiendo imagen {idx + 1}: {str(e)}")
                raise Exception(f"Error subiendo imagen {idx + 1}: {str(e)}")

        logger.info(f"[StorageService] {len(results)} imágenes subidas exitosamente")
        return results

    def delete_image(self, image_url: str, thumbnail_url: str) -> None:
        """
        Elimina imagen y thumbnail de R2

        Args:
            image_url: URL de la imagen principal
            thumbnail_url: URL del thumbnail
        """
        try:
            # Extraer keys de las URLs
            image_key = image_url.split(f"{self.bucket}/")[-1]
            thumb_key = thumbnail_url.split(f"{self.bucket}/")[-1]

            # Eliminar archivos
            self.s3_client.delete_objects(
                Bucket=self.bucket,
                Delete={
                    'Objects': [
                        {'Key': image_key},
                        {'Key': thumb_key}
                    ]
                }
            )

            logger.info(f"Imágenes eliminadas: {image_key}, {thumb_key}")

        except ClientError as e:
            logger.error(f"Error eliminando de R2: {str(e)}")
            # No lanzar excepción, solo logear (soft fail)
        except Exception as e:
            logger.error(f"Error inesperado eliminando imagen: {str(e)}")


# Singleton instance
_storage_service = None


def get_storage_service() -> StorageService:
    """
    Retorna instancia singleton del servicio de storage

    Returns:
        StorageService: Instancia del servicio
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
