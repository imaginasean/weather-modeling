"""NWS API client: points, stations, forecasts, observations."""
from __future__ import annotations

import httpx
from app.config import settings
from app.nws.cache import nws_cache

NWS_BASE = settings.nws_base_url
TIMEOUT = settings.request_timeout_seconds
USER_AGENT = "WeatherModelingApp/1.0 (educational project)"


class NWSClient:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get(self, path: str) -> dict:
        url = f"{NWS_BASE}{path}"
        cached = nws_cache.get(url)
        if cached is not None:
            return cached
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=TIMEOUT,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
        resp = await self._client.get(url)
        resp.raise_for_status()
        data = resp.json()
        nws_cache.set(url, data)
        return data

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    # --- Points and grid ---
    async def points(self, lat: float, lon: float) -> dict:
        """Get grid metadata and forecast/observation station URLs for a lat/lon."""
        return await self._get(f"/points/{lat:.4f},{lon:.4f}")

    # --- Forecast ---
    async def forecast(self, forecast_url: str) -> dict:
        """Get zone forecast from points response."""
        if forecast_url.startswith("http"):
            path = forecast_url.replace(NWS_BASE, "")
        else:
            path = forecast_url
        return await self._get(path)

    async def forecast_hourly(self, hourly_url: str) -> dict:
        if hourly_url.startswith("http"):
            path = hourly_url.replace(NWS_BASE, "")
        else:
            path = hourly_url
        return await self._get(path)

    # --- Observations ---
    async def stations_observations(self, stations_url: str) -> dict:
        """List observation stations (e.g. from points)."""
        if stations_url.startswith("http"):
            path = stations_url.replace(NWS_BASE, "")
        else:
            path = stations_url
        return await self._get(path)

    async def observation_latest(self, station_id: str) -> dict:
        """Latest observation for a station (e.g. KORD)."""
        return await self._get(f"/stations/{station_id}/observations/latest")

    # --- Alerts ---
    async def alerts_active(self, zone_id: str | None = None) -> dict:
        """Active alerts. zone_id optional (e.g. ILZ003)."""
        path = "/alerts/active"
        if zone_id:
            path += f"?zone={zone_id}"
        return await self._get(path)

    async def alerts_active_by_area(self, state: str) -> dict:
        """Active alerts for a state (e.g. IL)."""
        return await self._get(f"/alerts/active?area={state}")


nws = NWSClient()
