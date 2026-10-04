from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LOCAL_JWT_SECRET = "local-development-secret-change-before-deploying"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "HackOps API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = (
        "postgresql+psycopg://hackops:hackops-local-password@db:5432/hackops_dev"
    )
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    log_level: str = "INFO"

    jwt_secret: str = LOCAL_JWT_SECRET
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            value = "postgresql://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    @model_validator(mode="after")
    def require_deployed_secret(self) -> "Settings":
        local_database = "@db:" in self.database_url or "@db/" in self.database_url
        if self.jwt_secret == LOCAL_JWT_SECRET and not local_database:
            raise ValueError("Set JWT_SECRET to a unique value before deploying.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
