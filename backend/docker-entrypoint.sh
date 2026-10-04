#!/bin/sh
set -eu

alembic upgrade head

if [ "${ENVIRONMENT:-development}" != "production" ]; then
  python -m app.scripts.seed_reference_data
  python -m app.scripts.seed_demo_teams
  python -m app.scripts.seed_demo_announcement
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
