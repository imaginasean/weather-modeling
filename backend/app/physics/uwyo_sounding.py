"""
Fetch and parse real soundings from University of Wyoming.
Find nearest station to (lat, lon), fetch latest sounding, return profile + CAPE/CIN.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import math
import httpx

# WMO upper-air station id, lat, lon (US rawinsonde network for Wyoming soundings)
# More stations = better coverage so distant locations get different nearest stations
UPPER_AIR_STATIONS = [
    (72215, 25.8, -80.3),   # Miami
    (72202, 24.55, -81.75), # Key West
    (72210, 30.23, -81.88), # Jacksonville
    (72214, 28.43, -80.57), # Cape Canaveral
    (72220, 32.9, -80.03),  # Charleston
    (72305, 35.22, -80.95), # Charlotte
    (72317, 35.87, -78.78), # Raleigh
    (72403, 38.85, -77.03), # Washington DC
    (72402, 39.18, -76.67), # Baltimore
    (74486, 40.78, -73.97), # New York
    (72649, 43.65, -70.3),  # Portland ME
    (72501, 35.39, -97.6),  # Oklahoma City
    (72327, 36.25, -86.57), # Nashville
    (72235, 30.49, -86.53), # Eglin
    (72240, 32.9, -97.04),  # Fort Worth
    (72250, 29.98, -95.37), # Houston
    (72469, 39.75, -104.87), # Denver
    (72363, 35.04, -106.62), # Albuquerque
    (72572, 40.78, -111.97), # Salt Lake City
    (72489, 39.05, -95.65), # Topeka
    (72528, 41.32, -95.9),  # Omaha
    (72672, 42.95, -87.9),  # Milwaukee
    (72645, 41.78, -87.75), # Chicago
    (72694, 47.46, -111.38), # Great Falls
    (72747, 45.7, -121.52), # Portland OR
    (72797, 47.95, -124.55), # Quillayute WA
    (72274, 33.43, -112.02), # Phoenix
    (72293, 32.73, -117.19), # San Diego
    (72288, 33.94, -118.4), # Los Angeles
    (72201, 26.08, -80.15), # Fort Lauderdale
]


def nearest_station(lat: float, lon: float) -> tuple[int, float, float]:
    """Return (station_id, lat, lon) for nearest upper-air station."""
    best = None
    best_d = 1e9
    for stid, slat, slon in UPPER_AIR_STATIONS:
        d = math.sqrt((lat - slat) ** 2 + (lon - slon) ** 2)
        if d < best_d:
            best_d = d
            best = (stid, slat, slon)
    return best or (72215, 25.8, -80.3)


def fetch_wyoming_sounding(station_id: int, from_time: str = "1200") -> str:
    """Fetch sounding text from Wyoming. from_time is 0000 or 1200 (Z)."""
    now = datetime.now(timezone.utc)
    url = (
        "https://weather.uwyo.edu/cgi-bin/sounding"
        f"?region=naconf&TYPE=TEXT%3ALIST&YEAR={now.year}&MONTH={now.month}&DAY={now.day}"
        f"&FROM={from_time}&TO={from_time}&STNM={station_id}"
    )
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def parse_wyoming_text(text: str) -> tuple[list[float], list[float], list[float]]:
    """Parse Wyoming sounding text. Returns (p_hpa, T_C, Td_C) lists. Only rows with valid T and Td."""
    p_list, t_list, td_list = [], [], []
    in_data = False
    for line in text.splitlines():
        if "PRES" in line and "HGHT" in line and "TEMP" in line:
            in_data = True
            continue
        if not in_data:
            continue
        if line.strip() == "" or line.startswith("Station") or line.startswith("("):
            continue
        parts = line.split()
        if len(parts) < 4:
            continue
        try:
            pres = float(parts[0])
            temp = float(parts[2]) if parts[2] != "***" else None
            dwpt = float(parts[3]) if parts[3] != "***" else None
            if pres < 50 or pres > 1050:
                continue
            if temp is None or dwpt is None:
                continue
            p_list.append(pres)
            t_list.append(temp)
            td_list.append(dwpt)
        except (ValueError, IndexError):
            continue
    return p_list, t_list, td_list


def get_real_sounding(lat: float, lon: float) -> dict[str, Any] | None:
    """Fetch real sounding for nearest station to (lat, lon). Return profile + CAPE/CIN. Uses cache."""
    from app.nws.cache import wyoming_sounding_cache

    station_id, slat, slon = nearest_station(lat, lon)
    for from_time in ("1200", "0000"):
        key = f"wyoming_sounding:{station_id}:{from_time}"
        cached = wyoming_sounding_cache.get(key)
        if cached is not None:
            return cached
        try:
            text = fetch_wyoming_sounding(station_id, from_time)
            p_list, t_list, td_list = parse_wyoming_text(text)
            if len(p_list) < 5:
                continue
            import numpy as np
            from metpy.units import units
            from metpy.calc import cape_cin, parcel_profile

            p = np.array(p_list) * units.hPa
            T = np.array(t_list) * units.degC
            Td = np.array(td_list) * units.degC
            if len(p) < 5:
                continue
            parcel = parcel_profile(p, T[0], Td[0])
            cape, cin = cape_cin(p, T, Td, parcel)
            cape_val = float(cape.to(units("J/kg")).magnitude) if cape is not None else 0.0
            cin_val = float(cin.to(units("J/kg")).magnitude) if cin is not None else 0.0
            profile = [
                {"p_hpa": float(pi), "T_C": float(ti), "Td_C": float(tdi)}
                for pi, ti, tdi in zip(p.magnitude, T.magnitude, Td.magnitude)
            ]
            result = {
                "source": "uwyo",
                "station_id": station_id,
                "station_lat": slat,
                "station_lon": slon,
                "from_time": from_time,
                "cape_j_kg": round(cape_val, 1),
                "cin_j_kg": round(cin_val, 1),
                "profile": profile,
            }
            wyoming_sounding_cache.set(key, result)
            return result
        except Exception:
            continue
    return None
