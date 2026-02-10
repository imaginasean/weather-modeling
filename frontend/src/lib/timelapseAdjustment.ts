/**
 * Adjusted and alternate forecast time-lapse series.
 * - Decaying bias: adjusted(t) = raw(t) + bias(0) * exp(-t/τ)
 * - Physics (persistence blend): value(t) = obs * exp(-t/τ) + raw(t) * (1 - exp(-t/τ))
 * - Uncertainty: band around adjusted (low/mid/high).
 */

import { gridpointValidTimeStart, compassToDegrees, celsiusToF } from "../api/nws";
import type { ForecastHourlyResponse, GridpointResponse, ObservationResponse } from "../api/nws";
import { observationTempToF, observationWindSpeedMps } from "../api/nws";
import { windDirectionToCompass } from "../api/nws";

export type RawNumericStep = {
  startTime: string;
  label: string;
  tempF: number;
  windSpeedMph: number;
  windDirDeg: number;
  pop: number;
};

function hourKey(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  return d.toISOString().slice(0, 13);
}

export function buildRawNumericSteps(
  hourly: ForecastHourlyResponse | null,
  gridpoint: GridpointResponse | null
): RawNumericStep[] {
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

    const tempF =
      gpT != null ? celsiusToF(gpT) : p.temperature;
    const windSpeedMph =
      gpWs != null && typeof gpWs === "number"
        ? gpWs * 0.621371
        : parseFloat(p.windSpeed) || 0;
    const windDirDeg =
      gpWd != null && typeof gpWd === "number"
        ? gpWd
        : compassToDegrees(p.windDirection) ?? 0;
    const pop = p.probabilityOfPrecipitation?.value ?? 0;

    return {
      startTime: p.startTime,
      label: new Date(p.startTime).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
      }),
      tempF: typeof tempF === "number" ? tempF : p.temperature,
      windSpeedMph,
      windDirDeg,
      pop,
    };
  });
}

export type BiasAtZero = {
  tempF: number;
  windSpeedMph: number;
  windDirDeg: number;
  pop: number;
};

export function getBiasAtZero(
  observation: ObservationResponse | null,
  raw0: RawNumericStep | null
): BiasAtZero | null {
  if (!observation?.properties || !raw0) return null;
  const obs = observation.properties;
  const obsTempF =
    obs.temperature?.value != null
      ? observationTempToF(obs.temperature.value, obs.temperature.unitCode)
      : null;
  const obsSpeedMps =
    obs.windSpeed?.value != null
      ? observationWindSpeedMps(obs.windSpeed.value, obs.windSpeed.unitCode)
      : null;
  const obsWindDir = obs.windDirection?.value ?? null;

  if (obsTempF == null && obsSpeedMps == null && obsWindDir == null)
    return null;

  const obsWindMph = obsSpeedMps != null ? obsSpeedMps * 2.23694 : raw0.windSpeedMph;
  const windDirDiff =
    obsWindDir != null
      ? ((obsWindDir - raw0.windDirDeg + 540) % 360) - 180
      : 0;

  return {
    tempF: obsTempF != null ? obsTempF - raw0.tempF : 0,
    windSpeedMph: obsSpeedMps != null ? obsWindMph - raw0.windSpeedMph : 0,
    windDirDeg: obsWindDir != null ? windDirDiff : 0,
    pop: 0,
  };
}

function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Decaying bias: adjusted(t) = raw(t) + bias * exp(-t/τ). τ in hours. */
export function buildAdjustedSteps(
  raw: RawNumericStep[],
  bias: BiasAtZero,
  tauHours: number
): RawNumericStep[] {
  return raw.map((r, t) => {
    const decay = Math.exp(-t / tauHours);
    const adjDir = wrapDeg(r.windDirDeg + bias.windDirDeg * decay);
    return {
      ...r,
      tempF: r.tempF + bias.tempF * decay,
      windSpeedMph: r.windSpeedMph + bias.windSpeedMph * decay,
      windDirDeg: adjDir,
      pop: Math.max(0, Math.min(100, r.pop + bias.pop * decay)),
    };
  });
}

