"""
Admin API endpoints
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.report import Report
from app.models.post import Post
from app.models.post_image import PostImage
from app.models.alert import Alert
from app.config import settings

router = APIRouter()


def verify_admin_password(x_admin_password: Optional[str] = Header(None)):
    """Dependency to verify admin password"""
    if not x_admin_password or x_admin_password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return x_admin_password


@router.get("/admin/reports")
async def list_pending_reports(
    resolved: bool = False,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    List all reports (pending by default).

    - **resolved**: Filter by resolution status (default: False)

    Returns reports with post or alert data including:
    - Report details
    - Post thumbnail and basic info (if post report)
    - Alert details (if alert report)
    - Report count per post/alert
    """
    # Query reports with post data
    reports = (
        db.query(Report)
        .filter(Report.resolved == resolved)
        .order_by(Report.created_at.desc())
        .all()
    )

    # Build response with post/alert data
    result = []
    for report in reports:
        # Check if report is for a post or an alert
        if report.post_id:
            # Report is for a post
            post = report.post

            # Get first image (primary or first by order)
            first_image = (
                db.query(PostImage)
                .filter(PostImage.post_id == post.id)
                .order_by(PostImage.is_primary.desc(), PostImage.display_order)
                .first()
            )

            # Count total reports for this post
            total_reports = (
                db.query(func.count(Report.id))
                .filter(Report.post_id == post.id, Report.resolved == False)
                .scalar()
            )

            result.append({
                "id": str(report.id),
                "post_id": str(report.post_id),
                "alert_id": None,
                "reason": report.reason.value,
                "description": report.description,
                "reporter_ip": report.reporter_ip,
                "created_at": report.created_at.isoformat(),
                "resolved": report.resolved,
                "post": {
                    "id": str(post.id),
                    "thumbnail_url": first_image.thumbnail_url if first_image else None,
                    "animal_type": post.animal_type.value,
                    "size": post.size.value,
                    "sex": post.sex.value,
                    "location_name": post.location_name,
                    "sighting_date": post.sighting_date.isoformat(),
                    "created_at": post.created_at.isoformat(),
                    "is_active": post.is_active,
                    "description": post.description[:100] + "..." if post.description and len(post.description) > 100 else post.description,
                    "total_reports": total_reports,
                },
                "alert": None
            })
        else:
            # Report is for an alert
            alert = report.alert

            # Count total reports for this alert
            total_reports = (
                db.query(func.count(Report.id))
                .filter(Report.alert_id == alert.id, Report.resolved == False)
                .scalar()
            )

            result.append({
                "id": str(report.id),
                "post_id": None,
                "alert_id": str(report.alert_id),
                "reason": report.reason.value,
                "description": report.description,
                "reporter_ip": report.reporter_ip,
                "created_at": report.created_at.isoformat(),
                "resolved": report.resolved,
                "post": None,
                "alert": {
                    "id": str(alert.id),
                    "animal_type": alert.animal_type.value,
                    "location_name": alert.location_name,
                    "direction": alert.direction,
                    "created_at": alert.created_at.isoformat(),
                    "is_active": alert.is_active,
                    "description": alert.description[:100] + "..." if alert.description and len(alert.description) > 100 else alert.description,
                    "total_reports": total_reports,
                }
            })

    return {
        "data": result,
        "meta": {
            "total": len(result),
            "resolved": resolved,
        }
    }


@router.post("/admin/reports/{report_id}/resolve")
async def resolve_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Mark a report as resolved (ignored).

    Does NOT delete the post, just marks the report as reviewed.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    report.resolved = True
    db.commit()

    return {
        "message": "Report marked as resolved",
        "report_id": str(report_id)
    }


@router.delete("/admin/posts/{post_id}")
async def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Soft delete a post (set is_active = False).

    Also marks all pending reports for this post as resolved.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    # Soft delete post
    post.is_active = False

    # Resolve all pending reports for this post
    db.query(Report).filter(
        Report.post_id == post_id,
        Report.resolved == False
    ).update({"resolved": True})

    db.commit()

    return {
        "message": "Post deleted and reports resolved",
        "post_id": str(post_id)
    }


