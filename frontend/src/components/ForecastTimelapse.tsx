import { useEffect, useRef, useState } from "react";
import { gridpointValidTimeStart, compassToDegrees, celsiusToF } from "../api/nws";
import type { ForecastHourlyResponse, GridpointResponse } from "../api/nws";
import "./ForecastTimelapse.css";

type Step = {
  startTime: string;
  label: string;
  temp: number;
  tempUnit: string;
  windSpeed: string;
  windDirection: string;
  windDirectionDeg: number | null;
  pop: number | null;
};

function hourKey(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  return d.toISOString().slice(0, 13);
}

function buildSteps(
  hourly: ForecastHourlyResponse | null,
  gridpoint: GridpointResponse | null
): Step[] {
  const periods = hourly?.properties?.periods ?? [];
  const gpTemp = gridpoint?.properties?.temperature?.values ?? [];
  const gpWindSpeed = gridpoint?.properties?.windSpeed?.values ?? [];
  const gpWindDir = gridpoint?.properties?.windDirection?.values ?? [];

  const byHour = (arr: Array<{ validTime: string; value: number | null }>) =>
    new Map(
      arr.map((v) => [hourKey(gridpointValidTimeStart(v.validTime)), v.value])
    );

  const tempByHour = byHour(gpTemp);
  const windSpeedByHour = byHour(gpWindSpeed);
  const windDirByHour = byHour(gpWindDir);

  return periods.slice(0, 48).map((p) => {
    const key = hourKey(p.startTime);
    const gpT = tempByHour.get(key);
    const gpWs = windSpeedByHour.get(key);
    const gpWd = windDirByHour.get(key);

    const temp =
      gpT != null ? celsiusToF(gpT) : p.temperature;
    const tempUnit = p.temperatureUnit === "F" ? "F" : "F";

    let windSpeed = p.windSpeed;
    if (gpWs != null && typeof gpWs === "number") {
      const mph = gpWs * 0.621371;
      windSpeed = `${Math.round(mph)} mph`;
    }

    const windDirectionDeg =
      gpWd != null && typeof gpWd === "number"
        ? gpWd
        : compassToDegrees(p.windDirection);

    return {
      startTime: p.startTime,
      label: new Date(p.startTime).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
      }),
      temp: typeof temp === "number" ? temp : p.temperature,
      tempUnit,
      windSpeed,
      windDirection: p.windDirection,
      windDirectionDeg,
      pop: p.probabilityOfPrecipitation?.value ?? null,
    };
  });
}

function WindArrow({ directionDeg }: { directionDeg: number | null }) {
  if (directionDeg == null) return null;
  const blowToDeg = (directionDeg + 180) % 360;
  const rotate = (blowToDeg + 270) % 360;
  return (
    <span
      className="timelapse-wind-arrow"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      →
    </span>
  );
}

type Props = {
  hourly: ForecastHourlyResponse | null;
  gridpoint: GridpointResponse | null;
  loading: boolean;
};

const PLAY_INTERVAL_MS = 800;

export default function ForecastTimelapse({ hourly, gridpoint, loading }: Props) {
  const steps = buildSteps(hourly, gridpoint);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const step = steps[safeIndex];

  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => (i + 1 >= steps.length ? 0 : i + 1));
    }, PLAY_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length]);

  if (loading || steps.length === 0) {
    return (
      <div className="timelapse-block">
        <h3 className="timelapse-title">Forecast time-lapse</h3>
        <p className="timelapse-placeholder">
          {loading ? "Loading…" : "Select a location on the map to see the time-lapse."}
        </p>
      </div>
    );
  }

  return (
    <div className="timelapse-block">
      <h3 className="timelapse-title">Forecast time-lapse</h3>
      <p className="timelapse-desc">
        Scrub or play to see temperature, wind, and precipitation chance over time.
      </p>

      <div className="timelapse-frame">
        <div className="timelapse-time">{step.label}</div>
        <div className="timelapse-temp">
          {step.temp}°{step.tempUnit}
        </div>
        <div className="timelapse-wind">
          <WindArrow directionDeg={step.windDirectionDeg} />
          <span>
            {step.windSpeed} {step.windDirection}
          </span>
        </div>
        {step.pop != null && (
          <div className="timelapse-pop">Precip chance: {step.pop}%</div>
        )}
      </div>

      <div className="timelapse-controls">
        <button
          type="button"
          className="timelapse-play"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, steps.length - 1)}
          value={safeIndex}
          onChange={(e) => {
            setStepIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="timelapse-slider"
          aria-label="Scrub time"
        />
        <span className="timelapse-step-label">
          Step {safeIndex + 1} of {steps.length}
        </span>
      </div>
    </div>
  );
}
