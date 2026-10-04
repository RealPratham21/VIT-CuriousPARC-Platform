# HackOps Phase 1 API reference

Status: implemented on `codex/phase-1-backend-apis`  
Base path: `/api/v1`  
Interactive schema: `http://localhost:8000/docs`  
Primary event slug in local reference data: `curiousparc-2026`

This is the human-readable API log for Phase 1. FastAPI's generated OpenAPI
document is the machine-readable source for exact validation constraints.

## Conventions

- Public endpoints do not require authentication and never return participant
  names, phone numbers, email addresses, private notes, or audit data.
- Staff endpoints require `Authorization: Bearer <access_token>`.
- Access tokens last 15 minutes by default. Refresh tokens are rotated and
  stored only in an `HttpOnly`, `SameSite=Lax` cookie.
- JSON field names are `snake_case`; timestamps are ISO 8601 with an offset.
- List responses use `{ "items", "page", "page_size", "total" }`.
- Operational updates return the authoritative resource after the mutation.
- Records with a `version` require `expected_version` for state-changing
  updates. A stale value returns `409`.
- Every response has an `X-Request-ID` header. Errors repeat it in the body.

Standard error:

```json
{
  "type": "https://api.curiousparc.in/problems/stale-version",
  "title": "Operational state conflict",
  "status": 409,
  "code": "STALE_VERSION",
  "detail": "The evaluation changed. Refresh and retry.",
  "request_id": "req_0f44..."
}
```

## Frontend mapping

| Current frontend area | API source | Refresh behavior |
| --- | --- | --- |
| Header/event identity | `GET /public/events/{slug}` | On application load |
| Dashboard counters, progress, live cards, activity | `GET /public/events/{slug}/dashboard` | Poll every 10–15 seconds |
| Latest/all announcements | Dashboard plus `GET .../announcements` | Poll every 30 seconds |
| Team table and filters | `GET .../teams` | On load/filter/page change |
| Team detail timeline | `GET .../teams/{team_id}` | On dialog open |
| Room coverage table | `GET .../rooms` | Poll every 10–15 seconds |
| Room detail dialog | `GET .../rooms/{room_id}` | On dialog open |
| Current evaluation heading | `GET .../rounds/current` | Poll every 15 seconds |
| Evaluation control/queue | `GET .../rounds/{round_id}/evaluations` | Poll every 5–10 seconds |
| Officials directory | `GET .../officials` | On load/after staffing updates |
| Official login button | `POST /auth/login`, `GET /auth/me` | Login/application load |
| Admin team form | `POST/PATCH /staff/events/{event_id}/teams...` | Mutate then use returned resource |
| Check-in controls | `PUT/DELETE .../members/{member_id}/check-in` | Mutate then refresh team/dashboard |
| Room allocation controls | `POST .../teams/{team_id}/room-assignment` | Mutate then refresh team/rooms |
| Evaluation action controls | Explicit `/call`, `/start`, `/complete`, `/no-show`, `/cancel` actions | Mutate then refresh queue/dashboard |

The current React UI is still untouched and continues to use mock data. Phase 2
frontend work can replace each mock section independently using the mapping
above.

## Public reads

### Event and tracks

| Method and path | Purpose | Request | Response |
| --- | --- | --- | --- |
| `GET /public/events/{slug}` | Event identity, dates, timezone and lifecycle | Path `slug` | `EventPublic` |
| `GET /public/events/{slug}/tracks` | Active track picker/reference data | Path `slug` | `TrackPublic[]` |

Example event response:

```json
{
  "id": "c319e4d9-6088-465c-9810-9440dd88c2bb",
  "slug": "curiousparc-2026",
  "name": "CuriousPARC 2026",
  "timezone": "Asia/Kolkata",
  "starts_at": "2026-03-14T03:30:00Z",
  "ends_at": "2026-03-14T14:30:00Z",
  "status": "draft"
}
```

### Teams

`GET /public/events/{slug}/teams`

Purpose: searchable/paginated team directory. Only `registered` teams appear.

Query parameters:

