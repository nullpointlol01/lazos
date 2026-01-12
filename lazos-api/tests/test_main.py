"""
Tests for main application endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"


def test_root():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "LAZOS API"
    assert data["version"] == "1.0.0"
    assert "docs" in data
    assert "health" in data


def test_openapi_docs():
    """Test that OpenAPI docs are available"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc():
    """Test that ReDoc is available"""
    response = client.get("/redoc")
    assert response.status_code == 200
