from __future__ import annotations

import logging
from typing import Any

import httpx

from app.cache.store import cache
from app.config import settings
from app.graph.auth import get_access_token
from app.logic.availability import build_availability
from app.logic.conflicts import detect_conflicts
from app.logic.kpis import compute_kpis
from app.logic.pipeline import build_campus_stats, build_pipeline
from app.parser.allotment_parser import parse_excel_rows, read_csv_rows

logger = logging.getLogger(__name__)
BASE_URL = "https://graph.microsoft.com/v1.0"


def fetch_excel_rows() -> list[list[Any]]:
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = (
        f"{BASE_URL}/drives/{settings.SHAREPOINT_DRIVE_ID}"
        f"/items/{settings.EXCEL_FILE_ID}"
        f"/workbook/worksheets/{settings.EXCEL_SHEET_NAME}/usedRange"
        "?$select=values"
    )
    with httpx.Client(timeout=30) as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
    return response.json().get("values", [])


def _build_payload(rows: list[list[Any]]) -> dict[str, Any]:
    parsed = parse_excel_rows(rows)
    conflicts = detect_conflicts(parsed)
    return {
        "parsed": parsed,
        "kpis": compute_kpis(parsed, conflicts),
        "availability": build_availability(parsed, days=180),
        "deliveries": build_pipeline(parsed),
        "conflicts": conflicts,
        "campus_stats": build_campus_stats(parsed),
    }


def fetch_and_refresh() -> None:
    source = "graph"
    graph_error: str | None = None
    try:
        if not settings.graph_configured:
            raise RuntimeError("Graph credentials are not configured.")
        rows = fetch_excel_rows()
    except Exception as exc:
        graph_error = str(exc)
        logger.warning("Graph refresh failed; using local CSV fallback: %s", exc)
        rows = read_csv_rows(settings.LOCAL_CSV_PATH)
        source = "local_csv"

    cache.set_all(_build_payload(rows), source=source, error=graph_error)
