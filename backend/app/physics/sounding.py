"""
Sounding: return profile and CAPE/CIN for display (Phase 3).
Sources: wyoming (observed), rap/hrrr (model), or demo when no lat/lon.
"""
from __future__ import annotations

from typing import Any

from app.nws.cache import model_sounding_cache
from app.physics.model_sounding import _run_time_utc, get_model_sounding
from app.physics.uwyo_sounding import get_real_sounding


def get_sounding(
    lat: float | None = None,
    lon: float | None = None,
    source: str = "wyoming",
) -> dict[str, Any]:
    """Return sounding for (lat, lon). source: wyoming | rap | hrrr. Same response shape."""
    if lat is not None and lon is not None:
        source_lower = (source or "wyoming").lower()
        if source_lower in ("rap", "hrrr"):
            run_time = _run_time_utc()
            cache_key = f"model_sounding:{source_lower}:{lat:.2f}:{lon:.2f}:{run_time}"
            cached = model_sounding_cache.get(cache_key)
            if cached is not None:
                return cached
            try:
                result = get_model_sounding(lat, lon, source=source_lower)
                if result:
                    model_sounding_cache.set(cache_key, result)
                    return result
            except Exception:
                pass
            return get_sounding_demo()
        # Wyoming (observed)
        try:
            result = get_real_sounding(lat, lon)
            if result:
                return result
        except Exception:
            pass
    return get_sounding_demo()


def get_sounding_demo() -> dict[str, Any]:
    """Return a demo sounding with CAPE/CIN and profile (pressure, T, Td)."""
    try:
        import numpy as np
        from metpy.units import units
        from metpy.calc import cape_cin, parcel_profile, dewpoint_from_relative_humidity

        p = np.array([1000, 950, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200]) * units.hPa
        T = np.array([24, 22, 19, 15, 11, 7, 3, -2, -7, -13, -20, -28, -37, -47, -55, -58, -52]) * units.degC
        rh = np.array([75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 12, 10, 8, 5]) / 100.0
        Td = dewpoint_from_relative_humidity(T, rh)
        parcel = parcel_profile(p, T[0], Td[0])
        cape, cin = cape_cin(p, T, Td, parcel)
        cape_val = float(cape.to(units("J/kg")).magnitude) if cape is not None else 0.0
        cin_val = float(cin.to(units("J/kg")).magnitude) if cin is not None else 0.0
        profile = [{"p_hpa": float(pi), "T_C": float(ti), "Td_C": float(tdi)} for pi, ti, tdi in zip(p.magnitude, T.magnitude, Td.magnitude)]
        return {"source": "demo", "cape_j_kg": round(cape_val, 1), "cin_j_kg": round(cin_val, 1), "profile": profile}
    except Exception:
        return _static_demo()


def _static_demo() -> dict[str, Any]:
    """Fallback when MetPy not available."""
    return {
        "source": "demo_static",
        "cape_j_kg": 850.0,
        "cin_j_kg": -45.0,
        "profile": [
            {"p_hpa": 1000, "T_C": 24, "Td_C": 19},
            {"p_hpa": 950, "T_C": 22, "Td_C": 17},
            {"p_hpa": 850, "T_C": 15, "Td_C": 10},
            {"p_hpa": 700, "T_C": 3, "Td_C": -2},
            {"p_hpa": 500, "T_C": -20, "Td_C": -30},
            {"p_hpa": 400, "T_C": -37, "Td_C": -45},
        ],
    }
