# CuriousPARC 2026 — Event Operations Platform

CuriousPARC 2026 is the event operations platform for the CuriousPARC hackathon, built by the Hackathon Club, VIT Pune — Technical Team.

- Event: [CuriousPARC 2026](https://www.curiousparc.in/)
- Event dates: October 5–6, 2026
- Developer team: [Hackathon Club VIT Pune](https://www.linkedin.com/company/hackathon-club-vit-pune)

The platform is designed to give organizers a single operational control layer while giving participants clear, real-time visibility into event status, room allocation, evaluation progress, and coordination updates.

## Overview

CuriousPARC brings together the operational workflows that typically run across spreadsheets, manual check-ins, room coordination, and judge updates. The goal is a single source of truth for event operations:

- participants can see their participation status and room assignments
- coordinators can monitor registration, attendance, and round progression
- leads can track judging queues and evaluation completion
- organizers can maintain accountability through activity records and audit-friendly updates

This repository contains the operations dashboard and event-status UI used to model that workflow, together with the initial FastAPI and PostgreSQL backend foundation. The operational domain APIs and persisted event tables are being introduced incrementally from this foundation.

## Features

The current application includes the core operational views expected for event management:

- Live dashboard with event announcements and summary metrics
- Participant and team tracking with searchable team directory views
- Check-in and attendance status tracking
- Room allocation and coverage monitoring
- Judging queue and evaluation status reporting
- Round progression visibility
- Activity timeline and operational event logs
- Role-oriented operational views for coordinators and leads

The implementation in this repository is a dashboard-focused prototype rather than a full production backend service. It reflects the intended event workflow and the user experience for operations teams.

## Access model

The intended access model for the full platform is:

- public read-only access for participants to view status, allocation, and live event information
- authenticated coordinator access for operational updates and room management
- authenticated lead access for evaluation coordination and round progression
- audit logs to maintain accountability for operational changes

This repository does not yet ship production authentication or access control. The current frontend presents the relevant screens and mock operational data for design and planning use.

## Technology

The repository is implemented as a Next.js application with a modern frontend stack:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn-style component primitives and Radix UI primitives
- Recharts for charts and data summaries
- Lucide icons and Sonner toast notifications
- Vercel Analytics integration

The codebase is structured as a Next.js application under `frontend/` and a FastAPI service under `backend/`. The backend currently provides infrastructure, health/readiness checks, database connectivity, the initial operational schema, reference-data seeding, and validated team CSV import. Domain API endpoints are the next implementation phase.

The intended production design is:

- frontend application hosted on Vercel
- application and event services deployed through a Railway backend layer
- PostgreSQL for operational data, team records, logs, and audit history
- API layer for authentication, authorization, real-time operations updates, and state sync

The frontend still uses mock operational state. It should be treated as the dashboard layer of the broader CuriousPARC operations system until the domain migrations and APIs replace those mocks.

## Getting started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- Docker Desktop with Docker Compose
- A local terminal for running the app

### Installation

From the repository root:

```bash
cd frontend
npm install
```

### Local development

Start the app:

```bash
cd frontend
npm run dev
```

Then open the local URL printed by Next.js in the terminal, typically:

```text
http://localhost:3000
```

Start the backend and PostgreSQL from the repository root:

```bash
docker compose up --build
```

The API is available at `http://localhost:8000`, with OpenAPI documentation at
`http://localhost:8000/docs`. See `backend/README.md` for health checks,
migrations, tests, and lint commands.

### Production build

```bash
cd frontend
npm run build
```

This project’s build has been validated with the repository’s current configuration.

## Project structure

```text
.
├── .git/
├── backend/
│   ├── alembic/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
├── docs/
│   └── operations-contract.md
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── orbit/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   ├── public/
│   ├── styles/
│   ├── .gitignore
│   ├── next.config.mjs
│   ├── package.json
│   ├── package-lock.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.mjs
│   └── tsconfig.json
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md
```

Key areas:

- `backend/`: FastAPI service, database connectivity, and migration tooling
- `docs/operations-contract.md`: agreed workflow, permissions, privacy, and API conventions
- `frontend/app/`: application shell and main dashboard screen
- `frontend/components/`: reusable UI components and event operations panels
- `frontend/lib/`: shared utilities and mock data sources
- `frontend/public/`: static assets and branding resources
- `frontend/package.json`: project scripts and dependency list

## Development status

### Implemented

The current codebase includes the following implemented functionality:

- dashboard landing view with operational metrics
- searchable team directory and status filtering
- room assignment and coverage presentation
- evaluation progress and judging status views
- officials/coordinator directory view
- mock event timeline and team activity records
- responsive layout for event operations dashboards
- production-ready frontend build configuration for Next.js deployment
- Docker Compose development environment for FastAPI and PostgreSQL
- backend liveness/readiness endpoints and request correlation IDs
- Alembic migration scaffold, backend tests, and lint configuration
- PostgreSQL operational models and initial schema migration
- idempotent development reference-data seeding
- validated, dry-run-first team CSV importer

### Planned / not yet implemented

The following items are part of the intended CuriousPARC platform but are not yet implemented in this repository:

- real authentication and role-based access control
- event-domain API endpoints for operational writes and reads
- Railway deployment configuration
- live check-in ingestion and real-time updates
- audit-trail storage and immutable event logs
- coordinator/lead editing flows for operational updates
- participant-facing account and profile management
- integration with registration or judging systems beyond mock data

## Repository intent

This repository should be understood as the initial CuriousPARC operations interface: a polished, event-specific dashboard for coordinating hackathon operations, tracking team progress, and surfacing the event state clearly to both organizers and participants.

It is not yet a complete production operations stack, but it provides a credible foundation for the full CuriousPARC platform that will be built around Vercel, a Railway backend, and PostgreSQL-backed operational data.

## Links

- Event website: [CuriousPARC 2026](https://www.curiousparc.in/)
- Organization: [Hackathon Club VIT Pune](https://www.linkedin.com/company/hackathon-club-vit-pune)
