import { useState } from "react";
import Dashboard from "./components/Dashboard";
import GlossaryPanel from "./components/GlossaryPanel";
import MapView from "./components/MapView";
import "./App.css";

export type PointData = {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastUrl: string;
  forecastHourlyUrl: string;
  observationStationsUrl: string;
} | null;

function App() {
  const [pointData, setPointData] = useState<PointData>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Weather Modeling</h1>
        <p className="tagline">Real NWS data · Phase 1</p>
        <button
          type="button"
          className="glossary-btn"
          onClick={() => setGlossaryOpen((o) => !o)}
        >
          Glossary
        </button>
      </header>
      <main className="app-main">
        <section className="map-section">
          <MapView
            pointData={pointData}
            setPointData={setPointData}
            setSelectedStationId={setSelectedStationId}
          />
        </section>
        <section className="dashboard-section">
          <Dashboard
            pointData={pointData}
            selectedStationId={selectedStationId}
          />
        </section>
      </main>
      {glossaryOpen && (
        <GlossaryPanel onClose={() => setGlossaryOpen(false)} />
      )}
    </div>
  );
}

export default App;
