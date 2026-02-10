"""API routes: NWS proxy and glossary."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.glossary_data import GLOSSARY, get_glossary_by_category, get_term
from app.nws.client import nws
from app.physics.advection_1d import solve_1d_advection
from app.physics.advection_2d import solve_2d_advection_diffusion
from app.physics.sounding import get_sounding

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


# --- Physics (Phase 3) ---
@router.get("/physics/advection-1d")
async def physics_advection_1d(
    nx: int = 100,
    c: float = 1.0,
    num_steps: int = 50,
    output_interval: int = 10,
):
    """Run 1D advection u_t + c u_x = 0; returns x and u(x) at time steps for viz."""
    if nx < 10 or nx > 500:
        raise HTTPException(status_code=400, detail="nx must be between 10 and 500")
    if num_steps < 1 or num_steps > 500:
        raise HTTPException(status_code=400, detail="num_steps must be between 1 and 500")
    try:
        return solve_1d_advection(nx=nx, c=c, num_steps=num_steps, output_interval=output_interval)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/physics/advection-2d")
async def physics_advection_2d(
    nx: int = 40,
    ny: int = 30,
    cx: float = 0.5,
    cy: float = 0.0,
    diffusion: float = 0.001,
    num_steps: int = 30,
    output_interval: int = 10,
):
    """Run 2D advection-diffusion; returns 2D field at time steps for viz."""
    if nx < 5 or nx > 80 or ny < 5 or ny > 80:
        raise HTTPException(status_code=400, detail="nx, ny must be between 5 and 80")
    if num_steps < 1 or num_steps > 200:
        raise HTTPException(status_code=400, detail="num_steps must be between 1 and 200")
    try:
        return solve_2d_advection_diffusion(
            nx=nx, ny=ny, cx=cx, cy=cy, diffusion=diffusion,
            num_steps=num_steps, output_interval=output_interval,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/physics/sounding")
async def physics_sounding(
    lat: float | None = None,
    lon: float | None = None,
    source: str = "wyoming",
):
    """Return sounding with CAPE, CIN, profile. source: wyoming (observed) | rap | hrrr (model)."""
    try:
        return get_sounding(lat, lon, source=source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
