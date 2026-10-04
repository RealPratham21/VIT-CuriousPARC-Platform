from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.main import app
from app.schemas.contracts import EvaluationStaff, TeamDetailPublic


def test_password_hashing_and_access_token_round_trip() -> None:
    password = "a-strong-test-password"
    password_hash = hash_password(password)
    user_id = uuid4()

    assert password_hash != password
    assert verify_password(password, password_hash)
    assert not verify_password("wrong-password", password_hash)

    token, expires_in = create_access_token(user_id)
    assert expires_in > 0
    assert decode_access_token(token) == user_id


def test_public_contracts_cannot_contain_private_fields() -> None:
    team_fields = TeamDetailPublic.model_fields
    evaluation_fields = EvaluationStaff.model_fields

    assert "phone_e164" not in team_fields
    assert "email" not in team_fields
    assert "private_note" not in team_fields
    assert "private_note" in evaluation_fields


@pytest.mark.asyncio
async def test_openapi_contains_phase_one_surfaces() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    expected = {
        "/api/v1/public/events/{slug}/dashboard",
        "/api/v1/public/events/{slug}/teams",
        "/api/v1/public/events/{slug}/rooms",
        "/api/v1/public/events/{slug}/rounds/{round_id}/evaluations",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/staff/events/{event_id}/teams",
        "/api/v1/staff/events/{event_id}/evaluations/{evaluation_id}/start",
        "/api/v1/admin/events/{event_id}/staff-users",
    }
    assert expected.issubset(paths)


@pytest.mark.asyncio
async def test_validation_errors_use_problem_contract() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"staff_code": "x", "password": "short"},
            headers={"X-Request-ID": "req_validation_test"},
        )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["request_id"] == "req_validation_test"
