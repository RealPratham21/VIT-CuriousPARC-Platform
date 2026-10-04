import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_liveness() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "hackops-api"}
    assert response.headers["x-request-id"].startswith("req_")


@pytest.mark.asyncio
async def test_request_id_is_preserved() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/health/live",
            headers={"X-Request-ID": "req_test_request"},
        )

    assert response.headers["x-request-id"] == "req_test_request"