@router.delete("/admin/alerts/{alert_id}")
async def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Soft delete an alert (set is_active = False).

    Also marks all pending reports for this alert as resolved.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Soft delete alert
    alert.is_active = False

    # Resolve all pending reports for this alert
    db.query(Report).filter(
        Report.alert_id == alert_id,
        Report.resolved == False
    ).update({"resolved": True})

    db.commit()

    return {
        "message": "Alert deleted and reports resolved",
        "alert_id": str(alert_id)
    }


@router.get("/admin/pending")
async def list_pending_posts(
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    List all posts pending moderation approval.

    Returns posts with pending_approval = True, ordered by creation date (newest first).
    Includes post details and first image for preview.
    """
    # Query posts pending approval
    posts = (
        db.query(Post)
        .filter(Post.pending_approval == True)
        .order_by(Post.created_at.desc())
        .all()
    )

    # Build response with post data
    result = []
    for post in posts:
        # Get first image (primary or first by order)
        first_image = (
            db.query(PostImage)
            .filter(PostImage.post_id == post.id)
            .order_by(PostImage.is_primary.desc(), PostImage.display_order)
            .first()
        )

        # Extract lat/lng from geography
        db_geom = db.scalar(func.ST_AsText(post.location))
        coords = db_geom.replace('POINT(', '').replace(')', '').split()
        longitude = float(coords[0])
        latitude = float(coords[1])

        result.append({
            "id": str(post.id),
            "image_url": first_image.image_url if first_image else post.image_url,
            "thumbnail_url": first_image.thumbnail_url if first_image else post.thumbnail_url,
            "animal_type": post.animal_type.value,
            "size": post.size.value,
            "sex": post.sex.value,
            "location_name": post.location_name,
            "latitude": latitude,
            "longitude": longitude,
            "sighting_date": post.sighting_date.isoformat(),
            "created_at": post.created_at.isoformat(),
            "description": post.description,
            "contact_method": post.contact_method,
            "is_active": post.is_active,
            "moderation_reason": post.moderation_reason,
            "validation_service": post.validation_service,
        })

    return {
        "data": result,
        "meta": {
            "total": len(result),
        }
    }


@router.post("/admin/pending/{post_id}/approve")
async def approve_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Approve a post that was pending moderation.

    Sets pending_approval = False and records moderation_date.
    The post will become visible to regular users.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not post.pending_approval:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post is not pending approval"
        )

    # Approve the post
    post.pending_approval = False
    post.moderation_date = datetime.utcnow()
    db.commit()

    return {
        "message": "Post approved successfully",
        "post_id": str(post_id)
    }


@router.post("/admin/pending/{post_id}/reject")
async def reject_post(
    post_id: UUID,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Reject a post that was pending moderation.

    Sets is_active = False, pending_approval = False, and records moderation_date.
    Optionally accepts a reason for the rejection.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not post.pending_approval:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post is not pending approval"
        )

    # Reject the post
    post.is_active = False
    post.pending_approval = False
    post.moderation_date = datetime.utcnow()
    if reason:
        post.moderation_reason = reason
    db.commit()

    return {
        "message": "Post rejected successfully",
        "post_id": str(post_id)
    }


@router.get("/admin/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_password),
):
    """
    Get admin dashboard statistics.

    Returns:
    - Total posts (active and inactive)
    - Pending reports count
    - Resolved reports count
    - Posts with reports
    - Posts pending approval count
    """
    total_posts = db.query(func.count(Post.id)).scalar()
    active_posts = db.query(func.count(Post.id)).filter(Post.is_active == True).scalar()
    pending_approval_posts = db.query(func.count(Post.id)).filter(Post.pending_approval == True).scalar()
    pending_reports = db.query(func.count(Report.id)).filter(Report.resolved == False).scalar()
    resolved_reports = db.query(func.count(Report.id)).filter(Report.resolved == True).scalar()

    # Posts with at least one pending report
    posts_with_reports = db.query(func.count(func.distinct(Report.post_id))).filter(
        Report.resolved == False
    ).scalar()

    return {
        "total_posts": total_posts,
        "active_posts": active_posts,
        "inactive_posts": total_posts - active_posts,
        "pending_approval_posts": pending_approval_posts,
        "pending_reports": pending_reports,
        "resolved_reports": resolved_reports,
        "posts_with_reports": posts_with_reports,
    }
