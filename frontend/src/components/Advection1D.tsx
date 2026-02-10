import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import InfoTooltip from "./InfoTooltip";
import { fetchAdvection1D, type Advection1DResponse } from "../api/physics";
import { fetchGlossary } from "../api/glossary";
import type { GlossaryEntry } from "../api/glossary";
import "./Advection1D.css";

export type WindSource = { speedMps: number; directionDeg: number } | null;

type Props = { glossary: Record<string, GlossaryEntry>; wind: WindSource };

export default function Advection1D({ glossary, wind }: Props) {
  const [data, setData] = useState<Advection1DResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const c = wind ? Math.min(2, Math.max(0.1, wind.speedMps / 5)) : 1;
    fetchAdvection1D({ nx: 80, c, num_steps: 40, output_interval: 10 })
      .then(setData)
      .catch(() => setError("Could not load advection demo."))
      .finally(() => setLoading(false));
  }, [wind?.speedMps]);

  const def = (term: string) => glossary[term.toLowerCase()];

  if (loading) return <p className="advection-placeholder">Loading 1D advection demo…</p>;
  if (error) return <p className="advection-error">{error}</p>;
  if (!data) return null;

  // Build chart data: one row per x index with columns step_0, step_10, ...
  const chartData = data.x.map((x, i) => {
    const row: Record<string, number | string> = { x };
    data.series.forEach((s) => {
      row[`step_${s.step}`] = s.u[i];
    });
    return row;
  });

  const colors = ["#0f3460", "#e94560", "#533483", "#0a7c42", "#b8860b"];

  return (
    <div className="advection1d-block">
      <h3 className="advection1d-title">
        1D advection demo
        <InfoTooltip term="advection" definition={def("advection")?.definition ?? "Loading…"} />
      </h3>
      <p className="advection1d-desc">
        u_t + c u_x = 0: pulse carried right at c = {data.c.toFixed(2)}
        {wind ? (
          <> — <strong>real wind</strong> from above ({wind.speedMps.toFixed(1)} m/s). “Demo” = simplified blob, not fake data.</>
        ) : (
          <> — select location & station above for real wind.</>
        )}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 1.1]} />
          <Tooltip />
          <Legend />
          {data.series.map((s, idx) => (
            <Line
              key={s.step}
              type="monotone"
              dataKey={`step_${s.step}`}
              name={`t = ${s.step} steps`}
              stroke={colors[idx % colors.length]}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
