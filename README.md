# Weather Modeling

Weather forecasting application using real NWS data. Phases 1–3: ingest, visualize, raw vs bias-corrected, and simple physics (advection, sounding).

## Quick start

### Backend (Python)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend proxies `/api` to the backend.

### Usage

1. **Click the map** to select a location. The app fetches NWS grid data and shows forecast periods, hourly temperature/precip, **raw gridpoint (model)** data, and alerts.
2. **Click a station marker** to see the latest **observation** and to enable **bias-corrected** values (raw + observation − raw).
3. Use **Raw** / **Corrected** in the gridpoint section to compare model vs bias-corrected temperature and dew point.
4. Use **Glossary** and **Info (ℹ️) tooltips** for term definitions.
5. **Phase 3:** Scroll to **1D advection**, **2D advection–diffusion**, and **Sounding (demo)** for CAPE/CIN and T vs pressure.

## Project layout

- `backend/` — FastAPI: NWS client, cache, gridpoints, **physics** (`/api/physics/advection-1d`, `advection-2d`, `sounding`), glossary.
- `frontend/` — Vite + React + TypeScript: map, dashboard (forecast, gridpoint raw/corrected, observation, alerts, **1D/2D advection demos**, **sounding**), tooltips, glossary.

## Plan

See the phased plan for Phase 4 (full NWP-style modeling) and beyond.
