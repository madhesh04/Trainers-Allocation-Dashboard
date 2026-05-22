from __future__ import annotations

from collections import defaultdict
from typing import Any


def detect_conflicts(parsed: dict[str, Any]) -> dict[str, Any]:
    by_trainer_day: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    conflicts: list[dict[str, Any]] = []

    for item in parsed["assignments"]:
        trainer = item.get("trainer")
        if trainer:
            by_trainer_day[(trainer.lower(), item["date"])].append(item)

    for (_, day), items in by_trainer_day.items():
        delivery_ids = sorted({item["delivery_id"] for item in items})
        if len(delivery_ids) > 1:
            trainer = items[0]["trainer"]
            campuses = sorted({item["campus"] for item in items if item.get("campus")})
            conflicts.append(
                {
                    "type": "double_booked",
                    "severity": "high",
                    "trainer": trainer,
                    "date": day,
                    "delivery_ids": delivery_ids,
                    "campuses": campuses,
                    "message": f"{trainer} is assigned to {len(delivery_ids)} deliveries on {day}",
                }
            )

    conflicts.sort(key=lambda item: (item["date"], item.get("trainer", "")))
    return {"conflicts": conflicts[:100], "total_conflicts": len(conflicts)}
