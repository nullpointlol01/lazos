"""
Email service for sending notifications
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    def send_report_notification(
        post_id: str,
        reason: str,
        description: Optional[str] = None,
        post_url: Optional[str] = None
    ) -> bool:
        """
        Send email notification about a new report to moderator.

        Args:
            post_id: UUID of the reported post
            reason: Reason for the report
            description: Optional detailed description
            post_url: Optional URL to view the post

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        # Check if SMTP is configured
        if not settings.SMTP_HOST or not settings.MODERATOR_EMAIL:
            logger.warning("SMTP not configured, skipping email notification")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Lazos] Nuevo reporte - {reason}"
            msg['From'] = settings.SMTP_USER
            msg['To'] = settings.MODERATOR_EMAIL

            # Reason translations
            reason_translations = {
                'not_animal': 'No es un animal',
                'inappropriate': 'Contenido inapropiado',
                'spam': 'Spam',
                'other': 'Otro'
            }
            reason_text = reason_translations.get(reason, reason)

            # Build email body
            body_text = f"""
Nuevo reporte en LAZOS

Post ID: {post_id}
Razón: {reason_text}
"""

            if description:
                body_text += f"\nDescripción: {description}\n"

            if post_url:
                body_text += f"\nVer post: {post_url}\n"

            body_text += f"\nAccede al panel admin para revisar: {settings.R2_PUBLIC_URL or 'https://lazos.app'}/admin\n"

            # HTML version
            body_html = f"""
<html>
  <head></head>
  <body>
    <h2>Nuevo reporte en LAZOS</h2>
    <p><strong>Post ID:</strong> {post_id}</p>
    <p><strong>Razón:</strong> {reason_text}</p>
"""

            if description:
                body_html += f"    <p><strong>Descripción:</strong> {description}</p>\n"

            if post_url:
                body_html += f'    <p><a href="{post_url}">Ver post</a></p>\n'

            body_html += f"""
    <p><a href="{settings.R2_PUBLIC_URL or 'https://lazos.app'}/admin">Ir al panel admin</a></p>
  </body>
</html>
"""

            # Attach parts
            part1 = MIMEText(body_text, 'plain')
            part2 = MIMEText(body_html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"Report notification sent for post {post_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            # Don't raise exception - email failure shouldn't break the request
            return False


    @staticmethod
    def send_test_email(recipient: str) -> bool:
        """
        Send a test email to verify SMTP configuration.

        Args:
            recipient: Email address to send test to

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        if not settings.SMTP_HOST:
            logger.warning("SMTP not configured")
            return False

        try:
            msg = MIMEText("This is a test email from LAZOS API. SMTP is configured correctly!")
            msg['Subject'] = "[Lazos] Test Email"
            msg['From'] = settings.SMTP_USER
            msg['To'] = recipient

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"Test email sent to {recipient}")
            return True

        except Exception as e:
            logger.error(f"Failed to send test email: {e}")
            return False
