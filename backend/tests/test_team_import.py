from pathlib import Path

from app.scripts.import_teams import normalize_phone, read_csv


def test_normalize_phone() -> None:
    assert normalize_phone("98765 43210") == "+919876543210"
    assert normalize_phone("+1 202-555-0182") == "+12025550182"
    assert normalize_phone("not-a-phone") is None


def test_read_csv_accepts_expected_headers(tmp_path: Path) -> None:
    csv_path = tmp_path / "teams.csv"
    csv_path.write_text(
        "Team ID,Team Name,Team Leader Name,Team Leader Contact No,Track,"
        "Expected Member Count\n"
        "CUR-PARC-001,Example Team,Example Leader,9876543210,"
        "Theme 1: Open Innovation,4\n",
        encoding="utf-8",
    )

    result = read_csv(csv_path)

    assert result.valid
    assert len(result.rows) == 1
    assert result.rows[0].team_code == "CUR-PARC-001"
    assert result.rows[0].leader_phone == "+919876543210"
    assert result.rows[0].expected_member_count == 4


def test_read_csv_rejects_duplicate_codes(tmp_path: Path) -> None:
    csv_path = tmp_path / "teams.csv"
    csv_path.write_text(
        "Team ID,Team Name,Team Leader Name,Team Leader Contact No,Track\n"
        "CUR-PARC-001,One,Leader One,9876543210,Open Innovation\n"
        "CUR-PARC-001,Two,Leader Two,9876543211,Open Innovation\n",
        encoding="utf-8",
    )

    result = read_csv(csv_path)

    assert not result.valid
    assert any(issue.code == "DUPLICATE_TEAM_CODE_IN_FILE" for issue in result.issues)

