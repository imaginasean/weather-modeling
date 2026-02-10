# Weather Modeling — Phased Plan

This document lays out completed phases and the roadmap. **Where you can visually see a time-lapse of wind/temperature/precipitation from this data is Phase 4** (see below).

---

## Completed

### Phase 1 — Ingest & basic display
- NWS API integration (points, forecast, hourly, stations, observations, alerts, gridpoints).
- Map: click to select location; station markers for observations.
- Forecast periods and hourly temperature/precip in the dashboard.

### Phase 2 — Raw vs bias-corrected
- Gridpoint (raw model/NDFD) data by valid time.
- Bias-corrected values (observation − raw) when a station is selected.
- Raw / Corrected toggle for temperature and dew point.

### Phase 3 — Physics demos & real data
- 1D and 2D advection–diffusion demos driven by **real wind** (observation or gridpoint).
- Sounding from Wyoming (or nearest upper-air station) with CAPE/CIN and T vs pressure.
- Observation panel: temperature, dew point, wind (speed + compass direction), wind chill/heat index.

---

## Next: Phase 4 — Forecast time-lapse visualization

**This is the phase where you get a visual time-lapse of wind, temperature, and precipitation from the data you already fetch.**

- **Data source:** Existing NWS data — hourly forecast and/or gridpoint time series (temperature, wind speed, wind direction, precipitation, etc.) by valid time.
- **Deliverable:** A time-lapse view that steps through forecast valid times and shows:
  - **Temperature** (e.g. color on the map at the selected point, or a simple panel that updates with time).
  - **Wind** (direction and speed — e.g. arrow or barb that changes over time).
  - **Precipitation** (hourly precip or probability, advancing with time).

Possible implementations (pick one or combine):

1. **Single-point time-lapse panel**  
   One chosen location; a playable timeline that scrubs through valid times and updates displayed temp, wind (direction/speed), and precip. No map needed — reuse existing hourly/gridpoint series.

2. **Map-based time-lapse**  
   Same timeline, but show the selected point’s values on the map (e.g. marker with temp + wind arrow + precip), or color the clicked point by temp, with a play/pause control.

3. **Mini “strip” or carousel**  
   Cards or strips per valid time (e.g. next 24–48 h) showing time, temp, wind, precip; user can click or auto-advance like a time-lapse.

Outcome: **You can press play (or scrub) and watch wind, temperature, and precipitation evolve over the forecast period using this app’s data.**

---

## Later phases (beyond time-lapse)

### Phase 5 — NWP-style modeling (optional)
- Simple 2D or 3D numerical model (e.g. shallow-water, or advection over a small domain).
- Use NWS/gridpoint data as boundary conditions or initial state.
- Compare model output to observations.

### Phase 6 — Polish & scale
- Testing (unit tests for physics, API, wind conversion).
- Better error and loading states.
- Documentation and deployment.

---

## Summary: where is the time-lapse?

| Goal | Phase |
|------|--------|
| **Visual time-lapse of wind / temperature / precipitation forecast from this data** | **Phase 4** (next) |

Phase 4 is scoped so the time-lapse uses **existing** NWS forecast and gridpoint data (no new backend data sources required). Implementation is mainly frontend: a time axis, play/scrub controls, and binding the already-fetched hourly/gridpoint series to that timeline.
