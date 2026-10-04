# HackOps backend

FastAPI and PostgreSQL foundation for the CuriousPARC operations platform.

## Run locally

From the repository root:

```powershell
docker compose up --build
```

Then open:

- API documentation: <http://localhost:8000/docs>
- Liveness: <http://localhost:8000/api/v1/health/live>
- Readiness: <http://localhost:8000/api/v1/health/ready>

The default Compose credentials are local-development values only. Copy
`.env.example` to `.env` and replace secrets before using a shared environment.

## Migrations

Apply all migrations:

```powershell
docker compose exec backend alembic upgrade head
```

Create the next migration after adding domain models:

```powershell
docker compose exec backend alembic revision --autogenerate -m "describe change"
```

## Reference data

The development reference seed is idempotent and creates CuriousPARC 2026,
Theme 1, 18 consistent room codes, five judging panels, and Round 1:

```powershell
docker compose exec backend python -m app.scripts.seed_reference_data
```

The seed deliberately does not create a staff account; authentication and
password provisioning use the explicit bootstrap command below.

## Bootstrap the first administrator

After seeding reference data, provide the password through an environment
variable so it is not stored in the repository or passed as a command argument:

```powershell
$env:HACKOPS_BOOTSTRAP_PASSWORD = "replace-with-a-long-unique-password"
docker compose exec backend python -m app.scripts.bootstrap_admin `
  --staff-code HC-ADMIN-001 `
  --full-name "Hackathon Administrator"
Remove-Item Env:HACKOPS_BOOTSTRAP_PASSWORD
```

See `docs/api-reference.md` at the repository root for route purposes,
permissions, frontend mapping, and request/response examples.

## Team CSV import

Start with `data/team-import-template.csv`. Validate without writing:

```powershell
docker compose exec backend python -m app.scripts.import_teams `
  --file data/team-import-template.csv
```

Commit a valid import by adding `--commit`. Re-running the same import skips
matching existing teams; conflicting uses of a team code are rejected.

Required spreadsheet columns are `Team ID`, `Team Name`, `Team Leader Name`,
`Team Leader Contact No`, and `Track`. `Team Leader Email` and
`Expected Member Count` are optional. Export XLSX/Google Sheets data as UTF-8
CSV before importing.

## Tests and lint

```powershell
docker compose exec backend pytest
docker compose exec backend ruff check .
```
