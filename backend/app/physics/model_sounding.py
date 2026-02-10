"""
Model-derived soundings from RAP/HRRR (Herbie + GRIB2).
Extract T/Td on pressure levels at (lat, lon), compute CAPE/CIN with MetPy.
Returns same shape as Wyoming sounding for frontend compatibility.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np


def _run_time_utc() -> str:
    """Return latest RAP/HRRR run time as 'YYYY-MM-DD HH' (UTC). RAP runs 00, 03, ..., 21."""
    now = datetime.now(timezone.utc)
    hour = (now.hour // 3) * 3
    run = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    return run.strftime("%Y-%m-%d %H")


def _nearest_point_index(lat_2d: np.ndarray, lon_2d: np.ndarray, lat: float, lon: float) -> tuple[int, int]:
    """Return (iy, ix) of nearest grid point. lon_2d may be 0-360."""
    lon_sel = lon if 0 <= lon <= 360 else (lon + 360) if lon < 0 else lon
    dist = (lat_2d - lat) ** 2 + (lon_2d - lon_sel) ** 2
    flat_idx = np.nanargmin(np.where(np.isfinite(dist), dist, np.inf))
    iy, ix = np.unravel_index(flat_idx, lat_2d.shape)
    return int(iy), int(ix)


def get_model_sounding(
    lat: float,
    lon: float,
    source: str = "rap",
    valid_time: str | None = None,
) -> dict[str, Any] | None:
    """
    Fetch model (RAP or HRRR) sounding at (lat, lon). Return profile + CAPE/CIN
    in same shape as Wyoming: { source, cape_j_kg, cin_j_kg, profile, from_time? }.
    """
    run_time = valid_time or _run_time_utc()
    model = "rap" if source.lower() == "rap" else "hrrr"
    product = "awp130pgrb" if model == "rap" else "prs"

    try:
        from herbie import Herbie
    except ImportError:
        return None

    try:
        H = Herbie(run_time, model=model, product=product, fxx=0)
    except Exception:
        return None

    # Load temperature on isobaric levels
    try:
        ds_t = H.xarray(":TMP:[0-9]+ mb", remove_grib=True)
    except Exception:
        return None
    if ds_t is None:
        return None
    if isinstance(ds_t, list):
        ds_t = next((d for d in ds_t if "isobaricInhPa" in d.dims or "isobaric" in str(d.dims).lower()), ds_t[0] if ds_t else None)
    if ds_t is None:
        return None

    # Latitude/longitude and nearest point
    lat_2d = np.asarray(ds_t.latitude) if hasattr(ds_t, "latitude") else np.asarray(ds_t.lat)
    lon_2d = np.asarray(ds_t.longitude) if hasattr(ds_t, "longitude") else np.asarray(ds_t.lon)
    iy, ix = _nearest_point_index(lat_2d, lon_2d, lat, lon)

    # Pressure dimension
    pres_dim = None
    for d in ds_t.dims:
        if "isobaric" in d.lower() or "pressure" in d.lower() or d == "pressure":
            pres_dim = d
            break
    if pres_dim is None:
        pres_dim = [d for d in ds_t.dims if d not in ("y", "x", "latitude", "longitude", "lat", "lon")][0]

    def _temp_var(ds):
        for v in ds.data_vars:
            vstr = str(ds[v].attrs.get("GRIB_shortName", v)).lower()
            vlow = str(v).lower()
            if (vstr in ("t", "tmp") or "tmp" in vlow) and "2" not in str(ds[v].dims):
                return v
        return next((v for v in ds.data_vars if "tmp" in str(v).lower() or v == "t"), list(ds.data_vars)[0])

    t_var = _temp_var(ds_t)
    T_da = ds_t[t_var]

    # Load dewpoint separately so we always get real DPT (using T for Td gives CAPE/CIN 0)
    td_1d_values = None
    pres_dpt = None
    try:
        ds_dpt = H.xarray(":DPT:[0-9]+ mb", remove_grib=True)
        if ds_dpt is not None:
            if isinstance(ds_dpt, list):
                ds_dpt = next((d for d in ds_dpt if "isobaricInhPa" in d.dims or "isobaric" in str(d.dims).lower()), ds_dpt[0] if ds_dpt else None)
            if ds_dpt is not None:
                dpt_pdim = next((d for d in ds_dpt.dims if "isobaric" in d.lower() or "pressure" in d.lower()), pres_dim)
                dpt_var = None
                for v in ds_dpt.data_vars:
                    vstr = str(ds_dpt[v].attrs.get("GRIB_shortName", v)).lower()
                    if "dpt" in vstr or "dp" == vstr or "dpt" in str(v).lower():
                        dpt_var = v
                        break
                if dpt_var is None:
                    dpt_var = next((v for v in ds_dpt.data_vars if "dpt" in str(v).lower() or "dew" in str(v).lower()), list(ds_dpt.data_vars)[0])
                Td_da = ds_dpt[dpt_var]
                if "y" in Td_da.dims and "x" in Td_da.dims:
                    Td_1d = Td_da.isel(y=iy, x=ix)
                elif "latitude" in Td_da.dims:
                    Td_1d = Td_da.isel(latitude=iy, longitude=ix)
                else:
                    Td_1d = Td_da.isel({d: 0 for d in Td_da.dims if d != dpt_pdim})
                td_1d_values = np.atleast_1d(Td_1d.values).flatten()
                pres_dpt = np.asarray(Td_1d[dpt_pdim].values)
                if hasattr(pres_dpt, "magnitude"):
                    pres_dpt = pres_dpt.magnitude
    except Exception:
        pass

    # If we didn't get DPT, we cannot compute meaningful CAPE/CIN (Td = T would give 0)
    if td_1d_values is None:
        return None

    # Select point (y, x) and get 1D over pressure for T
    if "y" in T_da.dims and "x" in T_da.dims:
        T_1d = T_da.isel(y=iy, x=ix)
    elif "latitude" in T_da.dims:
        T_1d = T_da.isel(latitude=iy, longitude=ix)
    else:
        T_1d = T_da.isel({d: 0 for d in T_da.dims if d != pres_dim})

    pres = np.asarray(T_1d[pres_dim].values)
    if hasattr(pres, "magnitude"):
        pres = pres.magnitude
    t_k = np.atleast_1d(T_1d.values).flatten()
    # Align DPT to T's pressure levels (models use same isobaric set; match by pressure)
    if pres_dpt is not None and len(pres_dpt) == len(pres) and np.allclose(pres, pres_dpt):
        td_k = np.asarray(td_1d_values, dtype=float)
    else:
        # Map DPT onto T pressures by nearest level
        td_k = np.zeros_like(t_k, dtype=float)
        for i, p in enumerate(pres):
            j = np.argmin(np.abs(pres_dpt - p)) if pres_dpt is not None and len(pres_dpt) else 0
            td_k[i] = td_1d_values[j] if j < len(td_1d_values) else t_k[i]

    # Sort by pressure descending
    order = np.argsort(pres)[::-1]
    p_list = pres[order].tolist()
    t_list = (t_k[order] - 273.15).tolist()
    td_list = (td_k[order] - 273.15).tolist()

    # Filter invalid
    valid = [i for i in range(len(p_list)) if 50 < p_list[i] < 1050 and np.isfinite(t_list[i]) and np.isfinite(td_list[i])]
    if len(valid) < 5:
        return None
    p_list = [p_list[i] for i in valid]
    t_list = [t_list[i] for i in valid]
    td_list = [td_list[i] for i in valid]

    try:
        from metpy.units import units
        from metpy.calc import cape_cin, parcel_profile

        p = np.array(p_list) * units.hPa
        T = np.array(t_list) * units.degC
        Td = np.array(td_list) * units.degC
        parcel = parcel_profile(p, T[0], Td[0])
        cape, cin = cape_cin(p, T, Td, parcel)
        cape_val = float(cape.to(units("J/kg")).magnitude) if cape is not None else 0.0
        cin_val = float(cin.to(units("J/kg")).magnitude) if cin is not None else 0.0
    except Exception:
        cape_val, cin_val = 0.0, 0.0

    profile = [
        {"p_hpa": float(pi), "T_C": float(ti), "Td_C": float(tdi)}
        for pi, ti, tdi in zip(p_list, t_list, td_list)
    ]

    return {
        "source": model,
        "from_time": run_time,
        "cape_j_kg": round(cape_val, 1),
        "cin_j_kg": round(cin_val, 1),
        "profile": profile,
    }
