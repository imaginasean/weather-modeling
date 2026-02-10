import { useEffect, useRef, useState } from "react";
import {
  buildRawNumericSteps,
  getBiasAtZero,
  buildAdjustedSteps,
  buildPhysicsSteps,
  buildUncertaintySteps,
  formatTemp,
  formatWind,
  type RawNumericStep,
  type UncertaintyStep,
} from "../lib/timelapseAdjustment";
import type { ForecastHourlyResponse, GridpointResponse, ObservationResponse } from "../api/nws";
import "./DualForecastTimelapse.css";

const TAU_OPTIONS = [6, 12, 24] as const;
const PLAY_INTERVAL_MS = 800;

function WindArrow({ directionDeg }: { directionDeg: number }) {
  const blowToDeg = (directionDeg + 180) % 360;
  const rotate = (blowToDeg + 270) % 360;
  return (
    <span
      className="dual-timelapse-wind-arrow"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      →
    </span>
  );
}

function RawFrame({ step }: { step: RawNumericStep }) {
  return (
    <div className="dual-timelapse-frame-inner">
      <div className="dual-timelapse-time">{step.label}</div>
      <div className="dual-timelapse-temp">{formatTemp(step.tempF)}</div>
      <div className="dual-timelapse-wind">
        <WindArrow directionDeg={step.windDirDeg} />
        <span>{formatWind(step.windSpeedMph, step.windDirDeg)}</span>
      </div>
      <div className="dual-timelapse-pop">Precip: {Math.round(step.pop)}%</div>
    </div>
  );
}

function UncertaintyFrame({ step }: { step: UncertaintyStep }) {
  return (
    <div className="dual-timelapse-frame-inner">
      <div className="dual-timelapse-time">{step.label}</div>
      <div className="dual-timelapse-temp">
        {formatTemp(step.tempF.mid)} <span className="dual-timelapse-range">({formatTemp(step.tempF.low)}–{formatTemp(step.tempF.high)})</span>
      </div>
      <div className="dual-timelapse-wind">
        <WindArrow directionDeg={step.windDirDeg.mid} />
        <span>
          {formatWind(step.windSpeedMph.mid, step.windDirDeg.mid)}{" "}
          <span className="dual-timelapse-range">
            ({Math.round(step.windSpeedMph.low)}–{Math.round(step.windSpeedMph.high)} mph)
          </span>
        </span>
      </div>
      <div className="dual-timelapse-pop">
        Precip: {Math.round(step.pop.mid)}% ({Math.round(step.pop.low)}–{Math.round(step.pop.high)}%)
      </div>
    </div>
  );
}

type Props = {
  hourly: ForecastHourlyResponse | null;
  gridpoint: GridpointResponse | null;
  observation: ObservationResponse | null;
  loading: boolean;
};

type RightMode = "adjusted" | "uncertainty" | "physics";

export default function DualForecastTimelapse({
  hourly,
  gridpoint,
  observation,
  loading,
}: Props) {
  const rawSteps = buildRawNumericSteps(hourly, gridpoint);
  const raw0 = rawSteps[0] ?? null;
  const bias = getBiasAtZero(observation, raw0);

  const [tauHours, setTauHours] = useState<6 | 12 | 24>(12);
  const [rightMode, setRightMode] = useState<RightMode>("adjusted");
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adjustedSteps =
    bias != null
      ? buildAdjustedSteps(rawSteps, bias, tauHours)
      : rawSteps;
  const physicsSteps =
    observation && rawSteps.length > 0
      ? buildPhysicsSteps(rawSteps, observation, tauHours)
      : null;
  const uncertaintySteps = buildUncertaintySteps(adjustedSteps);

  const safeIndex = Math.min(stepIndex, Math.max(0, rawSteps.length - 1));
  const rawStep = rawSteps[safeIndex];
  const adjustedStep = adjustedSteps[safeIndex];
  const uncertaintyStep = uncertaintySteps[safeIndex];
  const physicsStep = physicsSteps?.[safeIndex];

  const hasObservation = bias != null;

  useEffect(() => {
    if (!isPlaying || rawSteps.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => (i + 1 >= rawSteps.length ? 0 : i + 1));
    }, PLAY_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, rawSteps.length]);

  if (loading || rawSteps.length === 0) {
    return (
      <div className="dual-timelapse-block">
        <h3 className="dual-timelapse-title">Raw vs adjusted time-lapse</h3>
        <p className="dual-timelapse-placeholder">
          {loading ? "Loading…" : "Select a location on the map."}
        </p>
      </div>
    );
  }

  const rightStep =
    rightMode === "adjusted"
      ? adjustedStep
      : rightMode === "uncertainty"
        ? uncertaintyStep
        : physicsStep ?? adjustedStep;

  return (
    <div className="dual-timelapse-block">
      <h3 className="dual-timelapse-title">Raw vs adjusted time-lapse</h3>
      <p className="dual-timelapse-desc">
        Left: raw NWS forecast. Right: adjusted (decaying bias) or alternate model. One slider scrubs both.
        {hasObservation
          ? " Bias uses current station observation."
          : " Select a station for adjusted/alternate."}
      </p>

      <div className="dual-timelapse-controls-top">
        <label className="dual-timelapse-label">
          Right panel:
          <select
            value={rightMode}
            onChange={(e) => setRightMode(e.target.value as RightMode)}
            className="dual-timelapse-select"
          >
            <option value="adjusted">Adjusted (decaying bias)</option>
            <option value="uncertainty">Uncertainty range</option>
            <option value="physics">Physics (persistence blend)</option>
          </select>
        </label>
        <label className="dual-timelapse-label">
          Decay τ (hours):
          <select
            value={tauHours}
            onChange={(e) => setTauHours(Number(e.target.value) as 6 | 12 | 24)}
            className="dual-timelapse-select"
          >
            {TAU_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}h</option>
            ))}
          </select>
        </label>
      </div>

      <div className="dual-timelapse-panels">
        <div className="dual-timelapse-panel dual-timelapse-panel-raw">
          <div className="dual-timelapse-panel-title">Raw NWS</div>
          {rawStep && <RawFrame step={rawStep} />}
        </div>
        <div className="dual-timelapse-panel dual-timelapse-panel-alt">
          <div className="dual-timelapse-panel-title">
            {rightMode === "adjusted"
              ? "Adjusted (decay)"
              : rightMode === "uncertainty"
                ? "Uncertainty range"
                : "Physics (persistence)"}
          </div>
          {rightMode === "uncertainty" && uncertaintyStep && (
            <UncertaintyFrame step={uncertaintyStep} />
          )}
          {rightMode !== "uncertainty" && rightStep && "tempF" in rightStep && (
            <RawFrame step={rightStep as RawNumericStep} />
          )}
        </div>
      </div>

      <div className="dual-timelapse-controls">
        <button
          type="button"
          className="dual-timelapse-play"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, rawSteps.length - 1)}
          value={safeIndex}
          onChange={(e) => {
            setStepIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="dual-timelapse-slider"
          aria-label="Scrub time"
        />
        <span className="dual-timelapse-step-label">
          Step {safeIndex + 1} of {rawSteps.length}
        </span>
      </div>
    </div>
  );
}
