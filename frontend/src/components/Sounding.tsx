import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import InfoTooltip from "./InfoTooltip";
import { fetchSounding, type SoundingResponse, type SoundingSource } from "../api/physics";
import type { GlossaryEntry } from "../api/glossary";
import "./Sounding.css";

const SOUNDING_SOURCES: { value: SoundingSource; label: string }[] = [
  { value: "wyoming", label: "Observed (Wyoming)" },
  { value: "rap", label: "Model (RAP)" },
  { value: "hrrr", label: "Model (HRRR)" },
];

const HPA_TO_INHG = 0.029529983071445;

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

type Props = { glossary: Record<string, GlossaryEntry>; lat?: number | null; lon?: number | null };

export default function Sounding({ glossary, lat, lon }: Props) {
  const [source, setSource] = useState<SoundingSource>("wyoming");
  const [data, setData] = useState<SoundingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [pressureUnit, setPressureUnit] = useState<"hPa" | "inHg">("hPa");

  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    fetchSounding(lat, lon, { source })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load sounding.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, source]);

  const def = (term: string) => glossary[term.toLowerCase()];

  if (loading) return <p className="sounding-placeholder">Loading sounding…</p>;
  if (error) return <p className="sounding-error">{error}</p>;
  if (!data) return null;

  const pressureLabel = pressureUnit === "inHg" ? "inHg" : "hPa";
  const pressureDisplay = (p: number) => (pressureUnit === "inHg" ? p * HPA_TO_INHG : p);
  const tempDisplay = (c: number) => (tempUnit === "F" ? cToF(c) : c);
  const tempSuffix = tempUnit === "F" ? "°F" : "°C";

  const chartData = data.profile.map((r) => ({
    pressure: pressureDisplay(r.p_hpa),
    p_hpa: r.p_hpa,
    T_display: tempDisplay(r.T_C),
    Td_display: tempDisplay(r.Td_C),
    T_C: r.T_C,
    Td_C: r.Td_C,
  }));

  const soundingTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload?: { p_hpa?: number; pressure?: number } }> }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    const p = row?.p_hpa ?? row?.pressure;
    const pressureVal = typeof p === "number" ? (pressureUnit === "inHg" ? p * HPA_TO_INHG : p) : null;
    return (
      <div className="sounding-chart-tooltip">
        <div className="sounding-chart-tooltip-content">
          {payload.map((entry) => (
            <div key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
            </div>
          ))}
          {typeof pressureVal === "number" && (
            <div className="sounding-chart-tooltip-pressure">
              Pressure: {pressureVal.toFixed(pressureUnit === "inHg" ? 2 : 0)} {pressureLabel}
            </div>
          )}
        </div>
        <p className="sounding-chart-tooltip-layman">
          Temperature and dewpoint at this height in the atmosphere — lower pressure is higher up.
        </p>
      </div>
    );
  };

  const sourceLabel = data.source === "uwyo" ? "Observed (Wyoming)" : data.source === "rap" ? "Model (RAP)" : data.source === "hrrr" ? "Model (HRRR)" : "(demo)";

  // Derive simple insights from T and Td (profile is surface-first, pressure descending)
  const profile = data.profile;
  let freezingLevelHpa: number | null = null;
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (a.T_C >= 0 && b.T_C < 0) {
      const frac = a.T_C / (a.T_C - b.T_C);
      freezingLevelHpa = a.p_hpa + frac * (b.p_hpa - a.p_hpa);
      break;
    }
  }
  if (freezingLevelHpa == null && profile.length > 0 && profile[profile.length - 1].T_C >= 0) {
    const last = profile[profile.length - 1];
    if (last.T_C <= 5) freezingLevelHpa = last.p_hpa;
  }

  let inversionHpa: number | null = null;
  for (let i = 0; i < profile.length - 1; i++) {
    if (profile[i + 1].T_C > profile[i].T_C && profile[i].p_hpa >= 400 && profile[i].p_hpa <= 950) {
      inversionHpa = profile[i].p_hpa;
      break;
    }
  }

  const dryLayerSpreads: { top: number; bottom: number; avgSpread: number }[] = [];
  let runStart: number | null = null;
  let runSum = 0;
  let runCount = 0;
  for (let i = 0; i < profile.length; i++) {
    const spread = profile[i].T_C - profile[i].Td_C;
    if (spread >= 8) {
      if (runStart == null) runStart = profile[i].p_hpa;
      runSum += spread;
      runCount += 1;
    } else {
      if (runStart != null && runCount >= 2) {
        dryLayerSpreads.push({ top: runStart, bottom: profile[i - 1].p_hpa, avgSpread: runSum / runCount });
      }
      runStart = null;
      runSum = 0;
      runCount = 0;
    }
  }
  if (runStart != null && runCount >= 2) {
    dryLayerSpreads.push({ top: runStart, bottom: profile[profile.length - 1].p_hpa, avgSpread: runSum / runCount });
  }

  const pressureFmt = (p: number) => (pressureUnit === "inHg" ? `${(p * HPA_TO_INHG).toFixed(2)} inHg` : `~${Math.round(p)} hPa`);

  return (
    <div className="sounding-block">
      <div className="sounding-header">
        <h3 className="sounding-title">
          Sounding — {sourceLabel}
          <InfoTooltip term="sounding" definition={def("sounding")?.definition ?? "Loading…"} />
          <InfoTooltip term="skew-T" definition={def("skew-T")?.definition ?? "Loading…"} />
        </h3>
        <div className="sounding-tabs" role="tablist" aria-label="Sounding source">
          {SOUNDING_SOURCES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={source === value}
              className={`sounding-tab ${source === value ? "active" : ""}`}
              onClick={() => setSource(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="sounding-desc">
        {data.source === "uwyo" && data.station_id
          ? `Vertical profile from nearest upper-air station ${data.station_id}${data.station_lat != null && data.station_lon != null ? ` (${data.station_lat.toFixed(1)}°N, ${Math.abs(data.station_lon).toFixed(1)}°W), ${data.from_time ?? ""}Z` : `, ${data.from_time ?? ""}Z`}. `
          : data.source === "rap" || data.source === "hrrr"
            ? `Model sounding (${data.source.toUpperCase()}, ${data.from_time ?? "latest"} UTC). `
            : "Select a location for real sounding from nearest station. "}
        Stability indices:
      </p>
      <div className="sounding-indices">
        <span className="term-with-tip">
          CAPE: {data.cape_j_kg} J/kg
          <InfoTooltip term="CAPE" definition={def("CAPE")?.definition ?? "Loading…"} />
        </span>
        <span className="term-with-tip">
          CIN: {data.cin_j_kg} J/kg
          <InfoTooltip term="CIN" definition={def("CIN")?.definition ?? "Loading…"} />
        </span>
      </div>
      <div className="sounding-units">
        <span className="sounding-units-label">Temperature:</span>
        <div className="sounding-unit-toggles" role="group" aria-label="Temperature unit">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              className={`sounding-unit-btn ${tempUnit === u ? "active" : ""}`}
              onClick={() => setTempUnit(u)}
            >
              °{u}
            </button>
          ))}
        </div>
        <span className="sounding-units-label">Pressure:</span>
        <div className="sounding-unit-toggles" role="group" aria-label="Pressure unit">
          {(["hPa", "inHg"] as const).map((u) => (
            <button
              key={u}
              type="button"
              className={`sounding-unit-btn ${pressureUnit === u ? "active" : ""}`}
              onClick={() => setPressureUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div className="sounding-chart">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="pressure"
              type="number"
              reversed
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => (pressureUnit === "inHg" ? (v as number).toFixed(2) : String(v))}
            />
            <YAxis yAxisId="T" tick={{ fontSize: 10 }} />
            <Tooltip content={soundingTooltip} />
            <Legend />
            <Line yAxisId="T" type="monotone" dataKey="T_display" name={`T (${tempSuffix})`} stroke="#0f3460" dot={true} isAnimationActive={false} />
            <Line yAxisId="T" type="monotone" dataKey="Td_display" name={`Td (${tempSuffix})`} stroke="#e94560" dot={true} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="sounding-note">Pressure ({pressureLabel}) vs temperature. A full skew-T uses a skewed temperature axis.</p>
      </div>
      <div className="sounding-insights">
        <h4 className="sounding-insights-title">What this profile suggests</h4>
        <ul className="sounding-insights-list">
          {freezingLevelHpa != null && (
            <li>
              <strong>Freezing level</strong> around {pressureFmt(freezingLevelHpa)} — rain can turn to snow near this height.
            </li>
          )}
          {inversionHpa != null && (
            <li>
              <strong>Temperature inversion</strong> near {pressureFmt(inversionHpa)} — air gets warmer with height here, so it’s very stable and can trap fog or pollution.
            </li>
          )}
          {dryLayerSpreads.length > 0 && (
            <li>
              <strong>Dry layer(s)</strong> from {dryLayerSpreads.map((d) => `${pressureFmt(d.top)} up to ${pressureFmt(d.bottom)}`).join("; ")} — air is dry there, which can limit cloud growth or evaporate precipitation.
            </li>
          )}
          {freezingLevelHpa == null && inversionHpa == null && dryLayerSpreads.length === 0 && (
            <li className="sounding-insights-muted">No strong freezing level, inversion, or dry layer in this profile.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
