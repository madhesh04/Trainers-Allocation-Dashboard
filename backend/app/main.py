from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cache.store import cache
from app.config import settings
from app.routers import availability, conflicts, deliveries, kpis
from app.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Trainer Allotment API",
    description="Qlab's Swif ops - Trainer Dashboard backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(kpis.router, prefix="/api/v1", tags=["KPIs"])
app.include_router(availability.router, prefix="/api/v1", tags=["Availability"])
app.include_router(deliveries.router, prefix="/api/v1", tags=["Deliveries"])
app.include_router(conflicts.router, prefix="/api/v1", tags=["Conflicts"])


@app.get("/health")
def health():
    parsed = cache.get("parsed", {"records": [], "assignments": []})
    return {
        "status": "ok" if cache.is_ready else "warming",
        "last_sync": cache.last_updated,
        "records_cached": len(parsed.get("assignments", [])),
        "source": cache.source,
        "error": cache.error,
    }
