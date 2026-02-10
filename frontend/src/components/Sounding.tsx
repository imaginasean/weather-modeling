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

type Props = { glossary: Record<string, GlossaryEntry>; lat?: number | null; lon?: number | null };

export default function Sounding({ glossary, lat, lon }: Props) {
  const [source, setSource] = useState<SoundingSource>("wyoming");
  const [data, setData] = useState<SoundingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const chartData = data.profile.map((r) => ({
    pressure: r.p_hpa,
    T_C: r.T_C,
    Td_C: r.Td_C,
  }));

  const soundingTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload?: { pressure?: number } }> }) => {
    if (!active || !payload?.length) return null;
    const pressure = payload[0]?.payload?.pressure;
    return (
      <div className="sounding-chart-tooltip">
        <div className="sounding-chart-tooltip-content">
          {payload.map((entry) => (
            <div key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
            </div>
          ))}
          {typeof pressure === "number" && (
            <div className="sounding-chart-tooltip-pressure">Pressure: {pressure} hPa</div>
          )}
        </div>
        <p className="sounding-chart-tooltip-layman">
          Temperature and dewpoint at this height in the atmosphere — lower pressure is higher up.
        </p>
      </div>
    );
  };

  const sourceLabel = data.source === "uwyo" ? "Observed (Wyoming)" : data.source === "rap" ? "Model (RAP)" : data.source === "hrrr" ? "Model (HRRR)" : "(demo)";

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
      <div className="sounding-chart">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="pressure" type="number" reversed tick={{ fontSize: 10 }} />
            <YAxis yAxisId="T" tick={{ fontSize: 10 }} />
            <Tooltip content={soundingTooltip} />
            <Legend />
            <Line yAxisId="T" type="monotone" dataKey="T_C" name="T (°C)" stroke="#0f3460" dot={true} isAnimationActive={false} />
            <Line yAxisId="T" type="monotone" dataKey="Td_C" name="Td (°C)" stroke="#e94560" dot={true} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="sounding-note">Pressure (hPa) vs temperature. A full skew-T uses a skewed temperature axis.</p>
      </div>
    </div>
  );
}
