import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import InfoTooltip from "./InfoTooltip";
import { fetchSounding, type SoundingResponse } from "../api/physics";
import type { GlossaryEntry } from "../api/glossary";
import "./Sounding.css";

type Props = { glossary: Record<string, GlossaryEntry>; lat?: number | null; lon?: number | null };

export default function Sounding({ glossary, lat, lon }: Props) {
  const [data, setData] = useState<SoundingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    fetchSounding(lat, lon)
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
  }, [lat, lon]);

  const def = (term: string) => glossary[term.toLowerCase()];

  if (loading) return <p className="sounding-placeholder">Loading sounding…</p>;
  if (error) return <p className="sounding-error">{error}</p>;
  if (!data) return null;

  const chartData = data.profile.map((r) => ({
    pressure: r.p_hpa,
    T_C: r.T_C,
    Td_C: r.Td_C,
  }));

  return (
    <div className="sounding-block">
      <h3 className="sounding-title">
        Sounding {data.source === "uwyo" ? "(real)" : "(demo)"}
        <InfoTooltip term="sounding" definition={def("sounding")?.definition ?? "Loading…"} />
        <InfoTooltip term="skew-T" definition={def("skew-T")?.definition ?? "Loading…"} />
      </h3>
      <p className="sounding-desc">
        {data.source === "uwyo" && data.station_id
          ? `Vertical profile from nearest upper-air station (${data.station_id}, ${data.from_time ?? ""}Z). `
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
            <Tooltip />
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
