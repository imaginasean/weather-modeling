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

1. **Click the map** to select a location. The app fetches NWS grid data and shows forecast periods and hourly temperature/precip.
2. **Click a station marker** (after selecting a location) to see the latest **observation** (temperature, dew point, wind chill, etc.).
3. Use **Glossary** in the header to see all term definitions. **Info (ℹ️) tooltips** next to terms explain forecast, observation, dew point, wind chill, heat index, precipitation chance, and watch vs warning.

## Project layout

- `backend/` — FastAPI app: NWS client, cache, `/api/points`, `/api/forecast`, `/api/forecast/hourly`, `/api/stations/...`, `/api/alerts/active`, `/api/glossary`.
- `frontend/` — Vite + React + TypeScript: Leaflet map, dashboard (forecast + hourly chart, observation, alerts), tooltip component, glossary panel.

## Plan

See the phased plan for Phase 2 (post-processing), Phase 3 (simple physics), and Phase 4 (full NWP-style modeling).
