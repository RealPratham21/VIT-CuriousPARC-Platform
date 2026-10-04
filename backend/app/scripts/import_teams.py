from __future__ import annotations

import argparse
import asyncio
import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionFactory
from app.models.enums import RegistrationStatus
from app.models.event import Event, Track
from app.models.team import Team, TeamMember

REQUIRED_COLUMNS = {
    "team_id": "Team ID",
    "team_name": "Team Name",
    "leader_name": "Team Leader Name",
    "leader_phone": "Team Leader Contact No",
    "track": "Track",
}
OPTIONAL_COLUMNS = {
    "leader_email": "Team Leader Email",
    "expected_member_count": "Expected Member Count",
}


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


HEADER_ALIASES = {
    normalized_key(label): key for key, label in {**REQUIRED_COLUMNS, **OPTIONAL_COLUMNS}.items()
}


@dataclass(slots=True)
class ImportIssue:
    row: int
    field: str
    code: str
    message: str


@dataclass(slots=True)
class TeamImportRow:
    row_number: int
    team_code: str
    team_name: str
    leader_name: str
    leader_phone: str
    track_value: str
    leader_email: str | None = None
    expected_member_count: int | None = None


@dataclass(slots=True)
class ImportResult:
    rows: list[TeamImportRow] = field(default_factory=list)
    issues: list[ImportIssue] = field(default_factory=list)
    skipped_existing: int = 0

    @property
    def valid(self) -> bool:
        return not self.issues


def normalize_phone(value: str) -> str | None:
    compact = re.sub(r"[\s().-]", "", value)
    if compact.startswith("+"):
        digits = compact[1:]
        return compact if digits.isdigit() and 10 <= len(digits) <= 15 else None

    if not compact.isdigit():
        return None
    if len(compact) == 10:
        return f"+91{compact}"
    if len(compact) == 12 and compact.startswith("91"):
        return f"+{compact}"
    return None


def parse_expected_member_count(value: str) -> int | None:
    if not value.strip():
        return None
    count = int(value)
    if count <= 0:
        raise ValueError
    return count


def read_csv(path: Path) -> ImportResult:
    result = ImportResult()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            result.issues.append(
                ImportIssue(1, "headers", "MISSING_HEADERS", "CSV file has no header row.")
            )
            return result

        canonical_headers = {
            HEADER_ALIASES.get(normalized_key(header), ""): header for header in reader.fieldnames
        }
        missing = [label for key, label in REQUIRED_COLUMNS.items() if key not in canonical_headers]
        if missing:
            result.issues.append(
                ImportIssue(
                    1,
                    "headers",
                    "MISSING_REQUIRED_COLUMNS",
                    f"Missing required columns: {', '.join(missing)}",
                )
            )
            return result

        seen_codes: set[str] = set()
        for row_number, raw_row in enumerate(reader, start=2):
            values = {
                key: (raw_row.get(original_header) or "").strip()
                for key, original_header in canonical_headers.items()
                if key
            }
            team_code = values.get("team_id", "").upper()
            team_name = values.get("team_name", "")
            leader_name = values.get("leader_name", "")
            track_value = values.get("track", "")
            phone = normalize_phone(values.get("leader_phone", ""))

            for field_name, value in (
                ("team_id", team_code),
                ("team_name", team_name),
                ("leader_name", leader_name),
                ("track", track_value),
            ):
                if not value:
                    result.issues.append(
                        ImportIssue(
                            row_number,
                            field_name,
                            "REQUIRED_VALUE_MISSING",
                            f"{REQUIRED_COLUMNS[field_name]} is required.",
                        )
                    )

            if team_code in seen_codes:
                result.issues.append(
                    ImportIssue(
                        row_number,
                        "team_id",
                        "DUPLICATE_TEAM_CODE_IN_FILE",
                        f"{team_code} occurs more than once in this file.",
                    )
                )
            seen_codes.add(team_code)

            if phone is None:
                result.issues.append(
                    ImportIssue(
                        row_number,
                        "leader_phone",
                        "INVALID_PHONE",
                        "Use a 10-digit Indian number or an E.164 number beginning with +.",
                    )
                )

            try:
                expected_member_count = parse_expected_member_count(
                    values.get("expected_member_count", "")
                )
            except ValueError:
                expected_member_count = None
                result.issues.append(
                    ImportIssue(
                        row_number,
                        "expected_member_count",
                        "INVALID_MEMBER_COUNT",
                        "Expected Member Count must be a positive whole number.",
                    )
                )

            result.rows.append(
                TeamImportRow(
                    row_number=row_number,
                    team_code=team_code,
                    team_name=team_name,
                    leader_name=leader_name,
                    leader_phone=phone or "",
                    leader_email=values.get("leader_email") or None,
                    track_value=track_value,
                    expected_member_count=expected_member_count,
                )
            )

    return result


