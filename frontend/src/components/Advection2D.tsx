import { useEffect, useState } from "react";
import InfoTooltip from "./InfoTooltip";
import { fetchAdvection2D, type Advection2DResponse } from "../api/physics";
import type { GlossaryEntry } from "../api/glossary";
import type { WindSource } from "./Advection1D";
import "./Advection2D.css";

type Props = { glossary: Record<string, GlossaryEntry>; wind: WindSource };

function heatColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  const r = Math.round(15 + t * 240);
  const g = Math.round(100 + (1 - t) * 155);
  const b = Math.round(180 - t * 180);
  return `rgb(${r},${g},${b})`;
}

export default function Advection2D({ glossary, wind }: Props) {
  const [data, setData] = useState<Advection2DResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Meteorological direction is "from"; blob should move in "blow to" direction. Grid: x = east, y = down (so north = -y).
    const blowToDeg = wind ? ((wind.directionDeg + 180) % 360) : 90;
    const rad = (blowToDeg * Math.PI) / 180;
    const speed = wind ? wind.speedMps : 2.5;
    const cx = wind ? (speed * Math.sin(rad)) / 5 : 0.5;
    const cy = wind ? (-speed * Math.cos(rad)) / 5 : 0;
    fetchAdvection2D({ nx: 40, ny: 30, cx, cy, diffusion: 0.001, num_steps: 30, output_interval: 10 })
      .then(setData)
      .catch(() => setError("Could not load 2D demo."))
      .finally(() => setLoading(false));
  }, [wind?.speedMps, wind?.directionDeg]);

  const def = (term: string) => glossary[term.toLowerCase()];

  if (loading) return <p className="advection2d-placeholder">Loading 2D advection-diffusion…</p>;
  if (error) return <p className="advection2d-error">{error}</p>;
  if (!data) return null;

  const series = data.series[stepIndex];
  if (!series) return null;
  const { nx, ny } = data;
  const grid: number[][] = [];
  for (let j = 0; j < ny; j++) grid.push(series.u.slice(j * nx, (j + 1) * nx));
  const maxVal = Math.max(...series.u, 1e-6);

  return (
    <div className="advection2d-block">
      <h3 className="advection2d-title">
        2D advection–diffusion demo
        <InfoTooltip term="advection" definition={def("advection")?.definition ?? "Loading…"} />
        <InfoTooltip term="diffusion" definition={def("diffusion")?.definition ?? "Loading…"} />
      </h3>
      <p className="advection2d-desc">
        Blob carried by flow (c_x={data.cx.toFixed(2)}, c_y={data.cy.toFixed(2)}), diffusion D={data.diffusion}
        {wind ? (
          <> — <strong>real wind</strong> from above. “Demo” = simplified simulation.</> 
        ) : (
          <> — select location & station above for real wind.</>
        )} Step: {series.step}.
      </p>
      <div className="advection2d-step">
        <label>Time step:</label>
        <input
          type="range"
          min={0}
          max={data.series.length - 1}
          value={stepIndex}
          onChange={(e) => setStepIndex(Number(e.target.value))}
        />
        <span>{series.step}</span>
      </div>
      <div
        className="advection2d-heatmap"
        style={{
          gridTemplateColumns: `repeat(${nx}, 1fr)`,
          gridTemplateRows: `repeat(${ny}, 1fr)`,
        }}
      >
        {grid.flat().map((v, i) => (
          <div
            key={i}
            className="advection2d-cell"
            style={{ backgroundColor: heatColor(v / maxVal) }}
            title={`${v.toFixed(3)}`}
          />
        ))}
      </div>
    </div>
  );
}
