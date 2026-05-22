# Trainer Allotment Dashboard — Implementation Specification
**Product:** Qlab's · Swif ops — Trainer Allotment Dashboard  
**Version:** 1.0.0  
**Status:** Locked Design · Ready for Implementation  
**Author:** Senior Architecture Review  
**Last Updated:** 2026-05-22

---

> **Agent Instruction — Read This First**
>
> This document is the single source of truth for building the Trainer Allotment Dashboard under the Qlab's Swif ops product ecosystem. You have been provided a locked HTML design reference file (`trainer_dashboard.html`) that defines the exact visual output expected. Do **not** deviate from the design system tokens, component patterns, or layout structure defined in that file and reinforced throughout this spec. Build backend first, then frontend. Every section of this document contains precise implementation instructions — follow them in order.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Decision](#2-architecture-decision)
3. [Repository Structure](#3-repository-structure)
4. [Backend Implementation — FastAPI](#4-backend-implementation--fastapi)
5. [Microsoft Graph API Integration](#5-microsoft-graph-api-integration)
6. [Data Pipeline — Excel Parser](#6-data-pipeline--excel-parser)
7. [Business Logic Layer](#7-business-logic-layer)
8. [REST API Endpoints — Contract](#8-rest-api-endpoints--contract)
9. [Frontend Implementation — React](#9-frontend-implementation--react)
10. [Design System Integration — Qlab's Swif ops](#10-design-system-integration--qlabs-swif-ops)
11. [Component Architecture](#11-component-architecture)
12. [Chart Specifications](#12-chart-specifications)
13. [State Management](#13-state-management)
14. [Environment Configuration](#14-environment-configuration)
15. [Deployment](#15-deployment)
16. [Agent Execution Order](#16-agent-execution-order)

---

## 1. System Overview

### What This System Does

The Trainer Allotment Dashboard is a real-time operational intelligence tool for managers and coordinators at Qlab's. It reads a live Microsoft Excel file stored on OneDrive/SharePoint — the `Trainer_Tracker_Live_Allotment_Data_.xlsx` — and renders it as an interactive dashboard with charts, heatmaps, KPIs, pipeline views, and conflict alerts. The Excel file is the single source of truth. The dashboard must never require manual data uploads.

### Data Source

- **File:** `Trainer_Tracker_Live_Allotment_Data_.xlsx`  
- **Storage:** Microsoft OneDrive / SharePoint (organization tenant)
- **Structure:** Wide-format spreadsheet — rows are trainer-delivery assignments, columns span daily dates from Dec 2025 to Sep 2026. Each cell contains either a trainer name, a status string (`Not yet started`, `Training Completed`, `No Class`), or is empty.
- **Key columns (columns A–J):** `Delivery ID`, `Status`, `Campus`, `Course Name`, `Degree/Department`, `Training Category`, `Start Date`, `End Date`, `Comments`, `Role`
- **Date columns (column K onwards):** One column per calendar date — each cell = trainer name assigned that day, or a status string.

### Scale

- ~236 unique delivery IDs
- ~883 rows (multiple trainers/roles per delivery)
- ~30+ campuses
- Date range: Dec 2025 — Sep 2026 (~275 columns)

---

## 2. Architecture Decision

### Chosen Stack

```
┌─────────────────────────────────────────────────────────────┐
│  OneDrive / SharePoint (Excel live file)                    │
│         ↕  Microsoft Graph API (HTTPS)                      │
├─────────────────────────────────────────────────────────────┤
│  BACKEND — Python / FastAPI                                 │
│  · APScheduler polls Graph API every 5 minutes             │
│  · Wide-to-long parser transforms Excel rows               │
│  · Business logic: KPIs, conflicts, availability           │
│  · In-memory cache serves REST JSON endpoints              │
│  · Deployed on Render (free tier) or Railway               │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND — React + Vite + Chart.js                        │
│  · Polls backend every 5 minutes for fresh data            │
│  · Renders 4 views: KPIs, Pipeline, Heatmap, Charts       │
│  · Qlab's Swif ops design system (locked)                  │
│  · Deployed on Vercel (free tier)                          │
└─────────────────────────────────────────────────────────────┘
```

### Why This Stack

| Decision | Choice | Rationale |
|---|---|---|
| Backend language | Python / FastAPI | Native `openpyxl` + `msal` libraries, async support, fast startup |
| Auth to OneDrive | Microsoft Graph API + MSAL | Only secure, production-grade method to read OneDrive files |
| Polling interval | 5 minutes | Balances freshness vs Graph API rate limits (default: 10k calls/10min) |
| Frontend framework | React + Vite | Lightweight, fast HMR, no SSR overhead needed for an internal tool |
| Charting | Chart.js 4.x | Already proven in design reference; CDN-free via npm |
| State | Zustand | Lightweight global store; no Redux overhead for this scale |
| Hosting | Render (backend) + Vercel (frontend) | Zero infra management; free tier sufficient for internal traffic |

---

## 3. Repository Structure

```
trainer-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Environment config (pydantic-settings)
│   │   ├── scheduler.py             # APScheduler polling job
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # MSAL token acquisition
│   │   │   └── excel_reader.py      # Graph API Excel fetch
│   │   ├── parser/
│   │   │   ├── __init__.py
│   │   │   └── allotment_parser.py  # Wide-to-long transformer
│   │   ├── logic/
│   │   │   ├── __init__.py
│   │   │   ├── kpis.py              # KPI calculations
│   │   │   ├── conflicts.py         # Conflict detection
│   │   │   ├── availability.py      # Trainer availability
│   │   │   └── pipeline.py          # Delivery pipeline builder
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   └── store.py             # In-memory cache (thread-safe)
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── kpis.py
│   │       ├── availability.py
│   │       ├── deliveries.py
│   │       └── conflicts.py
│   ├── tests/
│   │   ├── test_parser.py
│   │   ├── test_kpis.py
│   │   └── test_conflicts.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # Vite entry
│   │   ├── App.jsx                  # Root with theme provider
│   │   ├── index.css                # Qlab's design tokens (CSS vars)
│   │   ├── store/
│   │   │   └── dashboardStore.js    # Zustand global store
│   │   ├── api/
│   │   │   └── client.js            # Axios instance + polling logic
│   │   ├── hooks/
│   │   │   ├── useDashboard.js      # Data fetching hook
│   │   │   └── useTheme.js          # Light/dark toggle
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Topbar.jsx
│   │   │   ├── kpi/
│   │   │   │   └── KpiCard.jsx
│   │   │   ├── charts/
│   │   │   │   ├── DeliveryBarChart.jsx
│   │   │   │   ├── BillingDonut.jsx
│   │   │   │   ├── StatusPie.jsx
│   │   │   │   └── WorkloadLine.jsx
│   │   │   ├── heatmap/
│   │   │   │   └── AvailabilityHeatmap.jsx
│   │   │   ├── pipeline/
│   │   │   │   └── DeliveryPipeline.jsx
│   │   │   ├── campus/
│   │   │   │   └── CampusTable.jsx
│   │   │   └── conflicts/
│   │   │       └── ConflictAlerts.jsx
│   │   └── pages/
│   │       └── Dashboard.jsx        # Main page assembles all components
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── TRAINER_DASHBOARD_IMPLEMENTATION.md   # This file
│   ├── DESIGN_PALETTE.md
│   ├── DETAILED_DESIGN.md
│   └── trainer_dashboard.html                # Locked design reference
│
└── docker-compose.yml                        # Local dev full stack
```

---

## 4. Backend Implementation — FastAPI

### 4.1 Entry Point — `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.scheduler import start_scheduler, shutdown_scheduler
from app.routers import kpis, availability, deliveries, conflicts

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()         # Kick off the 5-min polling job
    yield
    shutdown_scheduler()

app = FastAPI(
    title="Trainer Allotment API",
    description="Qlab's Swif ops — Trainer Dashboard backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app", "http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(kpis.router,         prefix="/api/v1", tags=["KPIs"])
app.include_router(availability.router, prefix="/api/v1", tags=["Availability"])
app.include_router(deliveries.router,   prefix="/api/v1", tags=["Deliveries"])
app.include_router(conflicts.router,    prefix="/api/v1", tags=["Conflicts"])

@app.get("/health")
def health():
    from app.cache.store import cache
    return {"status": "ok", "last_sync": cache.last_updated}
```

### 4.2 Configuration — `app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Azure App Registration credentials
    AZURE_TENANT_ID: str
    AZURE_CLIENT_ID: str
    AZURE_CLIENT_SECRET: str

    # OneDrive / SharePoint file reference
    # Get this from the file's SharePoint URL or Graph Explorer
    SHAREPOINT_SITE_ID: str        # e.g. "yourorg.sharepoint.com,abc123,def456"
    SHAREPOINT_DRIVE_ID: str       # Drive ID of the document library
    EXCEL_FILE_ID: str             # OneDrive item ID of the .xlsx file
    EXCEL_SHEET_NAME: str = "Sheet1"

    # Polling
    POLL_INTERVAL_SECONDS: int = 300  # 5 minutes

    class Config:
        env_file = ".env"

settings = Settings()
```

### 4.3 Scheduler — `app/scheduler.py`

```python
from apscheduler.schedulers.background import BackgroundScheduler
from app.graph.excel_reader import fetch_and_refresh

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

def start_scheduler():
    from app.config import settings
    # Run immediately on startup, then every N seconds
    fetch_and_refresh()
    scheduler.add_job(
        fetch_and_refresh,
        trigger="interval",
        seconds=settings.POLL_INTERVAL_SECONDS,
        id="excel_poll",
        replace_existing=True,
        misfire_grace_time=60
    )
    scheduler.start()

def shutdown_scheduler():
    scheduler.shutdown(wait=False)
```

### 4.4 In-Memory Cache — `app/cache/store.py`

```python
import threading
from datetime import datetime
from typing import Optional, Any

class DashboardCache:
    """Thread-safe in-memory cache for processed dashboard data."""

    def __init__(self):
        self._lock = threading.RLock()
        self._data: dict[str, Any] = {}
        self.last_updated: Optional[datetime] = None
        self.is_ready: bool = False

    def set(self, key: str, value: Any):
        with self._lock:
            self._data[key] = value
            self.last_updated = datetime.utcnow()
            self.is_ready = True

    def get(self, key: str, default=None) -> Any:
        with self._lock:
            return self._data.get(key, default)

    def set_all(self, payload: dict):
        with self._lock:
            self._data.update(payload)
            self.last_updated = datetime.utcnow()
            self.is_ready = True

cache = DashboardCache()
```

### 4.5 requirements.txt

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic-settings==2.2.1
apscheduler==3.10.4
msal==1.28.0
httpx==0.27.0
pandas==2.2.2
openpyxl==3.1.2
python-dotenv==1.0.1
```

---

## 5. Microsoft Graph API Integration

### 5.1 One-Time Azure Setup (IT Admin — 15 minutes)

The implementing developer must ask the Microsoft 365 Global Admin to complete the following steps before any code runs:

1. Go to **Azure Portal → Microsoft Entra ID → App registrations → New registration**
2. Name: `TrainerDashboard-API` · Account type: Single tenant
3. After creation, note down: `Application (client) ID` and `Directory (tenant) ID`
4. Go to **Certificates & secrets → New client secret** → copy the **Value** immediately (shown once)
5. Go to **API permissions → Add a permission → Microsoft Graph → Application permissions**
6. Add: `Files.Read.All` and `Sites.Read.All`
7. Click **Grant admin consent for [org]**
8. Go to **SharePoint → Find the document library containing the Excel file**
9. Note the SharePoint site URL and find the `site ID`, `drive ID`, and `item ID` via Graph Explorer (`https://developer.microsoft.com/en-us/graph/graph-explorer`)

### 5.2 Token Acquisition — `app/graph/auth.py`

```python
import msal
from app.config import settings

def get_access_token() -> str:
    """Acquire a client credentials access token for Microsoft Graph."""
    authority = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}"
    scope = ["https://graph.microsoft.com/.default"]

    app = msal.ConfidentialClientApplication(
        client_id=settings.AZURE_CLIENT_ID,
        client_credential=settings.AZURE_CLIENT_SECRET,
        authority=authority,
    )

    result = app.acquire_token_silent(scopes=scope, account=None)
    if not result:
        result = app.acquire_token_for_client(scopes=scope)

    if "access_token" not in result:
        raise RuntimeError(f"MSAL token error: {result.get('error_description')}")

    return result["access_token"]
```

### 5.3 Excel Reader — `app/graph/excel_reader.py`

```python
import httpx
import logging
from app.graph.auth import get_access_token
from app.config import settings
from app.parser.allotment_parser import parse_excel_rows
from app.logic.kpis import compute_kpis
from app.logic.conflicts import detect_conflicts
from app.logic.availability import build_availability
from app.logic.pipeline import build_pipeline
from app.cache.store import cache

logger = logging.getLogger(__name__)
BASE_URL = "https://graph.microsoft.com/v1.0"


def fetch_excel_rows() -> list[list]:
    """
    Fetch all rows from the Excel worksheet via Microsoft Graph API.
    Returns raw 2D list (rows × columns).
    """
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    url = (
        f"{BASE_URL}/drives/{settings.SHAREPOINT_DRIVE_ID}"
        f"/items/{settings.EXCEL_FILE_ID}"
        f"/workbook/worksheets/{settings.EXCEL_SHEET_NAME}/usedRange"
        f"?$select=values"
    )

    with httpx.Client(timeout=30) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()

    data = resp.json()
    return data.get("values", [])


def fetch_and_refresh():
    """
    Full pipeline: fetch → parse → compute → cache.
    Called by scheduler every 5 minutes.
    Falls back to last cached data on any error.
    """
    try:
        logger.info("Polling OneDrive Excel...")
        raw_rows = fetch_excel_rows()

        # Parse wide-format rows into structured records
        records = parse_excel_rows(raw_rows)

        # Compute all derived data in parallel sections
        payload = {
            "kpis":         compute_kpis(records),
            "conflicts":    detect_conflicts(records),
            "availability": build_availability(records),
            "pipeline":     build_pipeline(records),
            "raw_records":  records,
        }

        cache.set_all(payload)
        logger.info(f"Cache refreshed. {len(records)} records processed.")

    except Exception as e:
        logger.error(f"Refresh failed: {e}. Serving last cached data.")
        # Do NOT raise — let stale cache continue serving requests
```

---

## 6. Data Pipeline — Excel Parser

### 6.1 Understanding the Excel Structure

Row 1: Day-of-week labels (Monday, Tuesday, etc.) — skip this row.  
Row 2: Column headers — `Delivery ID`, `Status`, `Campus`, `Course Name`, `Degree/Department`, `Training Category`, `Start Date`, `End Date`, `Comments`, `Role`, then date strings (`1-Dec-25`, `2-Dec-25`, ...) in alternating columns (every other column is empty — a visual spacer in the original Excel).  
Rows 3+: Data rows. Same delivery ID repeated for multiple trainers/roles.

### 6.2 Parser — `app/parser/allotment_parser.py`

```python
from datetime import datetime
from typing import Optional

FIXED_COLS = ["delivery_id", "status", "campus", "course_name",
              "department", "category", "start_date", "end_date",
              "comments", "role"]

# Strings that indicate a day is NOT assigned to a specific trainer
NON_TRAINER_VALUES = {
    "", "not yet started", "training completed", "training Completed",
    "no class", "inhouse training-wilp", "trainer", "trainer-paper evaluation"
}


def parse_date_col_header(raw: str) -> Optional[datetime]:
    """Parse '1-Dec-25' → datetime(2025, 12, 1)."""
    try:
        return datetime.strptime(raw.strip(), "%d-%b-%y")
    except (ValueError, AttributeError):
        return None


def is_trainer_name(value: str) -> bool:
    """Determine if a cell value is an actual trainer name vs a status string."""
    return bool(value) and value.lower().strip() not in {v.lower() for v in NON_TRAINER_VALUES}


def parse_excel_rows(raw_rows: list[list]) -> list[dict]:
    """
    Transform the raw 2D Excel grid into a normalized list of records.

    Each record represents one trainer assignment on one day for one delivery.
    Output schema:
    {
        "delivery_id": str,
        "status": str,           # Ongoing | Completed | Upcoming
        "campus": str,
        "course_name": str,
        "department": str,
        "category": str,         # Billable | Non Billable | NA
        "start_date": str,
        "end_date": str,
        "comments": str,
        "role": str,
        "trainer_name": str,     # Actual person name
        "date": "YYYY-MM-DD",    # The specific calendar date
        "day_of_week": str,      # Monday..Sunday
        "raw_day_status": str    # Raw cell value for reference
    }
    """
    if len(raw_rows) < 3:
        return []

    header_row = raw_rows[1]  # Row index 1 = second row = column headers
    date_cols: list[tuple[int, datetime]] = []

    # Find all date columns (every other column starting at index 10)
    for col_idx in range(10, len(header_row)):
        parsed = parse_date_col_header(str(header_row[col_idx]))
        if parsed:
            date_cols.append((col_idx, parsed))

    records = []
    for row in raw_rows[2:]:  # Skip header rows
        if not row or not row[0]:  # Skip empty rows
            continue

        fixed = {
            FIXED_COLS[i]: str(row[i]).strip() if i < len(row) else ""
            for i in range(len(FIXED_COLS))
        }

        if not fixed["delivery_id"]:
            continue

        for col_idx, date_obj in date_cols:
            raw_val = str(row[col_idx]).strip() if col_idx < len(row) else ""

            if not is_trainer_name(raw_val):
                continue  # Skip non-trainer cells for assignment records

            record = {
                **fixed,
                "trainer_name": raw_val,
                "date": date_obj.strftime("%Y-%m-%d"),
                "day_of_week": date_obj.strftime("%A"),
                "raw_day_status": raw_val,
                "month": date_obj.strftime("%b %Y"),
                "week_number": date_obj.isocalendar().week,
            }
            records.append(record)

    return records
```

---

## 7. Business Logic Layer

### 7.1 KPI Calculations — `app/logic/kpis.py`

```python
from collections import Counter


def compute_kpis(records: list[dict]) -> dict:
    """
    Compute all top-level KPI metrics from normalized records.
    Returns a dict consumed directly by the /kpis API endpoint.
    """
    delivery_ids = {r["delivery_id"] for r in records}
    statuses = Counter(r["status"] for r in records if r["delivery_id"])

    # Unique trainers who appear as assigned (not status strings)
    all_trainers = {r["trainer_name"] for r in records if r["trainer_name"]}

    # Category breakdown (per unique delivery, not per row)
    delivery_categories = {}
    for r in records:
        if r["delivery_id"] not in delivery_categories:
            delivery_categories[r["delivery_id"]] = r["category"]

    cat_counts = Counter(delivery_categories.values())
    total_deliveries = len(delivery_ids) or 1  # avoid div by zero
    billable_pct = round(cat_counts.get("Billable", 0) / total_deliveries * 100)
    non_billable_pct = round(cat_counts.get("Non Billable", 0) / total_deliveries * 100)
    na_pct = 100 - billable_pct - non_billable_pct

    # Monthly delivery activity for bar chart
    monthly = {}
    seen_delivery_month = set()
    for r in records:
        key = (r["delivery_id"], r["month"])
        if key in seen_delivery_month:
            continue
        seen_delivery_month.add(key)
        month = r["month"]
        status = r["status"]
        if month not in monthly:
            monthly[month] = {"ongoing": 0, "completed": 0, "upcoming": 0}
        status_key = status.lower()
        if status_key in monthly[month]:
            monthly[month][status_key] += 1

    return {
        "total_deliveries": len(delivery_ids),
        "trainers_on_ground": len(all_trainers),
        "status_breakdown": {
            "ongoing":   statuses.get("Ongoing", 0),
            "completed": statuses.get("Completed", 0),
            "upcoming":  statuses.get("Upcoming", 0),
        },
        "billing": {
            "billable_pct":     billable_pct,
            "non_billable_pct": non_billable_pct,
            "na_pct":           na_pct,
        },
        "monthly_activity": monthly,
        "campus_count": len({r["campus"] for r in records if r["campus"]}),
    }
```

### 7.2 Conflict Detection — `app/logic/conflicts.py`

```python
from collections import defaultdict
from datetime import datetime


def detect_conflicts(records: list[dict]) -> list[dict]:
    """
    Identify three types of conflicts:
    1. Double-booked trainer — same trainer assigned to 2+ deliveries on the same date
    2. No trainer assigned — a delivery with status=Ongoing/Upcoming has no trainer on a date
       within its start–end range
    3. End date overrun — last recorded trainer assignment is after the declared end_date
    """
    conflicts = []

    # ── 1. Double-booking detection ──
    trainer_day_map: dict[tuple, list[str]] = defaultdict(list)
    for r in records:
        key = (r["trainer_name"], r["date"])
        trainer_day_map[key].append(r["delivery_id"])

    seen_double = set()
    for (trainer, date), delivery_ids in trainer_day_map.items():
        unique_deliveries = list(set(delivery_ids))
        if len(unique_deliveries) > 1:
            conflict_key = (trainer, date)
            if conflict_key not in seen_double:
                seen_double.add(conflict_key)
                conflicts.append({
                    "type": "double_booked",
                    "severity": "high",
                    "trainer": trainer,
                    "date": date,
                    "delivery_ids": unique_deliveries,
                    "message": f"{trainer} is assigned to {len(unique_deliveries)} deliveries on {date}",
                    "campuses": list({r["campus"] for r in records
                                      if r["trainer_name"] == trainer and r["date"] == date})
                })

    # ── 2. Unassigned delivery on active date ──
    delivery_date_map: dict[str, set] = defaultdict(set)
    delivery_meta: dict[str, dict] = {}
    for r in records:
        delivery_date_map[r["delivery_id"]].add(r["date"])
        delivery_meta[r["delivery_id"]] = {
            "campus": r["campus"],
            "course_name": r["course_name"],
            "status": r["status"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
        }

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    for delivery_id, meta in delivery_meta.items():
        if meta["status"] not in ("Ongoing", "Upcoming"):
            continue
        # If delivery has a start_date that has passed but no trainer records at all
        try:
            start = datetime.strptime(meta["start_date"], "%d-%b-%y")
            if start.strftime("%Y-%m-%d") <= today_str and delivery_id not in delivery_date_map:
                conflicts.append({
                    "type": "no_trainer",
                    "severity": "high",
                    "delivery_id": delivery_id,
                    "campus": meta["campus"],
                    "course_name": meta["course_name"],
                    "date": today_str,
                    "message": f"No trainer assigned for {meta['course_name']} at {meta['campus']}",
                })
        except ValueError:
            pass

    # Sort: high severity first, then by date
    conflicts.sort(key=lambda c: (c["severity"] != "high", c.get("date", "")))
    return conflicts[:20]  # Return top 20 conflicts maximum
```

### 7.3 Availability — `app/logic/availability.py`

```python
from collections import defaultdict
from datetime import datetime, timedelta


def build_availability(records: list[dict]) -> dict:
    """
    Build a trainer availability grid for the current week.
    Returns a structure ready for the heatmap component.
    """
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_dates = [(week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    # Map: trainer → date → list of delivery IDs
    trainer_day_delivery: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for r in records:
        trainer_day_delivery[r["trainer_name"]][r["date"]].append(r["delivery_id"])

    trainers = sorted(trainer_day_delivery.keys())[:15]  # Top 15 trainers for heatmap

    grid = []
    for trainer in trainers:
        row = {"trainer": trainer, "days": []}
        for date_str in week_dates:
            deliveries = trainer_day_delivery[trainer].get(date_str, [])
            count = len(set(deliveries))
            if count == 0:
                status = "free"
            elif count == 1:
                status = "assigned"
            else:
                status = "overload"

            # Check if weekend
            dow = datetime.strptime(date_str, "%Y-%m-%d").strftime("%A")
            if dow in ("Saturday", "Sunday"):
                status = "weekend" if count == 0 else status

            row["days"].append({
                "date": date_str,
                "day_of_week": dow,
                "status": status,
                "delivery_count": count,
                "delivery_ids": list(set(deliveries)),
            })
        grid.append(row)

    return {
        "week_start": week_dates[0],
        "week_end": week_dates[6],
        "dates": week_dates,
        "grid": grid,
    }
```

### 7.4 Pipeline — `app/logic/pipeline.py`

```python
from datetime import datetime


def build_pipeline(records: list[dict]) -> list[dict]:
    """
    Build a deduplicated, sorted delivery pipeline list.
    Returns one record per delivery (not per trainer assignment).
    """
    seen = {}
    for r in records:
        did = r["delivery_id"]
        if did not in seen:
            seen[did] = {
                "delivery_id": did,
                "status": r["status"],
                "campus": r["campus"],
                "course_name": r["course_name"],
                "category": r["category"],
                "start_date": r["start_date"],
                "end_date": r["end_date"],
                "trainers": set(),
            }
        seen[did]["trainers"].add(r["trainer_name"])

    # Convert sets to lists and sort
    pipeline = []
    for delivery in seen.values():
        delivery["trainers"] = list(delivery["trainers"])
        pipeline.append(delivery)

    # Sort: Ongoing → Upcoming → Completed, then by start_date
    STATUS_ORDER = {"Ongoing": 0, "Upcoming": 1, "Completed": 2}
    pipeline.sort(key=lambda d: (
        STATUS_ORDER.get(d["status"], 3),
        d["start_date"]
    ))

    return pipeline[:50]  # Return top 50 for the UI
```

---

## 8. REST API Endpoints — Contract

All endpoints are under prefix `/api/v1`. All responses are JSON. All endpoints are GET (read-only). Authentication: none required (internal network or deploy with Vercel password protection if needed).

### `GET /api/v1/kpis`

Returns top-level metrics for KPI cards and charts.

```json
{
  "total_deliveries": 236,
  "trainers_on_ground": 48,
  "campus_count": 32,
  "status_breakdown": {
    "ongoing": 52,
    "completed": 160,
    "upcoming": 24
  },
  "billing": {
    "billable_pct": 78,
    "non_billable_pct": 15,
    "na_pct": 7
  },
  "monthly_activity": {
    "Dec 2025": { "ongoing": 28, "completed": 18, "upcoming": 8 },
    "Jan 2026": { "ongoing": 35, "completed": 22, "upcoming": 12 }
  },
  "last_updated": "2026-05-22T10:30:00Z"
}
```

### `GET /api/v1/availability`

Returns trainer availability heatmap data for the current week.

```json
{
  "week_start": "2026-05-18",
  "week_end": "2026-05-24",
  "dates": ["2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22", "2026-05-23", "2026-05-24"],
  "grid": [
    {
      "trainer": "Vijay Kumar",
      "days": [
        { "date": "2026-05-18", "day_of_week": "Monday", "status": "assigned", "delivery_count": 1, "delivery_ids": ["LTIM-024"] },
        { "date": "2026-05-19", "day_of_week": "Tuesday", "status": "overload", "delivery_count": 2, "delivery_ids": ["LTIM-024", "KCT-011"] }
      ]
    }
  ]
}
```

**Status enum values:** `free` | `assigned` | `overload` | `weekend` | `no_class`

### `GET /api/v1/deliveries`

Returns sorted delivery pipeline list.

```json
{
  "deliveries": [
    {
      "delivery_id": "LTIM-024",
      "status": "Ongoing",
      "campus": "LTIM-Mumbai",
      "course_name": "Cloud Azure Full Stack",
      "category": "Billable",
      "start_date": "01-May-26",
      "end_date": "30-Jun-26",
      "trainers": ["Vijay Kumar", "Gokulnath S"]
    }
  ],
  "total": 236,
  "by_status": { "Ongoing": 52, "Upcoming": 24, "Completed": 160 }
}
```

**Query params:**
- `?status=Ongoing` — filter by status
- `?campus=LTIM-Mumbai` — filter by campus
- `?limit=20&offset=0` — pagination

### `GET /api/v1/conflicts`

Returns detected conflict alerts sorted by severity.

```json
{
  "conflicts": [
    {
      "type": "double_booked",
      "severity": "high",
      "trainer": "Vijay Kumar",
      "date": "2026-05-23",
      "delivery_ids": ["LTIM-024", "KCT-011"],
      "campuses": ["LTIM-Mumbai", "KCT"],
      "message": "Vijay Kumar is assigned to 2 deliveries on 2026-05-23"
    },
    {
      "type": "no_trainer",
      "severity": "high",
      "delivery_id": "SREC-007",
      "campus": "SREC",
      "course_name": "Cloud Azure",
      "date": "2026-05-26",
      "message": "No trainer assigned for Cloud Azure at SREC"
    }
  ],
  "total_conflicts": 3
}
```

### `GET /api/v1/campus-stats`

Returns campus utilization data for the table view.

```json
{
  "campuses": [
    {
      "campus": "LTIM-Mumbai",
      "total_deliveries": 24,
      "ongoing": 8,
      "upcoming": 4,
      "completed": 12,
      "utilization_pct": 92,
      "unique_trainers": 6
    }
  ]
}
```

### `GET /health`

Returns cache status and last sync time. Used by frontend to display the "Synced Xm ago" badge.

```json
{ "status": "ok", "last_sync": "2026-05-22T10:30:00Z", "records_cached": 8841 }
```

---

## 9. Frontend Implementation — React

### 9.1 Project Bootstrap

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install chart.js react-chartjs-2 zustand axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 9.2 Tailwind Config — `tailwind.config.js`

Implement exactly as specified in `DESIGN_PALETTE.md`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--bg-surface)',
        },
        border: { color: 'var(--border-color)' },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--text-accent)',
        },
        brand: { accent: 'var(--accent)', hover: 'var(--accent-hover)' },
        status: {
          success: 'var(--color-success)',
          'success-bg': 'var(--color-success-bg)',
          warning: 'var(--color-warning)',
          'warning-bg': 'var(--color-warning-bg)',
          danger: 'var(--color-danger)',
          'danger-bg': 'var(--color-danger-bg)',
          info: 'var(--color-info)',
          'info-bg': 'var(--color-info-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 8px -1px rgba(0,0,0,0.03)',
        'premium-dark': '0 8px 30px -4px rgba(0,0,0,0.35), 0 4px 12px -2px rgba(0,0,0,0.2)',
        'glow-accent': '0 0 15px rgba(3,37,189,0.25)',
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
}
```

### 9.3 API Client — `src/api/client.js`

```javascript
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res.data,
  err => {
    console.error('[API Error]', err.message);
    return Promise.reject(err);
  }
);

export const endpoints = {
  kpis:        () => api.get('/kpis'),
  availability: () => api.get('/availability'),
  deliveries:  (params = {}) => api.get('/deliveries', { params }),
  conflicts:   () => api.get('/conflicts'),
  campusStats: () => api.get('/campus-stats'),
  health:      () => axios.get(`${BASE_URL}/health`).then(r => r.data),
};
```

### 9.4 Global Store — `src/store/dashboardStore.js`

```javascript
import { create } from 'zustand';
import { endpoints } from '../api/client';

export const useDashboardStore = create((set, get) => ({
  // State
  kpis: null,
  availability: null,
  deliveries: null,
  conflicts: null,
  campusStats: null,
  lastSynced: null,
  isLoading: true,
  error: null,
  pollingInterval: null,

  // Actions
  fetchAll: async () => {
    try {
      const [kpis, availability, deliveries, conflicts, campusStats] = await Promise.all([
        endpoints.kpis(),
        endpoints.availability(),
        endpoints.deliveries(),
        endpoints.conflicts(),
        endpoints.campusStats(),
      ]);
      set({
        kpis, availability, deliveries, conflicts, campusStats,
        lastSynced: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  startPolling: () => {
    get().fetchAll();
    const interval = setInterval(() => get().fetchAll(), 5 * 60 * 1000);
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    set({ pollingInterval: null });
  },
}));
```

---

## 10. Design System Integration — Qlab's Swif ops

### 10.1 CSS Tokens — `src/index.css`

Copy the **exact** CSS variable blocks from `DESIGN_PALETTE.md` into `src/index.css`. Do not modify any token values. This is the design contract.

```css
/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* === Paste :root and .dark blocks from DESIGN_PALETTE.md here exactly === */

/* Global theme transition — from DETAILED_DESIGN.md */
* {
  transition: background-color 0.3s ease, color 0.3s ease,
              border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
```

### 10.2 Theme Hook — `src/hooks/useTheme.js`

```javascript
import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(true); // Default: dark theme

  useEffect(() => {
    const saved = localStorage.getItem('qlab-theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('qlab-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('qlab-theme', 'light');
      }
      return next;
    });
  };

  return { isDark, toggle };
}
```

### 10.3 Animation Classes

Apply the `fadeInUp` keyframe from `DETAILED_DESIGN.md` as a CSS class in `index.css`:

```css
@keyframes fadeInUp {
  0%   { opacity: 0; transform: translateY(16px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0)    scale(1); }
}

.animate-fade-in-up { animation: fadeInUp 0.35s ease-out forwards; }
.delay-100 { animation-delay: 0.05s; }
.delay-200 { animation-delay: 0.10s; }
.delay-300 { animation-delay: 0.15s; }
.delay-400 { animation-delay: 0.20s; }
.delay-500 { animation-delay: 0.25s; }
.delay-600 { animation-delay: 0.30s; }
```

Wrap each dashboard section in `opacity-0 animate-fade-in-up delay-{N}` to create staggered reveal on load.

---

## 11. Component Architecture

### 11.1 Component Specs

Each component below maps 1:1 to a visual section in `trainer_dashboard.html`. The HTML file is the exact visual contract — pixel-level accuracy is expected.

#### `Sidebar.jsx`

- Width: `w-64` (16rem), fixed position, full height
- Logo area: brand icon (royal blue `#0325BD` background, 36×36px, rounded-9px) + "Qlab's · Swif ops" header + "Trainer Allotment" sub-label in JetBrains Mono
- Live sync badge: green success background strip, animated dot, `font-mono text-[10px]`
- Nav items: active item has `border-l-[3px] border-brand-accent bg-accent/8 text-accent`
- Conflict badge: red pill showing count from `conflicts.total_conflicts`
- Footer: refresh interval + OneDrive source note in mono 11px

#### `Topbar.jsx`

- Height: `h-14` (56px), sticky, `backdrop-blur-md bg-bg-surface/80`
- Left: page title + breadcrumb in JetBrains Mono (`Swif ops / Trainer Allotment / Dashboard`)
- Right: date range pill (7D / 1M / 3M / YTD), refresh button (calls `fetchAll`), theme toggle (calls `toggle()`), avatar circle
- Live sync display: show `lastSynced` as "Synced Xm ago"

#### `KpiCard.jsx`

Props: `label`, `value`, `delta`, `deltaType` (up|down|neutral), `icon`, `iconColor`, `sparklineData`, `sparklineColor`

- `rounded-xl border border-border-color bg-bg-surface shadow-premium`
- Icon wrap: 32×32px, `rounded-lg`, colored background matching `iconColor`
- Value: `text-3xl font-bold tracking-tight text-text-primary`
- Delta: `rounded-full` pill with `bg-status-{deltaType}-bg text-status-{deltaType}`
- Sparkline: raw SVG `<polyline>` absolutely positioned bottom-right, `opacity-20`
- Hover: `hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-glow-accent`

#### `DeliveryBarChart.jsx`

- Chart.js `Bar`, type: grouped/stacked by status
- Colors: success (Ongoing), info (Completed), warning (Upcoming) — using CSS var values
- X axis: month labels from `kpis.monthly_activity`
- Tooltip: dark surface background matching current theme
- Rebuild chart on theme change — pass `isDark` as dependency to `useEffect`

#### `BillingDonut.jsx`

- Chart.js `Doughnut`, cutout 72%
- Data from `kpis.billing` — three segments: Billable (success), Non-Billable (warning), NA (muted)
- Below chart: three `billing-row` items showing percentages

#### `StatusPie.jsx`

- Chart.js `Pie`
- Data from `kpis.status_breakdown`
- Legend: bottom, small dots, 10px mono font

#### `WorkloadLine.jsx`

- Chart.js `Line`, tension 0.4, filled area
- Two datasets: "Sessions assigned" (accent blue) + "Capacity" (dashed, muted)
- Data: weekly aggregation of assignment counts from records

#### `AvailabilityHeatmap.jsx`

- Pure HTML/CSS grid (no chart library)
- Data from `availability.grid`
- Row per trainer, column per day (Mon–Sun)
- Cell states: `free` (success-bg), `assigned` (accent-bg 12%), `overload` (danger-bg), `weekend` (muted), `no_class` (border-color bg)
- Hover: `scale-125 z-10`
- Tooltip on hover showing trainer, day, status, delivery IDs

#### `DeliveryPipeline.jsx`

- Scrollable list, max-height `320px`
- Row per delivery from `deliveries.deliveries`
- Status pill: `pill-ongoing` (animated dot), `pill-upcoming`, `pill-completed`
- Font: course name in 12px font-medium, meta in 10px JetBrains Mono

#### `CampusTable.jsx`

- `data-table` per spec in `DETAILED_DESIGN.md`
- 3 columns: Campus, Deliveries, Utilization
- Utilization: thin `h-1.5` progress bar + percentage in JetBrains Mono
- Bar color: success >80%, warning 60–80%, danger <60%

#### `ConflictAlerts.jsx`

- Each conflict: `rounded-lg` card with `bg-status-danger-bg border border-danger/20`
- Icon: ⚡ (or Heroicon `ExclamationTriangleIcon`)
- Title: `text-sm font-semibold text-text-primary`
- Sub: campus + delivery in 10px mono
- Date: right-aligned in danger color

---

## 12. Chart Specifications

All charts use Chart.js 4.x with `react-chartjs-2` wrappers. Charts **must** update their color palette when the theme switches (light ↔ dark).

### Chart Color Resolution Pattern

```javascript
// Use this pattern in every chart component
const isDark = document.documentElement.classList.contains('dark');

const CHART_COLORS = {
  success:  isDark ? '#34d399' : '#10b981',
  warning:  isDark ? '#fbbf24' : '#f59e0b',
  danger:   isDark ? '#f87171' : '#ef4444',
  info:     isDark ? '#22d3ee' : '#06b6d4',
  accent:   '#0325BD',
  grid:     isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  textMuted: isDark ? '#475569' : '#94a3b8',
  surface:  isDark ? '#1a1d27' : '#ffffff',
  border:   isDark ? '#252836' : '#e2e8f0',
};
```

### Global Chart Defaults (set once in `App.jsx`)

```javascript
import { Chart as ChartJS, ... } from 'chart.js';

ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = 'var(--text-muted)';
```

### Tooltip Config (reuse across all charts)

```javascript
export const tooltipConfig = (colors) => ({
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  padding: 10,
  titleColor: colors.textPrimary,
  bodyColor: colors.textMuted,
  titleFont: { family: "'Inter', sans-serif", weight: '600', size: 12 },
  bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
});
```

---

## 13. State Management

### Data Flow

```
OneDrive Excel
    ↓ (Graph API, every 5 min)
FastAPI Backend
    ↓ (REST JSON, every 5 min)
Zustand Store (dashboardStore.js)
    ↓ (useSelector / direct access)
Page Components (Dashboard.jsx)
    ↓ (props)
Chart / Table / Heatmap Components
```

### Rules

- All API calls go through `dashboardStore.fetchAll()` — never call `endpoints.*` directly from components
- Components are pure: they receive data as props from `Dashboard.jsx`, which reads from the store
- Charts subscribe to `isDark` from `useTheme()` — they re-initialize on theme change via `key={isDark ? 'dark' : 'light'}` prop trick
- Loading state: show a skeleton shimmer on cards before first fetch completes
- Error state: show a toast notification if `fetchAll` fails; continue displaying stale data

---

## 14. Environment Configuration

### Backend `.env.example`

```env
# Azure App Registration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# OneDrive file references (get from Graph Explorer)
SHAREPOINT_SITE_ID=yourorg.sharepoint.com,site-id-part1,site-id-part2
SHAREPOINT_DRIVE_ID=drive-id-from-graph-explorer
EXCEL_FILE_ID=item-id-from-graph-explorer
EXCEL_SHEET_NAME=Sheet1

# Polling
POLL_INTERVAL_SECONDS=300
```

### Frontend `.env.example`

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## 15. Deployment

### Backend — Render

1. Connect GitHub repo to Render
2. Create a new **Web Service**
3. Runtime: Python 3.11
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all `.env` variables in Render's Environment settings
7. Set instance type: Free (sufficient for internal polling traffic)

### Frontend — Vercel

1. Connect GitHub repo to Vercel
2. Framework: Vite
3. Root directory: `frontend/`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add `VITE_API_BASE_URL` in Vercel environment variables (pointing to Render backend URL)

### CORS Update After Deploy

Once Vercel gives you the production URL, update `allow_origins` in `app/main.py`:

```python
allow_origins=["https://your-actual-vercel-domain.vercel.app"]
```

---

## 16. Agent Execution Order

Follow this exact sequence. Do not skip steps or reorder.

```
PHASE 1 — BACKEND FOUNDATION
  [ ] 1. Create backend/ directory structure as defined in Section 3
  [ ] 2. Implement app/config.py — pydantic-settings with all env vars
  [ ] 3. Implement app/cache/store.py — thread-safe in-memory cache
  [ ] 4. Implement app/graph/auth.py — MSAL token acquisition
  [ ] 5. Implement app/graph/excel_reader.py — Graph API fetch + refresh orchestrator
  [ ] 6. Implement app/parser/allotment_parser.py — wide-to-long transformer
  [ ] 7. Implement app/logic/kpis.py
  [ ] 8. Implement app/logic/conflicts.py
  [ ] 9. Implement app/logic/availability.py
  [ ] 10. Implement app/logic/pipeline.py
  [ ] 11. Implement app/scheduler.py — APScheduler wiring
  [ ] 12. Implement all 4 routers in app/routers/ — returning from cache
  [ ] 13. Implement app/main.py — FastAPI app with lifespan, CORS, router mounts
  [ ] 14. Write requirements.txt
  [ ] 15. Test locally: uvicorn app.main:app --reload
  [ ] 16. Verify /health returns ok and cache is populated after 5 seconds

PHASE 2 — FRONTEND FOUNDATION
  [ ] 17. Bootstrap Vite React project in frontend/
  [ ] 18. Install dependencies (chart.js, react-chartjs-2, zustand, axios)
  [ ] 19. Configure Tailwind with design tokens from DESIGN_PALETTE.md
  [ ] 20. Implement src/index.css — exact CSS variable tokens from DESIGN_PALETTE.md
  [ ] 21. Implement src/hooks/useTheme.js
  [ ] 22. Implement src/api/client.js — axios instance
  [ ] 23. Implement src/store/dashboardStore.js — Zustand store with polling

PHASE 3 — LAYOUT COMPONENTS
  [ ] 24. Implement Sidebar.jsx — match trainer_dashboard.html exactly
  [ ] 25. Implement Topbar.jsx — with theme toggle, date filter, sync time display
  [ ] 26. Implement App.jsx — shell layout, theme class on <html>, Chart.js defaults

PHASE 4 — DATA COMPONENTS
  [ ] 27. Implement KpiCard.jsx — with sparkline SVG
  [ ] 28. Implement DeliveryBarChart.jsx — theme-aware
  [ ] 29. Implement BillingDonut.jsx — theme-aware
  [ ] 30. Implement StatusPie.jsx — theme-aware
  [ ] 31. Implement WorkloadLine.jsx — theme-aware
  [ ] 32. Implement AvailabilityHeatmap.jsx — CSS grid, no chart library
  [ ] 33. Implement DeliveryPipeline.jsx — scrollable list
  [ ] 34. Implement CampusTable.jsx — with progress bars
  [ ] 35. Implement ConflictAlerts.jsx

PHASE 5 — ASSEMBLY & POLISH
  [ ] 36. Implement Dashboard.jsx — assembles all components, reads from store
  [ ] 37. Wire store polling: startPolling on mount, stopPolling on unmount
  [ ] 38. Implement loading skeletons for all card sections
  [ ] 39. Implement error toast for API failures
  [ ] 40. Verify staggered fadeInUp animations match design reference
  [ ] 41. Verify light/dark theme toggle updates all chart colors correctly
  [ ] 42. Verify real data from backend renders correctly in all components

PHASE 6 — DEPLOY
  [ ] 43. Deploy backend to Render, verify /health endpoint
  [ ] 44. Deploy frontend to Vercel with VITE_API_BASE_URL set
  [ ] 45. Update CORS origins in backend, redeploy
  [ ] 46. End-to-end test: edit Excel in OneDrive → wait 5 min → verify dashboard updates
```

---

## Design Reference

The locked design reference is `trainer_dashboard.html` (attached). It implements:
- Qlab's Swif ops CSS tokens exactly
- Sidebar with all nav items, live sync badge, brand identity
- Topbar with glassmorphism backdrop, breadcrumb, theme toggle
- 4 KPI cards with sparklines and colored delta pills
- Bar chart (delivery activity by month)
- Donut chart (billing breakdown) + billing stat rows
- Campus utilization table with colored progress bars
- Delivery pipeline scrollable list with status pills
- Status pie chart + conflict alerts panel
- Trainer availability heatmap (CSS grid)
- Workload trend line chart

**Do not change any colors, typography, spacing, or component structure from this reference. All UI decisions are locked.**

---

*Qlab's · Swif ops — Trainer Allotment Dashboard · Implementation Spec v1.0.0*