/** Persistence blend: value(t) = obs * exp(-t/τ) + raw(t) * (1 - exp(-t/τ)). */
export function buildPhysicsSteps(
  raw: RawNumericStep[],
  observation: ObservationResponse | null,
  tauHours: number
): RawNumericStep[] | null {
  if (!observation?.properties || raw.length === 0) return null;
  const obs = observation.properties;
  const obsTempF =
    obs.temperature?.value != null
      ? observationTempToF(obs.temperature.value, obs.temperature.unitCode)
      : null;
  const obsSpeedMps =
    obs.windSpeed?.value != null
      ? observationWindSpeedMps(obs.windSpeed.value, obs.windSpeed.unitCode)
      : null;
  const obsWindDir = obs.windDirection?.value ?? null;

  if (obsTempF == null && obsSpeedMps == null && obsWindDir == null)
    return null;

  const obsWindMph = obsSpeedMps != null ? obsSpeedMps * 2.23694 : raw[0].windSpeedMph;

  return raw.map((r, t) => {
    const decay = Math.exp(-t / tauHours);
    const oneMinus = 1 - decay;

    const tempF =
      obsTempF != null ? obsTempF * decay + r.tempF * oneMinus : r.tempF;
    const windSpeedMph =
      obsSpeedMps != null
        ? obsWindMph * decay + r.windSpeedMph * oneMinus
        : r.windSpeedMph;

    let windDirDeg = r.windDirDeg;
    if (obsWindDir != null) {
      const oRad = (obsWindDir * Math.PI) / 180;
      const rRad = (r.windDirDeg * Math.PI) / 180;
      const x = Math.cos(oRad) * decay + Math.cos(rRad) * oneMinus;
      const y = Math.sin(oRad) * decay + Math.sin(rRad) * oneMinus;
      windDirDeg = wrapDeg((Math.atan2(y, x) * 180) / Math.PI);
    }

    const pop = r.pop;

    return {
      ...r,
      tempF,
      windSpeedMph,
      windDirDeg,
      pop,
    };
  });
}

export type UncertaintyStep = {
  startTime: string;
  label: string;
  tempF: { low: number; mid: number; high: number };
  windSpeedMph: { low: number; mid: number; high: number };
  windDirDeg: { low: number; mid: number; high: number };
  pop: { low: number; mid: number; high: number };
};

const DELTA_TEMP = 2;
const DELTA_WIND_MPH = 3;
const DELTA_POP = 10;
const DELTA_DIR = 15;

export function buildUncertaintySteps(
  adjusted: RawNumericStep[],
  deltaTemp: number = DELTA_TEMP,
  deltaWind: number = DELTA_WIND_MPH,
  deltaPop: number = DELTA_POP,
  deltaDir: number = DELTA_DIR
): UncertaintyStep[] {
  return adjusted.map((a) => ({
    startTime: a.startTime,
    label: a.label,
    tempF: {
      low: a.tempF - deltaTemp,
      mid: a.tempF,
      high: a.tempF + deltaTemp,
    },
    windSpeedMph: {
      low: Math.max(0, a.windSpeedMph - deltaWind),
      mid: a.windSpeedMph,
      high: a.windSpeedMph + deltaWind,
    },
    windDirDeg: {
      low: wrapDeg(a.windDirDeg - deltaDir),
      mid: a.windDirDeg,
      high: wrapDeg(a.windDirDeg + deltaDir),
    },
    pop: {
      low: Math.max(0, a.pop - deltaPop),
      mid: a.pop,
      high: Math.min(100, a.pop + deltaPop),
    },
  }));
}

export function formatTemp(v: number): string {
  return `${Math.round(v * 10) / 10}°F`;
}

export function formatWind(v: number, deg: number): string {
  return `${Math.round(v)} mph ${windDirectionToCompass(deg)}`;
}
