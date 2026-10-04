# HackOps operational contract

Status: accepted baseline for P0  
Applies to: CuriousPARC 2026 operational MVP  
API version: `/api/v1`

This document is the source of truth for the first backend implementation. A
change to a state, permission, metric, or visibility rule below must be made
here before the API and frontend implementations diverge.

## 1. Scope

The MVP must support:

- public, privacy-safe visibility into teams, rooms, the current round, and the
  evaluation queue;
- authenticated staff access with least-privilege permissions;
- spreadsheet import and manual registration of teams;
- member-level venue check-in;
- current and historical team-to-room assignments;
- current and historical staff-to-room assignments;
- panel assignment and guarded evaluation state transitions;
- public activity events and a separate private audit log; and
- dashboard metrics derived from operational records.

The MVP does not include judging scores, participant accounts, email or SMS
notifications, QR scanning, offline mutation synchronization, or support for
editing more than one event at once in the frontend.

## 2. Identifiers and time

- Database primary keys are UUIDs and are never treated as credentials.
- A team has a unique human-readable code within an event, for example
  `CUR-PARC-001`.
- A staff user has a unique login code, for example `HC-2026-014`; the code
  alone never authenticates the user.
- Timestamps are stored as PostgreSQL `TIMESTAMPTZ` values in UTC.
- The event timezone is `Asia/Kolkata`; conversion happens at the API/client
  boundary.
- API timestamps use ISO 8601, for example `2026-10-05T07:32:00Z`.
- Phone numbers are strings, normalized to E.164 where possible. They are
  never numeric database columns.

## 3. Team registration and attendance

### Registration status

| Status | Meaning |
| --- | --- |
| `draft` | Incomplete record, excluded from public views and dashboard totals. |
| `registered` | Accepted team record, whether imported or entered manually. |
| `withdrawn` | Team is no longer participating and is excluded from operational queues. |

Importing an accepted spreadsheet row creates a `registered` team. Registration
does not imply physical presence at the venue.

### Member and leader rules

- A registered team has exactly one active leader.
- The leader is a team member with `is_leader = true`, not a duplicated set of
  columns on the team record.
- Member names and contact details are staff-only.
- The public API exposes only member totals and attendance totals.
- `expected_member_count` is recorded on the team when the full member roster
  is not yet available. Once a roster is complete, its active-member count
  must match the expected count.

### Attendance status

Attendance is recorded per active member and derived for the team:

| Status | Rule |
| --- | --- |
| `not_arrived` | No active member is checked in. |
| `partial` | At least one, but fewer than the expected/active total, is checked in. |
| `checked_in` | Every expected active member is checked in. |

Check-in is idempotent. Repeating the same check-in must not create another
record. A correction retains who revoked the check-in and when.

## 4. Room allocation and coverage

- A team has at most one current room assignment.
- Moving a team closes its existing assignment and creates a new assignment in
  the same transaction; history is never overwritten.
- A staff assignment has a duty (`volunteer` or `coordinator`) and an effective
  start and end time.
- An active room is `covered` only when it has both a current volunteer and a
  current coordinator assignment.
- An active room missing either duty is `needs_attention`.
- Inactive rooms are not included in the attention metric.

## 5. Rounds and evaluations

### Round lifecycle

```text
scheduled -> live -> closed
```

Only one round may be `live` for an event in the MVP.

### Evaluation lifecycle

```text
unassigned -> queued -> called -> in_progress -> completed
                         |             |
                         +-> no_show <-+
                         +-> cancelled
```

Rules:

- A team has at most one evaluation record per round.
- A withdrawn team cannot be queued.
- A team cannot have two active evaluations in the same round.
- A panel can have at most one `in_progress` evaluation at a time.
- Starting an evaluation records `started_at` on the server.
- Completing it records `completed_at` on the server.
- Public notes and private judging/coordination notes are separate fields.
- All state changes produce a team activity event and a private audit entry.
- Illegal or stale transitions return HTTP `409 Conflict`.

