from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path
from typing import Any

STATUS_VALUES = {"not yet started", "training completed", "no class"}
META_FIELDS = {
    "delivery_id": "Delivery ID",
    "status": "Status",
    "campus": "Campus",
    "course_name": "Course Name",
    "degree_department": "Degree/ Department",
    "training_category": "Training  Category",
    "start_date": "Start Date",
    "end_date": "End Date",
    "comments": "Comments",
    "role": "Role",
}


def read_csv_rows(path: str | Path) -> list[list[Any]]:
    csv_path = Path(path)
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            with csv_path.open("r", encoding=encoding, newline="") as handle:
                return list(csv.reader(handle))
        except UnicodeDecodeError:
            continue
    with csv_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        return list(csv.reader(handle))


def parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _find_header_index(rows: list[list[Any]]) -> int:
    for idx, row in enumerate(rows[:10]):
        normalized = [normalize_text(cell).lower() for cell in row[:12]]
        if "delivery id" in normalized and "status" in normalized and "campus" in normalized:
            return idx
    raise ValueError("Could not find the spreadsheet header row.")


def _date_columns(header: list[Any]) -> list[tuple[int, date]]:
    dates: list[tuple[int, date]] = []
    seen: set[date] = set()
    for idx, cell in enumerate(header):
        parsed = parse_date(cell)
        if parsed and parsed not in seen:
            dates.append((idx, parsed))
            seen.add(parsed)
    return dates


def _get(row: list[Any], index: int) -> Any:
    return row[index] if index < len(row) else ""


def parse_excel_rows(rows: list[list[Any]]) -> dict[str, Any]:
    header_idx = _find_header_index(rows)
    header = [normalize_text(cell) for cell in rows[header_idx]]
    header_lookup = {name: idx for idx, name in enumerate(header) if name}
    date_columns = _date_columns(header)
    records: list[dict[str, Any]] = []
    assignments: list[dict[str, Any]] = []

    for row_number, row in enumerate(rows[header_idx + 1 :], start=header_idx + 2):
        delivery_id = normalize_text(_get(row, header_lookup.get("Delivery ID", 0)))
        if not delivery_id:
            continue

        record = {
            key: normalize_text(_get(row, header_lookup.get(label, -1)))
            for key, label in META_FIELDS.items()
        }
        record["row_number"] = row_number
        record["start_date_iso"] = parse_date(record["start_date"]).isoformat() if parse_date(record["start_date"]) else None
        record["end_date_iso"] = parse_date(record["end_date"]).isoformat() if parse_date(record["end_date"]) else None
        records.append(record)

        for col_idx, day in date_columns:
            value = normalize_text(_get(row, col_idx))
            if not value:
                continue
            lowered = value.lower()
            assignment = {
                **record,
                "date": day.isoformat(),
                "date_label": day.strftime("%d-%b-%y"),
                "cell_value": value,
                "trainer": "" if lowered in STATUS_VALUES else value,
                "cell_status": value if lowered in STATUS_VALUES else "Assigned",
            }
            assignments.append(assignment)

    return {
        "records": records,
        "assignments": assignments,
        "date_columns": [day.isoformat() for _, day in date_columns],
    }
