# Weather Modeling

Weather forecasting application using real NWS data. Phase 1: ingest, visualize, and educate.

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
4. Use **Glossary** and **Info (ℹ️) tooltips** for term definitions (e.g. NDFD, bias correction).

## Project layout

- `backend/` — FastAPI app: NWS client, cache, `/api/points`, `/api/forecast`, `/api/forecast/hourly`, `/api/gridpoints/{gridId}/{gridX}/{gridY}`, `/api/stations/...`, `/api/alerts/active`, `/api/glossary`.
- `frontend/` — Vite + React + TypeScript: Leaflet map, dashboard (forecast, hourly chart, **raw gridpoint**, **Raw vs Corrected** toggle, observation, alerts), tooltip component, glossary panel.

## Plan

See the phased plan for Phase 2 (post-processing), Phase 3 (simple physics), and Phase 4 (full NWP-style modeling).
