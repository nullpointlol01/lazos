"""
Report Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.models.report import ReportReasonEnum


class ReportCreate(BaseModel):
    """Schema for creating a new report"""
    post_id: Optional[UUID] = None
    alert_id: Optional[UUID] = None
    reason: ReportReasonEnum
    description: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode='after')
    def check_post_or_alert(self):
        """Validate that either post_id or alert_id is set, but not both"""
        if not self.post_id and not self.alert_id:
            raise ValueError('Either post_id or alert_id must be provided')
        if self.post_id and self.alert_id:
            raise ValueError('Cannot report both post and alert at the same time')
        return self


class ReportResponse(BaseModel):
    """Schema for report responses"""
    id: UUID
    post_id: Optional[UUID] = None
    alert_id: Optional[UUID] = None
    reason: ReportReasonEnum
    description: Optional[str] = None
    reporter_ip: Optional[str] = None
    created_at: datetime
    resolved: bool

    model_config = ConfigDict(from_attributes=True)
