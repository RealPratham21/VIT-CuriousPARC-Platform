from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


class APIError(Exception):
    def __init__(self, status: int, code: str, title: str, detail: str) -> None:
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail


def problem(request: Request, *, status: int, code: str, title: str, detail: Any) -> dict:
    return {
        "type": f"https://api.curiousparc.in/problems/{code.lower().replace('_', '-')}",
        "title": title,
        "status": status,
        "code": code,
        "detail": detail,
        "request_id": getattr(request.state, "request_id", "unknown"),
    }


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content=problem(
                request,
                status=exc.status,
                code=exc.code,
                title=exc.title,
                detail=exc.detail,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=problem(
                request,
                status=422,
                code="VALIDATION_ERROR",
                title="Request validation failed",
                detail=jsonable_encoder(exc.errors()),
            ),
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, _: IntegrityError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content=problem(
                request,
                status=409,
                code="RESOURCE_CONFLICT",
                title="Resource conflict",
                detail="The request conflicts with an existing record or operational invariant.",
            ),
        )


def not_found(resource: str) -> APIError:
    return APIError(404, "RESOURCE_NOT_FOUND", "Resource not found", f"{resource} was not found.")


def conflict(code: str, detail: str) -> APIError:
    return APIError(409, code, "Operational state conflict", detail)
