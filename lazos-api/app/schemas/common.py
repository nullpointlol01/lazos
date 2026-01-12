"""
Common Pydantic schemas shared across the application
"""
from pydantic import BaseModel
from typing import Optional


class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None
