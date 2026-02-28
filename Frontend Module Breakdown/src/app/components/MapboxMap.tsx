import React, { useRef, useEffect } from "react";
import mapboxgl, { LngLatLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Vehicle {
  id: string;
  lat: number;
  lng: number;
  status?: string;
}

interface MapboxMapProps {
  vehicles: Vehicle[];
  centre?: { lat: number; lng: number };
  zoom?: number;
  tracks?: Record<string, { lat: number; lng: number }[]>;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({
  vehicles,
  centre = { lat: 37.7749, lng: -122.4194 },
  zoom = 12,
  tracks = {},
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map>();
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [centre.lng, centre.lat] as LngLatLike,
      zoom,
    });

    mapRef.current.on("load", () => {
      mapRef.current!.addSource("tracks", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
      mapRef.current!.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        paint: {
          "line-color": "#ff0000",
          "line-width": 3,
        },
      });
    });
  }, [centre, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    vehicles.forEach((v) => {
      seen.add(v.id);

      const el = document.createElement("div");
      el.className = "vehicle-marker";
      el.style.background =
        v.status === "moving"
          ? "#10b981"
          : v.status === "idle"
          ? "#f59e0b"
          : "#9ca3af";
      el.style.width = el.style.height = "16px";
      el.style.borderRadius = "50%";

      if (markersRef.current.has(v.id)) {
        markersRef.current.get(v.id)!.setLngLat([v.lng, v.lat]);
      } else {
        const m = new mapboxgl.Marker(el).setLngLat([v.lng, v.lat]).addTo(map);
        markersRef.current.set(v.id, m);
      }
    });

    for (const id of markersRef.current.keys()) {
      if (!seen.has(id)) {
        markersRef.current.get(id)!.remove();
        markersRef.current.delete(id);
      }
    }
  }, [vehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const features = Object.entries(tracks).map(([id, path]) => ({
      type: "Feature",
      properties: { id },
      geometry: {
        type: "LineString",
        coordinates: path.map((p) => [p.lng, p.lat]),
      },
    }));
    (map.getSource("tracks") as mapboxgl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  }, [tracks]);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%" }}
      className="mapbox-container"
    />
  );
};