Queue position is scoped to the round and panel. Reordering a queue is an
authenticated lead/coordinator operation.

## 6. Roles and permissions

The backend enforces permissions even when the frontend hides a control.

| Role | Permissions |
| --- | --- |
| `public` | Public-safe dashboard, team, room, official, and queue reads. |
| `viewer` | Authenticated internal read-only operational access. |
| `checkin_volunteer` | Viewer permissions plus member check-in/correction. |
| `coordinator` | Register/update teams, attendance, rooms, and staffing. |
| `evaluator` | Read operational data and update evaluations assigned to their panel. |
| `lead` | Manage rounds, panels, queues, staffing, and announcements. |
| `admin` | Manage staff accounts, roles, event configuration, and all lead operations. |

No shared staff accounts are allowed. Every mutation is attributable to one
authenticated staff user.

## 7. Data visibility

### Public

- Team code, name, track, room, attendance counts/status
- Current evaluation status, queue position, panel name
- Published announcements and public activity descriptions
- Public official name, operational role, and assigned room when needed

### Staff-only

- Participant and leader names, phone numbers, and email addresses
- Staff contact details
- Private evaluation notes
- Import validation details
- Audit records, before/after values, IP address, and request metadata

Public response schemas and staff response schemas are distinct. A private
field must not be conditionally stripped from an otherwise shared serialized
object.

## 8. Dashboard definitions

All metrics are derived; none is an independently editable counter.

| Metric | Definition |
| --- | --- |
| Registered teams | Teams with `registration_status = registered`. |
| Checked-in teams | Registered teams whose derived attendance status is `checked_in`. |
| Awaiting evaluation | Current-round evaluations in `queued` or `called`. |
| Under evaluation | Current-round evaluations in `in_progress`. |
| Evaluated | Current-round evaluations in `completed`. |
| Rooms needing attention | Active rooms with missing current volunteer or coordinator coverage. |

Evaluation progress is `completed / eligible teams * 100`, rounded to the
nearest whole number. Withdrawn teams are not eligible.

## 9. API conventions

- Public reads live under `/api/v1/public/events/{event_slug}`.
- Authenticated event operations live under `/api/v1/staff`.
- User administration lives under `/api/v1/admin`.
- JSON uses `snake_case`.
- Collection responses use `items`, `page`, `page_size`, and `total`.
- Mutations return the authoritative updated resource.
- `PUT` is used for idempotent member check-in.
- State transitions use explicit action endpoints such as
  `/evaluations/{id}/start`; arbitrary status patching is not allowed.
- Mutable operational resources expose an integer `version`. Mutations send
  `expected_version`; a stale version receives `409 Conflict`.
- Validation errors use `422`; authentication failures use `401`; permission
  failures use `403`.
- Errors include a stable machine-readable `code` and a `request_id`.

Example error:

```json
{
  "type": "https://api.curiousparc.in/problems/evaluation-conflict",
  "title": "Evaluation state conflict",
  "status": 409,
  "code": "EVALUATION_ALREADY_ACTIVE",
  "detail": "This team is already being evaluated by Panel Beta.",
  "request_id": "req_01K7A3QH9MZ"
}
```

## 10. Consistency and audit requirements

- Multi-record operations use database transactions.
- Unique constraints enforce invariants in addition to service validation.
- Repeated imports and check-in requests are safe.
- Activity events are created by backend services, not accepted as arbitrary
  client-authored history.
- Audit logs are append-only in application behavior.
- The client never supplies `created_at`, `updated_at`, actor identity, or state
  transition timestamps.
- The public UI may initially poll dashboard and queue endpoints. Server-sent
  events are a later optimization, not an MVP dependency.

## 11. P0 acceptance criteria

P0 is complete when:

- every current frontend field maps to a defined domain value;
- registration, attendance, room coverage, round, and evaluation states have
  unambiguous meanings;
- public/private field boundaries are explicit;
- every write-capable role has an explicit permission boundary;
- dashboard counters have reproducible definitions; and
- implementation work can proceed without inventing new states or exposing
  personal data ad hoc.