def track_lookup_keys(track: Track) -> set[str]:
    keys = {normalized_key(track.code), normalized_key(track.name)}
    match = re.fullmatch(r"THEME-(\d+)", track.code, flags=re.IGNORECASE)
    if match:
        keys.add(normalized_key(f"Theme {match.group(1)}: {track.name}"))
    return keys


async def validate_against_database(
    session: AsyncSession,
    event: Event,
    result: ImportResult,
) -> list[tuple[TeamImportRow, Track]]:
    tracks = list(
        await session.scalars(select(Track).where(Track.event_id == event.id, Track.is_active))
    )
    track_map = {key: track for track in tracks for key in track_lookup_keys(track)}
    existing_teams = {
        team.team_code: team
        for team in await session.scalars(select(Team).where(Team.event_id == event.id))
    }

    importable: list[tuple[TeamImportRow, Track]] = []
    for row in result.rows:
        track = track_map.get(normalized_key(row.track_value))
        if track is None:
            result.issues.append(
                ImportIssue(
                    row.row_number,
                    "track",
                    "UNKNOWN_TRACK",
                    f"Track '{row.track_value}' is not configured for this event.",
                )
            )
            continue

        existing = existing_teams.get(row.team_code)
        if existing is not None:
            if existing.name == row.team_name and existing.track_id == track.id:
                result.skipped_existing += 1
            else:
                result.issues.append(
                    ImportIssue(
                        row.row_number,
                        "team_id",
                        "TEAM_CODE_CONFLICT",
                        f"{row.team_code} already exists with different team data.",
                    )
                )
            continue

        importable.append((row, track))
    return importable


async def run_import(path: Path, event_slug: str, commit: bool) -> int:
    result = read_csv(path)
    if result.issues:
        print_result(result, importable_count=0, committed=False)
        return 1

    async with SessionFactory() as session:
        event = await session.scalar(select(Event).where(Event.slug == event_slug))
        if event is None:
            result.issues.append(
                ImportIssue(0, "event", "EVENT_NOT_FOUND", f"Event '{event_slug}' was not found.")
            )
            print_result(result, importable_count=0, committed=False)
            return 1

        importable = await validate_against_database(session, event, result)
        if result.issues:
            print_result(result, importable_count=len(importable), committed=False)
            return 1

        if commit:
            for row, track in importable:
                team = Team(
                    event_id=event.id,
                    team_code=row.team_code,
                    name=row.team_name,
                    track_id=track.id,
                    registration_status=RegistrationStatus.REGISTERED,
                    expected_member_count=row.expected_member_count,
                )
                session.add(team)
                await session.flush()
                session.add(
                    TeamMember(
                        team_id=team.id,
                        full_name=row.leader_name,
                        phone_e164=row.leader_phone,
                        email=row.leader_email,
                        is_leader=True,
                    )
                )
            await session.commit()

        print_result(result, importable_count=len(importable), committed=commit)
        return 0


def print_result(result: ImportResult, importable_count: int, committed: bool) -> None:
    print(
        json.dumps(
            {
                "valid": result.valid,
                "rows_read": len(result.rows),
                "importable_rows": importable_count,
                "skipped_existing": result.skipped_existing,
                "committed": committed,
                "issues": [
                    {
                        "row": issue.row,
                        "field": issue.field,
                        "code": issue.code,
                        "message": issue.message,
                    }
                    for issue in result.issues
                ],
            },
            indent=2,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate and import CuriousPARC teams.")
    parser.add_argument("--file", type=Path, required=True, help="UTF-8 CSV file to import.")
    parser.add_argument("--event-slug", default="curiousparc-2026")
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Persist valid new teams. Without this flag the command is a dry run.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    raise SystemExit(
        asyncio.run(run_import(arguments.file, arguments.event_slug, arguments.commit))
    )