| Name | Type | Meaning |
| --- | --- | --- |
| `q` | string | Case-insensitive team code/name search |
| `evaluation_status` | enum | `unassigned`, `queued`, `called`, `in_progress`, `completed`, `no_show`, `cancelled` |
| `track_id` | UUID | Restrict to one track |
| `room_id` | UUID | Restrict to current room |
| `page` | integer | Starts at 1 |
| `page_size` | integer | 1–100; default 25 |

Response excerpt:

```json
{
  "items": [
    {
      "id": "4ca7...",
      "team_code": "CUR-PARC-001",
      "name": "Rebel_bytes",
      "track": { "id": "a15e...", "code": "THEME-1", "name": "Theme 1: Open Innovation", "description": null },
      "member_count": 4,
      "attendance": { "status": "partial", "checked_in": 3, "expected": 4 },
      "room": { "id": "d4d2...", "code": "A-104", "floor": "A" },
      "evaluation": {
        "id": "31cc...",
        "status": "queued",
        "queue_position": 2,
        "panel": { "id": "9c03...", "name": "Panel Beta" },
        "room": null,
        "public_note": null,
        "called_at": null,
        "started_at": null,
        "completed_at": null,
        "version": 1
      }
    }
  ],
  "page": 1,
  "page_size": 25,
  "total": 42
}
```

`GET /public/events/{slug}/teams/{team_id}` returns the same summary plus a
privacy-safe `timeline` array. Timeline items contain `event_type`, `title`,
public `description`, and `created_at`; they never identify the acting staff
member or participant.

### Rooms and officials

| Method and path | Purpose | Response |
| --- | --- | --- |
| `GET /public/events/{slug}/rooms` | Active rooms, allocation counts, checked-in teams, current volunteer/coordinator, coverage | `RoomSummaryPublic[]` |
| `GET /public/events/{slug}/rooms/{room_id}` | One room plus its current teams | `RoomDetailPublic` |
| `GET /public/events/{slug}/officials` | Public official names, event roles, current rooms, managed team count | `OfficialPublic[]` |

Coverage is derived on every read: an active room is `covered` only when both
a current volunteer and coordinator are assigned; otherwise it is
`needs_attention`.

### Rounds and evaluations

| Method and path | Purpose | Request | Response |
| --- | --- | --- | --- |
| `GET /public/events/{slug}/rounds/current` | Current live round, or `null` | None | `RoundPublic \| null` |
| `GET /public/events/{slug}/rounds/{round_id}/evaluations` | Public queue/control board | Optional `status`, `panel_id`, pagination | `Page[EvaluationPublic]` |

The evaluation response includes team code/name, public status and timestamps,
queue position, panel, room and `public_note`. `private_note` is never present.

### Dashboard and announcements

| Method and path | Purpose | Response |
| --- | --- | --- |
| `GET /public/events/{slug}/dashboard` | All current dashboard metrics and cards in one polling request | `DashboardPublic` |
| `GET /public/events/{slug}/announcements` | Currently published, non-expired public/all announcements | `AnnouncementPublic[]` |

Dashboard fields are `registered_teams`, `checked_in_teams`,
`awaiting_evaluation`, `under_evaluation`, `evaluated`,
`rooms_needing_attention`, `evaluation_progress_percent`, `current_round`,
`live_evaluations`, `recent_activity`, `latest_announcement`, and
`generated_at`. Counters are derived from operational records, not manually
editable values.

## Authentication

### `POST /auth/login`

Purpose: exchange an individual staff code and password for an access token.

Request:

```json
{
  "staff_code": "HC-2026-014",
  "password": "a-long-individual-password"
}
```

