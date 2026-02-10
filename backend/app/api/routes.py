"""API routes: NWS proxy and glossary."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.glossary_data import GLOSSARY, get_glossary_by_category, get_term
from app.nws.client import nws

router = APIRouter()


# --- Glossary (education) ---
@router.get("/glossary")
async def glossary_list():
    """Return all glossary entries, optionally grouped by category."""
    return {"entries": GLOSSARY, "by_category": get_glossary_by_category()}


@router.get("/glossary/{term}")
async def glossary_term(term: str):
    """Return a single glossary entry by term (case-insensitive)."""
    entry = get_term(term)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Term not found: {term}")
    return entry


# --- NWS: points (grid + forecast/station URLs) ---
@router.get("/points")
async def points(lat: float, lon: float):
    """Get NWS grid metadata and URLs for forecast and observations for a lat/lon."""
    try:
        data = await nws.points(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- NWS: forecast ---
@router.get("/forecast")
async def forecast(url: str):
    """Get zone forecast. Pass the forecastUrl from /points."""
    try:
        data = await nws.forecast(url)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/forecast/hourly")
async def forecast_hourly(url: str):
    """Get hourly forecast. Pass the forecastHourly URL from /points."""
    try:
        data = await nws.forecast_hourly(url)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- NWS: observations ---
@router.get("/stations/{station_id}/observations/latest")
async def observation_latest(station_id: str):
    """Get latest observation for a station (e.g. KORD)."""
    try:
        data = await nws.observation_latest(station_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/stations/observations")
async def stations_observations(url: str):
    """List observation stations. Pass the observationStations URL from /points."""
    try:
        data = await nws.stations_observations(url)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- NWS: gridpoint (raw gridded data for Phase 2) ---
@router.get("/gridpoints/{grid_id}/{grid_x}/{grid_y}")
async def gridpoint(grid_id: str, grid_x: int, grid_y: int):
    """Get raw gridpoint (model/NDFD) data for a grid cell. Used for raw vs corrected comparison."""
    try:
        data = await nws.gridpoint(grid_id, grid_x, grid_y)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- NWS: alerts ---
@router.get("/alerts/active")
async def alerts_active(zone: str | None = None, area: str | None = None):
    """Active alerts. Use zone=ILZ003 or area=IL."""
    try:
        if area:
            data = await nws.alerts_active_by_area(area)
        else:
            data = await nws.alerts_active(zone)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
