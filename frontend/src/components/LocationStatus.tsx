import type { PointData } from "../App";
import "./LocationStatus.css";

type WindSource = "observation" | "gridpoint" | null;

type Props = {
  pointData: PointData;
  selectedStationId: string | null;
  wind: { speedMps: number; directionDeg: number } | null;
  windSource: WindSource;
};

function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export default function LocationStatus({ pointData, selectedStationId, wind, windSource }: Props) {
  return (
    <div className="location-status" role="status" aria-live="polite">
      <div className="location-status-row">
        <span className="location-status-label">Location</span>
        <span className="location-status-value">
          {pointData?.lat != null && pointData?.lon != null
            ? formatCoord(pointData.lat, pointData.lon)
            : "— Click the map"}
        </span>
      </div>
      <div className="location-status-row">
        <span className="location-status-label">Station</span>
        <span className="location-status-value">
          {selectedStationId ? (
            <span className="station-badge">{selectedStationId}</span>
          ) : (
            "— Click a pin for observation"
          )}
        </span>
      </div>
      <div className="location-status-row">
        <span className="location-status-label">Wind</span>
        <span className="location-status-value">
          {wind ? (
            <span className={`wind-badge wind-${windSource ?? "gridpoint"}`}>
              {wind.speedMps.toFixed(1)} m/s {windSource === "observation" ? "(observation)" : "(gridpoint)"}
            </span>
          ) : (
            <span className="wind-badge wind-demo">Demo — select location & station</span>
          )}
        </span>
      </div>
      <p className="location-status-note">
        {wind
          ? "1D/2D advection below use this real wind. The “demo” label there means a simplified blob simulation, not fake data."
          : "Select a location and station so 1D/2D advection use real wind instead of a default speed."}
      </p>
    </div>
  );
}
