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

This repository currently contains the operations dashboard and event-status UI used to model that workflow. It is a frontend-first prototype built around realistic event data and real event operations patterns.

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

The codebase is structured as a frontend application under the `frontend/` directory and is intended to be deployed to Vercel. A production backend and persisted data layer are part of the intended architecture, but they are not implemented in this repository.

The intended production design is:

- frontend application hosted on Vercel
- application and event services deployed through a Railway backend layer
- PostgreSQL for operational data, team records, logs, and audit history
- API layer for authentication, authorization, real-time operations updates, and state sync

This repository currently contains the user interface and mock operational state only. It should be treated as the dashboard layer of the broader CuriousPARC operations system, not as the complete end-to-end platform.

## Getting started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
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
├── README.md
└── .gitignore
```

Key areas:

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

### Planned / not yet implemented

The following items are part of the intended CuriousPARC platform but are not yet implemented in this repository:

- real authentication and role-based access control
- backend API layer for event writes and reads
- Railway deployment configuration
- PostgreSQL persistence and migration setup
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
