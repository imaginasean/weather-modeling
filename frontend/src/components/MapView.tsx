import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { fetchPoints } from "../api/nws";
import { fetchStations } from "../api/nws";
import type { PointData } from "../App";
import type { StationsResponse } from "../api/nws";

/** Fix tile loading when map is in flex/grid: recalc size on mount and when container resizes. */
function MapSizeFix() {
  const map = useMap();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const container = map.getContainer();

    const invalidate = () => {
      map.invalidateSize();
    };

    // Initial recalc after layout has settled
    const t = setTimeout(invalidate, 100);

    const onResize = () => invalidate();
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(() => invalidate());
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [map]);

  return null;
}

// Fix default marker icon in Leaflet with Vite
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type MapViewProps = {
  pointData: PointData;
  setPointData: (d: PointData) => void;
  setSelectedStationId: (id: string | null) => void;
};

function MapClickHandler({
  setPointData,
  setSelectedStationId,
}: {
  setPointData: (d: PointData) => void;
  setSelectedStationId: (id: string | null) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setSelectedStationId(null);
      try {
        const data = await fetchPoints(lat, lng);
        const props = data.properties;
        setPointData({
          gridId: props.gridId,
          gridX: props.gridX,
          gridY: props.gridY,
          forecastUrl: props.forecast,
          forecastHourlyUrl: props.forecastHourly,
          observationStationsUrl: props.observationStations,
        });
      } catch {
        setPointData(null);
      }
    },
  });
  return null;
}

export default function MapView({
  pointData,
  setPointData,
  setSelectedStationId,
}: MapViewProps) {
  const [stations, setStations] = useState<StationsResponse["features"]>([]);

  useEffect(() => {
    if (!pointData?.observationStationsUrl) {
      setStations([]);
      return;
    }
    let cancelled = false;
    fetchStations(pointData.observationStationsUrl)
      .then((res) => {
        if (!cancelled && res.features) setStations(res.features);
      })
      .catch(() => {
        if (!cancelled) setStations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pointData?.observationStationsUrl]);

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      style={{ height: "100%", width: "100%", minHeight: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={4}
      />
      <MapSizeFix />
      <MapClickHandler
        setPointData={setPointData}
        setSelectedStationId={setSelectedStationId}
      />
      {stations.map((f) => {
        const coords = f.geometry?.coordinates;
        const id = f.properties?.stationIdentifier;
        const name = f.properties?.name ?? id;
        if (!coords || !id) return null;
        const [lon, lat] = coords;
        return (
          <Marker
            key={id}
            position={[lat, lon]}
            icon={icon}
            eventHandlers={{
              click: () => setSelectedStationId(id),
            }}
          >
            <Popup>
              <strong>{name}</strong> ({id})
              <br />
              <small>Click to see latest observation</small>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
