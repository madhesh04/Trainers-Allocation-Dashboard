from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any


def _month_label(iso_date: str) -> str:
    return datetime.fromisoformat(iso_date).strftime("%b %y")


def compute_kpis(parsed: dict[str, Any], conflicts: dict[str, Any] | None = None) -> dict[str, Any]:
    records = parsed["records"]
    assignments = parsed["assignments"]
    unique_deliveries = {r["delivery_id"] for r in records}
    trainers = {a["trainer"] for a in assignments if a.get("trainer")}
    status_counts = Counter(r["status"] or "Unknown" for r in records)
    campus_counts = Counter(r["campus"] or "Unknown" for r in records)
    monthly: dict[str, Counter[str]] = defaultdict(Counter)

    for item in assignments:
        if item.get("trainer"):
            monthly[_month_label(item["date"])][item["status"] or "Unknown"] += 1

    monthly_activity = [
        {
            "month": month,
            "ongoing": counts.get("Ongoing", 0),
            "upcoming": counts.get("Upcoming", 0),
            "completed": counts.get("Completed", 0),
            "total": sum(counts.values()),
        }
        for month, counts in sorted(monthly.items(), key=lambda item: datetime.strptime(item[0], "%b %y"))
    ]

    billable = sum(1 for r in records if (r.get("comments") or "").lower().find("non") == -1)
    non_billable = max(len(records) - billable, 0)
    billable_pct = round((billable / len(records)) * 100) if records else 0

    weekly = defaultdict(int)
    for item in assignments:
        if item.get("trainer"):
            dt = datetime.fromisoformat(item["date"])
            year, week, _ = dt.isocalendar()
            weekly[f"{year}-W{week:02d}"] += 1

    workload = [
        {"week": key, "assigned": value, "capacity": max(value, 1) + 15}
        for key, value in sorted(weekly.items())[-12:]
    ]

    return {
        "active_deliveries": len(unique_deliveries),
        "trainers_on_ground": len(trainers),
        "open_conflicts": (conflicts or {}).get("total_conflicts", 0),
        "billable_rate": billable_pct,
        "status_breakdown": dict(status_counts),
        "campus_breakdown": dict(campus_counts.most_common(12)),
        "monthly_activity": monthly_activity[-10:],
        "billing": {
            "billable": billable,
            "non_billable": non_billable,
            "na": 0,
            "billable_pct": billable_pct,
            "non_billable_pct": 100 - billable_pct,
            "na_pct": 0,
        },
        "workload": workload,
    }
