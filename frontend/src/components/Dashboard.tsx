import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import InfoTooltip from "./InfoTooltip";
import LocationStatus from "./LocationStatus";
import Advection1D from "./Advection1D";
import Advection2D from "./Advection2D";
import Sounding from "./Sounding";
import { fetchForecast, fetchForecastHourly, fetchLatestObservation, fetchAlertsByZone, fetchGridpoint, observationTempToF, celsiusToF, observationWindSpeedMps, windDirectionToCompass } from "../api/nws";
import type { PointData } from "../App";
import type { ForecastResponse, ForecastHourlyResponse, ObservationResponse, AlertsResponse, GridpointResponse } from "../api/nws";
import { fetchGlossary } from "../api/glossary";
import type { GlossaryEntry } from "../api/glossary";
import "./Dashboard.css";

type DashboardProps = {
  pointData: PointData;
  selectedStationId: string | null;
};

export default function Dashboard({ pointData, selectedStationId }: DashboardProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [hourly, setHourly] = useState<ForecastHourlyResponse | null>(null);
  const [observation, setObservation] = useState<ObservationResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse["features"]>([]);
  const [gridpoint, setGridpoint] = useState<GridpointResponse | null>(null);
  const [showCorrected, setShowCorrected] = useState<"raw" | "corrected">("raw");
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>({});
  const [loading, setLoading] = useState({ forecast: false, gridpoint: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGlossary().then((res) => {
      const byTerm: Record<string, GlossaryEntry> = {};
      res.entries.forEach((e) => {
        byTerm[e.term.toLowerCase()] = e;
      });
      setGlossary(byTerm);
    });
  }, []);

  useEffect(() => {
    if (!pointData?.forecastUrl) {
      setForecast(null);
      setHourly(null);
      setLoading((l) => ({ ...l, forecast: false }));
      setError(null);
      return;
    }
    setError(null);
    setLoading((l) => ({ ...l, forecast: true }));
    let cancelled = false;
    Promise.all([
      fetchForecast(pointData.forecastUrl),
      fetchForecastHourly(pointData.forecastHourlyUrl),
    ]).then(([f, h]) => {
      if (!cancelled) {
        setForecast(f);
        setHourly(h);
        setLoading((l) => ({ ...l, forecast: false }));
      }
    }).catch(() => {
      if (!cancelled) {
        setForecast(null);
        setHourly(null);
        setLoading((l) => ({ ...l, forecast: false }));
        setError("Could not load forecast. Try again or pick another location.");
      }
    });
    return () => { cancelled = true; };
  }, [pointData?.forecastUrl, pointData?.forecastHourlyUrl]);

  useEffect(() => {
    if (!selectedStationId) {
      setObservation(null);
      return;
    }
    let cancelled = false;
    fetchLatestObservation(selectedStationId).then((o) => {
      if (!cancelled) setObservation(o);
    }).catch(() => {
      if (!cancelled) setObservation(null);
    });
    return () => { cancelled = true; };
  }, [selectedStationId]);

  useEffect(() => {
    if (!pointData?.forecastZoneId) {
      setAlerts([]);
      return;
    }
    let cancelled = false;
    fetchAlertsByZone(pointData.forecastZoneId).then((a) => {
      if (!cancelled && a.features) setAlerts(a.features);
    }).catch(() => {
      if (!cancelled) setAlerts([]);
    });
    return () => { cancelled = true; };
  }, [pointData?.forecastZoneId]);

  useEffect(() => {
    if (!pointData) {
      setGridpoint(null);
      setLoading((l) => ({ ...l, gridpoint: false }));
      return;
    }
    setLoading((l) => ({ ...l, gridpoint: true }));
    let cancelled = false;
    fetchGridpoint(pointData.gridId, pointData.gridX, pointData.gridY)
      .then((g) => {
        if (!cancelled) {
          setGridpoint(g);
          setLoading((l) => ({ ...l, gridpoint: false }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGridpoint(null);
          setLoading((l) => ({ ...l, gridpoint: false }));
        }
      });
    return () => { cancelled = true; };
  }, [pointData?.gridId, pointData?.gridX, pointData?.gridY]);

  const def = (term: string) => glossary[term.toLowerCase()];

  const windResult: { wind: { speedMps: number; directionDeg: number } | null; windSource: "observation" | "gridpoint" | null } = (() => {
    if (observation?.properties?.windSpeed?.value != null && observation?.properties?.windDirection?.value != null) {
      const speed = observationWindSpeedMps(observation.properties.windSpeed.value, observation.properties.windSpeed.unitCode);
      if (speed != null) return { wind: { speedMps: speed, directionDeg: observation.properties.windDirection.value }, windSource: "observation" as const };
    }
    const gp = gridpoint?.properties;
    const ws = gp?.windSpeed?.values?.[0]?.value;
    const wd = gp?.windDirection?.values?.[0]?.value;
    if (ws != null && wd != null) {
      const speedMps = typeof ws === "number" ? (ws > 20 ? ws / 3.6 : ws) : 2.5;
      return { wind: { speedMps, directionDeg: wd }, windSource: "gridpoint" as const };
    }
    return { wind: null, windSource: null };
  })();
  const wind = windResult.wind;
  const windSource = windResult.windSource;

  const periods = forecast?.properties?.periods ?? [];
  const hourlyPeriods = hourly?.properties?.periods ?? [];
  const chartData = hourlyPeriods.slice(0, 48).map((p) => ({
    time: new Date(p.startTime).toLocaleTimeString("en-US", { hour: "numeric" }),
    temp: p.temperature,
    pop: p.probabilityOfPrecipitation?.value ?? 0,
  }));

  return (
    <div className="dashboard">
      <LocationStatus
        pointData={pointData}
        selectedStationId={selectedStationId}
        wind={wind}
        windSource={windSource}
      />
      {error && (
        <div className="dashboard-error" role="alert">
          {error}
        </div>
      )}
      <h2 className="dashboard-title">
        Forecast
        <InfoTooltip
          term="forecast"
          definition={def("forecast")?.definition ?? "Loading…"}
        />
      </h2>
      {!pointData ? (
        <p className="dashboard-placeholder">Click the map to select a location.</p>
      ) : loading.forecast ? (
        <p className="dashboard-placeholder">Loading forecast…</p>
      ) : (
        <>
          <div className="forecast-periods">
            {periods.slice(0, 6).map((p) => (
              <div key={p.startTime} className="period-card">
                <div className="period-name">{p.name}</div>
                <div className="period-temp">
                  {p.temperature}°{p.temperatureUnit}
                  {p.temperatureTrend && <span className="trend"> {p.temperatureTrend}</span>}
                </div>
                <div className="period-wind">{p.windSpeed} {p.windDirection}</div>
                <div className="period-short">{p.shortForecast}</div>
                {p.probabilityOfPrecipitation?.value != null && (
                  <div className="period-pop">
                    <span className="term-with-tip">
                      Precip chance: {p.probabilityOfPrecipitation.value}%
                      <InfoTooltip
                        term="precipitation chance"
                        definition={def("precipitation chance")?.definition ?? "Loading…"}
                      />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="chart-block">
              <h3>Hourly temperature & precipitation chance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="pop" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip />
                  <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#0f3460" name="°F" dot={false} />
                  <Line yAxisId="pop" type="monotone" dataKey="pop" stroke="#e94560" name="Precip %" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {pointData && (
            <div className="gridpoint-block">
              {loading.gridpoint ? (
                <p className="dashboard-placeholder">Loading gridpoint data…</p>
              ) : gridpoint?.properties ? (
              <>
              <h3 className="dashboard-title">
                {showCorrected === "corrected" ? "Bias-corrected" : "Raw gridpoint (model)"}
                {showCorrected === "raw" ? (
                  <InfoTooltip term="NDFD" definition={def("NDFD")?.definition ?? "Loading…"} />
                ) : (
                  <InfoTooltip term="bias correction" definition={def("bias correction")?.definition ?? "Loading…"} />
                )}
              </h3>
              <div className="raw-corrected-toggle">
                <button
                  type="button"
                  className={showCorrected === "raw" ? "active" : ""}
                  onClick={() => setShowCorrected("raw")}
                >
                  Raw
                </button>
                <button
                  type="button"
                  className={showCorrected === "corrected" ? "active" : ""}
                  onClick={() => setShowCorrected("corrected")}
                >
                  Corrected
                </button>
              </div>
              <div className={`gridpoint-card ${showCorrected === "corrected" ? "corrected" : ""}`}>
                {showCorrected === "raw" ? (
                  <>
                    <p className="gridpoint-desc">Unadjusted model/NDFD values for this grid cell.</p>
                    {gridpoint.properties.temperature?.values?.[0]?.value != null && (
                      <div className="obs-row">Temperature: {celsiusToF(gridpoint.properties.temperature.values[0].value)}°F</div>
                    )}
                    {gridpoint.properties.dewpoint?.values?.[0]?.value != null && (
                      <div className="obs-row">Dew point: {celsiusToF(gridpoint.properties.dewpoint.values[0].value)}°F</div>
                    )}
                  </>
                ) : (
                  (() => {
                    const rawTemp = gridpoint.properties.temperature?.values?.[0]?.value;
                    const rawDew = gridpoint.properties.dewpoint?.values?.[0]?.value;
                    const obsTemp = observation?.properties?.temperature?.value != null
                      ? observationTempToF(observation.properties.temperature.value, observation.properties.temperature.unitCode)
                      : null;
                    const obsDew = observation?.properties?.dewpoint?.value != null
                      ? observationTempToF(observation.properties.dewpoint.value, observation.properties.dewpoint.unitCode)
                      : null;
                    const rawTempF = rawTemp != null ? celsiusToF(rawTemp) : null;
                    const rawDewF = rawDew != null ? celsiusToF(rawDew) : null;
                    const biasTemp = (obsTemp != null && rawTempF != null) ? obsTemp - rawTempF : null;
                    const biasDew = (obsDew != null && rawDewF != null) ? obsDew - rawDewF : null;
                    const correctedTemp = (rawTempF != null && biasTemp != null) ? Math.round((rawTempF + biasTemp) * 10) / 10 : rawTempF;
                    const correctedDew = (rawDewF != null && biasDew != null) ? Math.round((rawDewF + biasDew) * 10) / 10 : rawDewF;
                    if (!selectedStationId) {
                      return <p className="gridpoint-desc">Select a station on the map to see bias-corrected values (observation − raw).</p>;
                    }
                    return (
                      <>
                        <p className="gridpoint-desc">Corrected = raw + (observation − raw) using station {selectedStationId}.</p>
                        {correctedTemp != null && (
                          <div className="obs-row">Temperature: {correctedTemp}°F{biasTemp != null && <span className="bias-note"> (bias {biasTemp >= 0 ? "+" : ""}{biasTemp.toFixed(1)}°F)</span>}</div>
                        )}
                        {correctedDew != null && (
                          <div className="obs-row">Dew point: {correctedDew}°F{biasDew != null && <span className="bias-note"> (bias {biasDew >= 0 ? "+" : ""}{biasDew.toFixed(1)}°F)</span>}</div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
              </>
              ) : (
                <p className="dashboard-placeholder">Gridpoint data not available for this location.</p>
              )}
            </div>
          )}
        </>
      )}

      {selectedStationId && (
        <>
          <h2 className="dashboard-title">
            Observation — {selectedStationId}
            <InfoTooltip
              term="observation"
              definition={def("observation")?.definition ?? "Loading…"}
            />
          </h2>
          {observation?.properties ? (
            <div className="observation-card">
              <div className="obs-row">
                <span className="term-with-tip">
                  Temperature: {observationTempToF(observation.properties.temperature?.value, observation.properties.temperature?.unitCode) ?? "—"}°F
                </span>
              </div>
              {observation.properties.dewpoint?.value != null && (
                <div className="obs-row">
                  <span className="term-with-tip">
                    Dew point: {observationTempToF(observation.properties.dewpoint.value, observation.properties.dewpoint.unitCode)}°F
                    <InfoTooltip term="dew point" definition={def("dew point")?.definition ?? "Loading…"} />
                  </span>
                </div>
              )}
              {(observation.properties.windSpeed?.value != null || observation.properties.windDirection?.value != null) && (
                <div className="obs-row">
                  <span className="term-with-tip">
                    Wind:{" "}
                    {observation.properties.windSpeed?.value != null
                      ? `${observationWindSpeedMps(observation.properties.windSpeed.value, observation.properties.windSpeed.unitCode)?.toFixed(1) ?? "—"} m/s`
                      : ""}
                    {observation.properties.windSpeed?.value != null && observation.properties.windDirection?.value != null ? " from " : ""}
                    {observation.properties.windDirection?.value != null
                      ? `${windDirectionToCompass(observation.properties.windDirection.value)} (${Math.round(observation.properties.windDirection.value)}°)`
                      : ""}
                  </span>
                </div>
              )}
              {(observation.properties.windChill?.value != null || observation.properties.heatIndex?.value != null) && (
                <div className="obs-row">
                  {observation.properties.windChill?.value != null && (
                    <span className="term-with-tip">
                      Wind chill: {observationTempToF(observation.properties.windChill.value, observation.properties.windChill.unitCode)}°F
                      <InfoTooltip term="wind chill" definition={def("wind chill")?.definition ?? "Loading…"} />
                    </span>
                  )}
                  {observation.properties.heatIndex?.value != null && (
                    <span className="term-with-tip">
                      Heat index: {observationTempToF(observation.properties.heatIndex.value, observation.properties.heatIndex.unitCode)}°F
                      <InfoTooltip term="heat index" definition={def("heat index")?.definition ?? "Loading…"} />
                    </span>
                  )}
                </div>
              )}
              <div className="obs-row">{observation.properties.textDescription}</div>
              <div className="obs-time">{new Date(observation.properties.timestamp).toLocaleString()}</div>
            </div>
          ) : (
            <p className="dashboard-placeholder">Loading observation…</p>
          )}
        </>
      )}

      <h2 className="dashboard-title">
        Alerts
        <InfoTooltip
          term="watch vs warning"
          definition={def("watch vs warning")?.definition ?? "Loading…"}
        />
      </h2>
      <div className="alerts-list">
        {!pointData ? (
          <p className="alerts-none">Select a location on the map to see alerts for that area.</p>
        ) : alerts.length === 0 ? (
          <p className="alerts-none">No active alerts for this location.</p>
        ) : (
          alerts.slice(0, 5).map((a, i) => (
            <div key={`${a.properties?.onset}-${i}`} className="alert-card">
              <strong>{a.properties?.event}</strong> — {a.properties?.severity}
              <p>{a.properties?.headline}</p>
            </div>
          ))
        )}
      </div>

      <Advection1D glossary={glossary} wind={wind} />
      <Advection2D glossary={glossary} wind={wind} />
      <Sounding glossary={glossary} lat={pointData?.lat} lon={pointData?.lon} />
    </div>
  );
}
