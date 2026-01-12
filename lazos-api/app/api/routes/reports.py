"""
Reports API endpoints
"""
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

from app.database import get_db
from app.models.report import Report
from app.models.post import Post
from app.models.alert import Alert
from app.schemas.report import ReportCreate, ReportResponse
from app.services.email import EmailService
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Thread pool para envío de emails en background (no bloquear respuesta HTTP)
email_executor = ThreadPoolExecutor(max_workers=2)


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Create a new report for a post or alert.

    - **post_id**: UUID of the post to report (mutually exclusive with alert_id)
    - **alert_id**: UUID of the alert to report (mutually exclusive with post_id)
    - **reason**: Reason for the report (not_animal, inappropriate, spam, other)
    - **description**: Optional detailed description

    Sends email notification to moderator if SMTP is configured.
    """
    item_url = None
    item_id = None

    # Verify item exists (post or alert)
    if report.post_id:
        post = db.query(Post).filter(Post.id == report.post_id).first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        item_url = f"{settings.R2_PUBLIC_URL or 'https://lazos.app'}/post/{post.id}"
        item_id = str(post.id)

    elif report.alert_id:
        alert = db.query(Alert).filter(Alert.id == report.alert_id).first()
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        item_url = f"{settings.R2_PUBLIC_URL or 'https://lazos.app'}/avisos/{alert.id}"
        item_id = str(alert.id)

    # Get reporter IP
    reporter_ip = request.client.host if request.client else None

    # Create report
    db_report = Report(
        post_id=report.post_id,
        alert_id=report.alert_id,
        reason=report.reason,
        description=report.description,
        reporter_ip=reporter_ip,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Send email notification en background (NO bloquear respuesta HTTP)
    # Si SMTP falla o tarda 2+ minutos, el cliente ya recibió 201
    async def send_email_background():
        try:
            await asyncio.get_event_loop().run_in_executor(
                email_executor,
                EmailService.send_report_notification,
                item_id,  # post_id
                report.reason.value,  # reason
                report.description,  # description
                item_url  # post_url
            )
            logger.info(f"✅ Email enviado para reporte {db_report.id}")
        except Exception as e:
            # Log error pero no afecta la respuesta (ya fue enviada)
            logger.error(f"❌ Error enviando email para reporte {db_report.id}: {e}")

    # Programar envío en background (fire-and-forget)
    asyncio.create_task(send_email_background())

    # Responder INMEDIATAMENTE (no esperar email)
    return db_report
