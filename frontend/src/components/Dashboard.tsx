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
import { fetchForecast, fetchForecastHourly, fetchLatestObservation, fetchAlerts, observationTempToF } from "../api/nws";
import type { PointData } from "../App";
import type { ForecastResponse, ForecastHourlyResponse, ObservationResponse, AlertsResponse } from "../api/nws";
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
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>({});

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
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchForecast(pointData.forecastUrl),
      fetchForecastHourly(pointData.forecastHourlyUrl),
    ]).then(([f, h]) => {
      if (!cancelled) {
        setForecast(f);
        setHourly(h);
      }
    }).catch(() => {
      if (!cancelled) setForecast(null), setHourly(null);
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
    let cancelled = false;
    fetchAlerts("US").then((a) => {
      if (!cancelled && a.features) setAlerts(a.features);
    }).catch(() => {
      if (!cancelled) setAlerts([]);
    });
    return () => { cancelled = true; };
  }, []);

  const def = (term: string) => glossary[term.toLowerCase()];
  const periods = forecast?.properties?.periods ?? [];
  const hourlyPeriods = hourly?.properties?.periods ?? [];
  const chartData = hourlyPeriods.slice(0, 48).map((p) => ({
    time: new Date(p.startTime).toLocaleTimeString("en-US", { hour: "numeric" }),
    temp: p.temperature,
    pop: p.probabilityOfPrecipitation?.value ?? 0,
  }));

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">
        Forecast
        <InfoTooltip
          term="forecast"
          definition={def("forecast")?.definition ?? "Loading…"}
        />
      </h2>
      {!pointData ? (
        <p className="dashboard-placeholder">Click the map to select a location.</p>
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
        {alerts.length === 0 ? (
          <p className="alerts-none">No active alerts for US.</p>
        ) : (
          alerts.slice(0, 5).map((a, i) => (
            <div key={`${a.properties?.onset}-${i}`} className="alert-card">
              <strong>{a.properties?.event}</strong> — {a.properties?.severity}
              <p>{a.properties?.headline}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
