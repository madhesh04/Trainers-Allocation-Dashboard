from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings


ROOT_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = ROOT_DIR.parent


class Settings(BaseSettings):
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    SHAREPOINT_SITE_ID: str = ""
    SHAREPOINT_DRIVE_ID: str = ""
    EXCEL_FILE_ID: str = ""
    EXCEL_SHEET_NAME: str = "Sheet1"
    POLL_INTERVAL_SECONDS: int = 300
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    LOCAL_CSV_PATH: str = str(ROOT_DIR / "Trainer_Tracker_Live(Allotment Data).csv")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def graph_configured(self) -> bool:
        return all(
            [
                self.AZURE_TENANT_ID,
                self.AZURE_CLIENT_ID,
                self.AZURE_CLIENT_SECRET,
                self.SHAREPOINT_DRIVE_ID,
                self.EXCEL_FILE_ID,
            ]
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