Response (`200`) and side effect:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "8408...",
    "staff_code": "HC-2026-014",
    "full_name": "Aarav Shah",
    "email": "aarav@example.org",
    "phone_e164": "+919876543210",
    "is_active": true,
    "roles": [
      { "event_id": "c319...", "event_slug": "curiousparc-2026", "role": "coordinator" }
    ]
  }
}
```

The response also sets the opaque `hackops_refresh` HttpOnly cookie. Passwords
are stored as Argon2 hashes; login codes are not passwords.

| Method and path | Purpose | Request | Response |
| --- | --- | --- | --- |
| `POST /auth/refresh` | Rotate refresh cookie and issue a new access token | Refresh cookie | `TokenResponse` plus new cookie |
| `POST /auth/logout` | Revoke the presented refresh session | Refresh cookie | `{ "message": "Signed out." }` |
| `GET /auth/me` | Restore current staff identity/roles | Bearer token | `StaffUserView` |

## Staff team operations

All paths in this section require a bearer token. `viewer` can read a staff
team detail; mutations are restricted as shown.

### Team and member routes

| Method and path | Role | Purpose |
| --- | --- | --- |
| `GET /staff/events/{event_id}/teams/{team_id}` | Any event staff | Staff team detail including roster/contact fields |
| `POST /staff/events/{event_id}/teams` | Coordinator, lead, admin | Register team and its leader atomically |
| `PATCH /staff/events/{event_id}/teams/{team_id}` | Coordinator, lead, admin | Edit team using optimistic version |
| `POST /staff/events/{event_id}/teams/{team_id}/members` | Coordinator, lead, admin | Add roster member |
| `PATCH /staff/events/{event_id}/members/{member_id}` | Coordinator, lead, admin | Correct/deactivate member or transfer leadership |

Create team request:

```json
{
  "team_code": "CUR-PARC-001",
  "name": "Rebel_bytes",
  "track_id": "a15e...",
  "expected_member_count": 4,
  "leader_name": "Pimpare Anushka Shankar",
  "leader_phone_e164": "+919119519601",
  "leader_email": null
}
```

Update team request:

```json
{
  "expected_version": 3,
  "name": "Rebel Bytes",
  "registration_status": "registered"
}
```

Both return `TeamStaff`: the complete public summary plus
`registration_status`, `expected_member_count`, `version`, and staff-only
`members`.

### Attendance

| Method and path | Role | Purpose |
| --- | --- | --- |
| `PUT /staff/events/{event_id}/members/{member_id}/check-in` | Check-in volunteer, coordinator, lead, admin | Idempotently check in a member |
| `DELETE /staff/events/{event_id}/members/{member_id}/check-in` | Same | Correct/revoke a check-in while retaining history |

Request (version is optional for a first check-in and recommended thereafter):

```json
{ "expected_version": 2 }
```

Response is the updated `MemberStaff` record. Repeat `PUT` and repeat `DELETE`
are safe.

### Team room assignment

`POST /staff/events/{event_id}/teams/{team_id}/room-assignment`

Role: coordinator, lead or admin. Moving a team closes its current assignment
and opens another in one transaction.

```json
{
  "room_id": "d4d2...",
  "reason": "Moved closer to Panel Beta"
}
```

The response is the authoritative `TeamStaff` view with the new room.

## Staff operations

### Room staffing

`POST /staff/events/{event_id}/rooms/{room_id}/staff-assignments`

Role: coordinator, lead or admin.

```json
{
  "user_id": "8408...",
  "duty_role": "volunteer",
  "starts_at": "2026-03-14T09:00:00+05:30",
  "ends_at": null
}
```

If that user already has a current assignment for the same duty, it is ended
at `starts_at`; the new historical assignment is returned.

### Round and panel management

| Method and path | Role | Purpose |
| --- | --- | --- |
| `GET /staff/events/{event_id}/rounds` | Any event staff | Round reference list |
| `POST /staff/events/{event_id}/rounds` | Lead, admin | Create scheduled round |
| `POST /staff/events/{event_id}/rounds/{round_id}/activate` | Lead, admin | `scheduled -> live` |
| `POST /staff/events/{event_id}/rounds/{round_id}/close` | Lead, admin | `live -> closed` |
| `GET /staff/events/{event_id}/panels` | Any event staff | Panel reference list |
| `POST /staff/events/{event_id}/panels` | Lead, admin | Create panel |
| `POST /staff/events/{event_id}/panels/{panel_id}/members` | Lead, admin | Assign evaluator/member to panel |

Create round:

```json
{
  "code": "ROUND-2",
  "name": "Final Evaluation",
  "sequence_number": 2,
  "starts_at": "2026-03-14T15:00:00+05:30",
  "ends_at": "2026-03-14T18:00:00+05:30"
}
```

### Evaluation queue and state machine

Create an evaluation:

`POST /staff/events/{event_id}/rounds/{round_id}/evaluations`

Role: coordinator, lead or admin.

```json
{
  "team_id": "4ca7...",
  "panel_id": "9c03...",
  "room_id": "d4d2...",
  "queue_position": 2,
  "public_note": "Please report five minutes before your turn."
}
```

A panel plus queue position creates `queued`; otherwise it creates
`unassigned`. A round/team pair is unique and withdrawn teams are rejected.

Explicit action endpoints:

| Method and path suffix | Allowed transition |
| --- | --- |
| `POST .../evaluations/{evaluation_id}/call` | `queued -> called` |
| `POST .../evaluations/{evaluation_id}/start` | `called -> in_progress` |
| `POST .../evaluations/{evaluation_id}/complete` | `in_progress -> completed` |
| `POST .../evaluations/{evaluation_id}/no-show` | `called/in_progress -> no_show` |
| `POST .../evaluations/{evaluation_id}/cancel` | `unassigned/queued/called -> cancelled` |

Request:

```json
{
  "expected_version": 4,
  "public_note": "Evaluation is underway.",
  "private_note": "Coordinator-only operational note."
}
```

The server owns action timestamps. An evaluator can mutate only evaluations
assigned to their panel; coordinators, leads and admins can operate across
panels. Responses are `EvaluationStaff`, which includes `private_note`.

### Announcements

| Method and path | Role | Purpose |
| --- | --- | --- |
| `POST /staff/events/{event_id}/announcements` | Lead, admin | Create draft or immediately publish |
| `PATCH /staff/events/{event_id}/announcements/{id}` | Lead, admin | Edit announcement |
| `POST /staff/events/{event_id}/announcements/{id}/publish` | Lead, admin | Idempotently publish draft |

Create request:

```json
{
  "title": "Lunch service",
  "message": "Lunch service begins at 13:30 in the central atrium.",
  "audience": "all",
  "publish_now": true,
  "expires_at": "2026-03-14T15:00:00+05:30"
}
```

## Administration

All administration routes require the `admin` role for `{event_id}`.

| Method and path | Purpose |
| --- | --- |
| `GET /admin/events/{event_id}/staff-users` | Staff directory with roles |
| `POST /admin/events/{event_id}/staff-users` | Create an individual login |
| `POST /admin/events/{event_id}/staff-users/{user_id}/roles` | Idempotently grant event role |
| `DELETE /admin/events/{event_id}/staff-users/{user_id}/roles/{role}` | Revoke event role |
| `POST /admin/events/{event_id}/staff-users/{user_id}/deactivate` | Disable login and revoke all sessions |
| `POST /admin/events/{event_id}/staff-users/{user_id}/reset-password` | Set Argon2 password and revoke sessions |

Create user:

```json
{
  "staff_code": "HC-2026-014",
  "full_name": "Aarav Shah",
  "password": "initial-password-at-least-12-chars",
  "email": "aarav@example.org",
  "phone_e164": "+919876543210"
}
```

Grant role:

```json
{ "role": "coordinator" }
```

Supported roles: `viewer`, `checkin_volunteer`, `coordinator`, `evaluator`,
`lead`, and `admin`.

## Bootstrap the first administrator

The seed intentionally creates no credential. Bootstrap the first admin using
an environment variable so a password never enters source control or shell
history as a command argument:

```powershell
$env:HACKOPS_BOOTSTRAP_PASSWORD = "replace-with-a-long-unique-password"
docker compose exec backend python -m app.scripts.bootstrap_admin `
  --staff-code HC-ADMIN-001 `
  --full-name "Hackathon Administrator"
Remove-Item Env:HACKOPS_BOOTSTRAP_PASSWORD
```

The command is idempotent for the selected staff code and event. After the
first admin exists, create every other account through the admin API.

## Audit and transaction behavior

- Team creation, room moves, check-in corrections, staffing changes,
  evaluation state transitions, announcement actions, and administration
  changes write append-only audit records with actor and request ID.
- Public activity is backend-authored and intentionally contains no private
  fields.
- Each request commits its domain changes, history, and audit entry together.
- Database unique constraints remain the final enforcement layer for one live
  round, one current team room, one active evaluation per panel, and queue
  position uniqueness.
