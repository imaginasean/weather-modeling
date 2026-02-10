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

export async function fetchAlerts(area: string): Promise<AlertsResponse> {
  const r = await fetch(
    `${API_BASE}/alerts/active?area=${encodeURIComponent(area)}`
  );
  if (!r.ok) throw new Error("Failed to fetch alerts");
  return r.json();
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
