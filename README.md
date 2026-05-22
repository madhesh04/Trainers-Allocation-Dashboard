# 🎓 Trainer Allocation & Operations Dashboard

A high-fidelity, real-time management dashboard designed for **Qlab's Swif ops** to streamline and monitor trainer allocations. The platform integrates with **Microsoft Entra ID (Azure AD)** and **Microsoft Graph API** to pull live scheduling data from a SharePoint-hosted Excel matrix, caching it seamlessly in-memory while providing a robust local CSV fallback.

---

## 🚀 Key Features

*   📊 **Real-Time Overview & KPIs**: Interactive cards displaying active deliveries, trainers currently on ground, open conflicts, and average utilization rates computed dynamically.
*   🟢 **Trainer Availability Board**: A high-fidelity interactive heatmap that visualizes trainer availability, tracking who is free, occupied, or overloaded across scheduling periods.
*   📦 **Active Deliveries Pipeline**: A paginated, searchable, and filterable directory of all scheduled training programs with responsive status indicators.
*   ⚠️ **Conflict Resolution Center**: A specialized workspace that identifies double-bookings and offers an **AI-assisted roster reallocation console** recommending alternative backup trainers in real-time.
*   🏛️ **Campus Statistics Directory**: Deep-dive analytics evaluating delivery counts and utilization rates across multiple campus locations.
*   📈 **Workload & Capacity Trends**: Beautiful full-width charts visualizing total assigned training hours vs. total bench capacity to predict resource gaps.
*   🌗 **Premium Dual Theme**: Elegant, high-contrast Dark and Light modes using modern typography (Inter) with custom HSL color systems.

---

## 🛠️ Technology Stack

### Backend
*   **FastAPI** (Python 3.12+): High-performance, asynchronous REST API.
*   **Microsoft Graph SDK**: Enterprise-grade integration with Azure AD for SharePoint drive querying.
*   **APScheduler**: Automated background worker to poll SharePoint spreadsheet updates.
*   **Pydantic Settings**: Standardized environmental variable parsing and loading.

### Frontend
*   **React** & **Vite**: Rapid, modern hot-reloading frontend development.
*   **TailwindCSS**: Utmost styling control with a curated custom palette.
*   **Chart.js** & **React-Chartjs-2**: High-contrast, interactive bar, pie, and line charts with absolute legibility in dark and light modes.
*   **Zustand**: Fast and lightweight global state management with built-in API polling hooks.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── cache/          # In-memory storage & background cache sync
│   │   ├── graph/          # Microsoft Graph API client for SharePoint Excel range
│   │   ├── logic/          # Core operations (Availability, Conflicts, KPIs)
│   │   ├── parser/         # Date normalizer & Excel/CSV allotment parser
│   │   ├── routers/        # API endpoints grouped by operational domain
│   │   ├── config.py       # Pydantic Settings implementation
│   │   ├── main.py         # FastAPI application bootstrap
│   │   └── scheduler.py    # Background cache synchronization scheduler
│   ├── .env.example        # Configuration template for local & cloud storage
│   ├── Dockerfile          # Multi-stage Docker setup for backend service
│   └── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/            # API client and backend fetch queries
│   │   ├── charts/         # Chart.js configs and scale managers
│   │   ├── components/     # High-fidelity dashboard UI widgets
│   │   ├── hooks/          # Custom hooks (e.g., useTheme)
│   │   ├── pages/          # Tabbed directory views (Overview, Availability, etc.)
│   │   ├── store/          # Zustand store with polling managers
│   │   ├── App.jsx         # App routing and theme wrapper
│   │   └── index.css       # Design token system & global vanilla styling
│   ├── .env.example        # Frontend port and backend endpoint configurations
│   ├── vite.config.js      # Build tool configuration
│   └── package.json        # Frontend NPM dependencies
│
├── Trainer_Tracker_Live(Allotment Data).csv  # Local fallback CSV mock data
├── docker-compose.yml      # Orchestrates full stack local execution
└── .gitignore              # Standard ignored patterns (caches, build, environments)
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
*   Python `3.10` or above
*   Node.js `18` or above
*   Docker (Optional, for running with compose)

---

### 2. Backend Configuration & Launch

1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create your local configuration file from the template:
    ```bash
    cp .env.example .env
    ```
3.  Configure your environment variables:
    *   **Cloud Mode (Microsoft Graph Integration)**:
        To poll directly from SharePoint, populate your Azure app credentials:
        ```ini
        AZURE_TENANT_ID=your_tenant_id
        AZURE_CLIENT_ID=your_client_id
        AZURE_CLIENT_SECRET=your_client_secret
        SHAREPOINT_SITE_ID=your_site_id
        SHAREPOINT_DRIVE_ID=your_drive_id
        EXCEL_FILE_ID=your_file_id
        EXCEL_SHEET_NAME=Sheet1
        ```
    *   **Local Fallback Mode**:
        If any of the `AZURE_*` credentials above are empty, the backend will auto-detect this and fallback seamlessly to parsing `Trainer_Tracker_Live(Allotment Data).csv` locally.
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Start the FastAPI development server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will now be live on `http://localhost:8000`. You can inspect the interactive OpenAPI documentation at `http://localhost:8000/docs`.

---

### 3. Frontend Configuration & Launch

1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install all packages:
    ```bash
    npm install
    ```
3.  Start the Vite local development server:
    ```bash
    npm run dev
    ```
    The user interface will be served at `http://localhost:5173`.

---

### 🐳 Running via Docker Compose

To spin up both the FastAPI backend and React frontend concurrently:

```bash
docker-compose up --build
```
This will automatically launch the entire stack in isolated containers, binding the API to port `8000` and the web dashboard to port `5173` with live-reloads enabled.
