import { API_BASE } from "../config";

export async function fetchPoints(lat: number, lon: number): Promise<PointsResponse> {
  const r = await fetch(
    `${API_BASE}/points?lat=${lat}&lon=${lon}`
  );
  if (!r.ok) throw new Error("Failed to fetch points");
  return r.json();
}

export async function fetchForecast(url: string): Promise<ForecastResponse> {
  const r = await fetch(
    `${API_BASE}/forecast?url=${encodeURIComponent(url)}`
  );
  if (!r.ok) throw new Error("Failed to fetch forecast");
  return r.json();
}

export async function fetchForecastHourly(url: string): Promise<ForecastHourlyResponse> {
  const r = await fetch(
    `${API_BASE}/forecast/hourly?url=${encodeURIComponent(url)}`
  );
  if (!r.ok) throw new Error("Failed to fetch hourly forecast");
  return r.json();
}

export async function fetchStations(url: string): Promise<StationsResponse> {
  const r = await fetch(
    `${API_BASE}/stations/observations?url=${encodeURIComponent(url)}`
  );
  if (!r.ok) throw new Error("Failed to fetch stations");
  return r.json();
}

export async function fetchLatestObservation(stationId: string): Promise<ObservationResponse> {
  const r = await fetch(
    `${API_BASE}/stations/${stationId}/observations/latest`
  );
  if (!r.ok) throw new Error("Failed to fetch observation");
  return r.json();
}

/** Fetch active alerts for a state (e.g. "FL", "IL"). */
export async function fetchAlertsByArea(area: string): Promise<AlertsResponse> {
  const r = await fetch(
    `${API_BASE}/alerts/active?area=${encodeURIComponent(area)}`
  );
  if (!r.ok) throw new Error("Failed to fetch alerts");
  return r.json();
}

/** Fetch active alerts for a forecast zone (e.g. "FLZ048"). Use this for the selected map location. */
export async function fetchAlertsByZone(zoneId: string): Promise<AlertsResponse> {
  const r = await fetch(
    `${API_BASE}/alerts/active?zone=${encodeURIComponent(zoneId)}`
  );
  if (!r.ok) throw new Error("Failed to fetch alerts");
  return r.json();
}

/** Fetch raw gridpoint (model/NDFD) data for a grid cell. Phase 2 raw data source. */
export async function fetchGridpoint(
  gridId: string,
  gridX: number,
  gridY: number
): Promise<GridpointResponse> {
  const r = await fetch(
    `${API_BASE}/gridpoints/${encodeURIComponent(gridId)}/${gridX}/${gridY}`
  );
  if (!r.ok) throw new Error("Failed to fetch gridpoint");
  return r.json();
}

/** Convert Celsius to Fahrenheit (gridpoint values are in C). */
export function celsiusToF(c: number): number {
  return Math.round((c * (9 / 5) + 32) * 10) / 10;
}

// --- NWS response types (minimal) ---
export interface PointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    observationStations: string;
    /** URL e.g. https://api.weather.gov/zones/forecast/FLZ048 */
    forecastZone?: string;
    /** URL e.g. https://api.weather.gov/zones/county/FLC015 */
    county?: string;
  };
}

export interface ForecastResponse {
  properties: {
    periods: Array<{
      name: string;
      startTime: string;
      endTime: string;
      temperature: number;
      temperatureUnit: string;
      temperatureTrend: string | null;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
    }>;
  };
}

export interface ForecastHourlyResponse {
  properties: {
    periods: Array<{
      startTime: string;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
    }>;
  };
}

export interface StationsResponse {
  features: Array<{
    properties: { stationIdentifier: string; name: string };
    geometry: { coordinates: [number, number] };
  }>;
}

/**
 * NWS observation API returns temperatures in Celsius (unitCode "wmoUnit:degC").
 * Convert to Fahrenheit for display when needed.
 */
export function observationTempToF(
  value: number | null | undefined,
  unitCode: string | undefined
): number | null {
  if (value == null) return null;
  const isCelsius =
    unitCode != null &&
    (unitCode.includes("degC") || unitCode.toLowerCase().includes("celsius"));
  if (isCelsius) {
    return Math.round((value * (9 / 5) + 32) * 10) / 10;
  }
  return Math.round(value * 10) / 10;
}

export interface ObservationResponse {
  properties: {
    temperature: { value: number | null; unitCode: string };
    dewpoint?: { value: number | null; unitCode: string };
    windChill?: { value: number | null; unitCode: string };
    heatIndex?: { value: number | null; unitCode: string };
    windSpeed: { value: number | null; unitCode: string };
    windDirection: { value: number | null };
    textDescription: string;
    timestamp: string;
  };
}

export interface AlertsResponse {
  features: Array<{
    properties: {
      event: string;
      headline: string;
      severity: string;
      urgency: string;
      areasAffected: string[];
      onset: string;
      expires: string;
      description: string;
    };
  }>;
}

/** NWS gridpoint: raw model/NDFD values by valid time. Values in Celsius; wind in km/h. */
export interface GridpointResponse {
  properties: {
    temperature?: { values: Array<{ validTime: string; value: number | null }> };
    dewpoint?: { values: Array<{ validTime: string; value: number | null }> };
    windSpeed?: { values: Array<{ validTime: string; value: number | null }> };
    windDirection?: { values: Array<{ validTime: string; value: number | null }> };
    maxTemperature?: { values: Array<{ validTime: string; value: number | null }> };
    minTemperature?: { values: Array<{ validTime: string; value: number | null }> };
    [key: string]: unknown;
  };
}

/** Convert observation wind speed to m/s (NWS uses m/s or km/h per unitCode). */
export function observationWindSpeedMps(value: number | null | undefined, unitCode: string | undefined): number | null {
  if (value == null) return null;
  if (unitCode?.includes("km") || unitCode?.toLowerCase().includes("km_h")) return value / 3.6;
  return value; // assume m/s
}

const COMPASS_16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

/** Convert wind direction in degrees (0–360, meteorological “from”) to a 16-point compass label. */
export function windDirectionToCompass(degrees: number): string {
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS_16[index];
}

/** Parse NWS gridpoint validTime (e.g. "2024-01-15T18:00:00+00:00/PT1H") to start time string for comparison. */
export function gridpointValidTimeStart(validTime: string): string {
  const i = validTime.indexOf("/");
  return i >= 0 ? validTime.slice(0, i) : validTime;
}

/** Compass label to degrees (meteorological “from”). Handles "N", "NE", "NNE", etc. */
const COMPASS_TO_DEG: Record<string, number> = Object.fromEntries(
  COMPASS_16.map((label, i) => [label, i * 22.5])
);
export function compassToDegrees(compass: string): number | null {
  const upper = compass?.trim().toUpperCase();
  if (upper == null || upper === "") return null;
  return COMPASS_TO_DEG[upper] ?? null;
}
