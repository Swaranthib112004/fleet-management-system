import React, { useRef, useEffect, useCallback } from "react";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Vehicle {
  id: string;
  lat: number;
  lng: number;
  status?: string;
  registration?: string;
  driver?: string;
  speed?: number | string;
  heading?: number;
}

interface LeafletMapProps {
  vehicles: Vehicle[];
  centre?: { lat: number; lng: number };
  /** @deprecated darkMode no longer used – map always uses light OSM tiles */
  zoom?: number;
  tracks?: Record<string, { lat: number; lng: number }[]>;
  showTracks?: boolean;
  selectedVehicleId?: string | null;
  onVehicleClick?: (id: string) => void;
  darkMode?: boolean; // kept for API compat, ignored
  optimizedRoute?: { lat: number; lng: number }[];
  routePolyline?: { lat: number; lng: number }[];
}

/**
 * Creates an inverted-teardrop map pin marker SVG, like Google Maps.
 * The pin has a colored body, a white inner dot, and optional pulse ring for "moving" status.
 */
const createPinIcon = (status: string, isSelected: boolean) => {
  const colors: Record<string, { body: string; shadow: string }> = {
    moving: { body: "#2563eb", shadow: "rgba(37,99,235,0.35)" },
    idle: { body: "#f59e0b", shadow: "rgba(245,158,11,0.30)" },
    offline: { body: "#9ca3af", shadow: "rgba(156,163,175,0.25)" },
  };
  const c = colors[status] || colors.offline;

  // Pin dimensions
  const pinW = isSelected ? 34 : 28;
  const pinH = isSelected ? 46 : 38;
  const svgW = pinW + 20; // extra space for pulse
  const svgH = pinH + 16;
  const cx = svgW / 2;
  const bulbR = pinW / 2;
  const bulbCY = bulbR + 4; // top padding
  const tipY = bulbCY + pinH - bulbR;
  const innerR = isSelected ? 7 : 5;

  // Animated pulse ring (only for moving vehicles)
  const pulse = status === "moving"
    ? `<circle cx="${cx}" cy="${bulbCY}" r="${bulbR}" fill="none" stroke="${c.body}" stroke-width="2" opacity="0.5">
         <animate attributeName="r" from="${bulbR}" to="${bulbR + 14}" dur="2s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
       </circle>`
    : "";

  // Selection ring
  const selRing = isSelected
    ? `<circle cx="${cx}" cy="${bulbCY}" r="${bulbR + 2}" fill="none" stroke="white" stroke-width="3" opacity="0.9"/>`
    : "";

  // The pin path: circle top + teardrop tail pointing down
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
    ${pulse}
    ${selRing}
    <defs>
      <filter id="ds_${status}_${isSelected ? 1 : 0}" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${c.shadow}" flood-opacity="1"/>
      </filter>
    </defs>
    <g filter="url(#ds_${status}_${isSelected ? 1 : 0})">
      <path d="
        M ${cx} ${tipY}
        C ${cx - 2} ${tipY - 6}, ${cx - bulbR} ${bulbCY + bulbR * 0.4}, ${cx - bulbR} ${bulbCY}
        A ${bulbR} ${bulbR} 0 1 1 ${cx + bulbR} ${bulbCY}
        C ${cx + bulbR} ${bulbCY + bulbR * 0.4}, ${cx + 2} ${tipY - 6}, ${cx} ${tipY}
        Z
      " fill="${c.body}"/>
      <circle cx="${cx}" cy="${bulbCY}" r="${innerR}" fill="white" opacity="0.95"/>
    </g>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [svgW, svgH],
    iconAnchor: [cx, tipY], // anchor at the pin tip
    popupAnchor: [0, -tipY + 4], // popup above the pin
  });
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  vehicles,
  centre = { lat: 28.6139, lng: 77.2090 }, // Default to New Delhi
  zoom = 12,
  tracks = {},
  showTracks = true,
  selectedVehicleId = null,
  onVehicleClick,
  darkMode = true,
  optimizedRoute = [],
  routePolyline = [],
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineMapRef = useRef<Map<string, L.Polyline>>(new Map());
  const optimizedLineRef = useRef<L.Polyline | null>(null);
  const optimizedShadowRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);

  // Track running animations per-vehicle so we can cancel them
  const animFramesRef = useRef<Map<string, number>>(new Map());

  // Keep a ref of the initial centre so we only flyTo when it *intentionally* changes
  const lastCentreRef = useRef<{ lat: number; lng: number }>(centre);
  const lastZoomRef = useRef(zoom);
  const initialFitDone = useRef(false);

  // Smooth marker slide with cancellation of previous animation
  const animateMarker = useCallback((vehicleId: string, marker: L.Marker, to: LatLngExpression) => {
    // Cancel any in-progress animation for this vehicle
    const prev = animFramesRef.current.get(vehicleId);
    if (prev) cancelAnimationFrame(prev);

    const start = marker.getLatLng();
    const dest = L.latLng(to);

    // Skip animation if destination is essentially the same
    const dx = dest.lat - start.lat;
    const dy = dest.lng - start.lng;
    if (dx * dx + dy * dy < 1e-12) return;

    const duration = 2200; // slightly longer than update interval for smooth feel
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Smooth ease-out quad
      const ease = 1 - (1 - t) * (1 - t);
      const lat = start.lat + (dest.lat - start.lat) * ease;
      const lng = start.lng + (dest.lng - start.lng) * ease;
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        const id = requestAnimationFrame(step);
        animFramesRef.current.set(vehicleId, id);
      } else {
        animFramesRef.current.delete(vehicleId);
      }
    };
    const id = requestAnimationFrame(step);
    animFramesRef.current.set(vehicleId, id);
  }, []);

  // ─── Initialize map ───────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      // Disable inertia to reduce "springy" feel when user drags
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
      zoomAnimation: true,
      markerZoomAnimation: true,
      fadeAnimation: true,
    }).setView([centre.lat, centre.lng], zoom);

    // Standard OpenStreetMap tiles – clean, colourful, Google Maps-like
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      updateWhenZooming: false, // prevent tile flicker during zoom
      updateWhenIdle: true,
    }).addTo(map);

    // Zoom control in bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Attribution in bottom-left
    L.control.attribution({ position: "bottomleft", prefix: '&#x1F17F; Leaflet' })
      .addAttribution('© <a href="https://osm.org/copyright">OpenStreetMap</a>')
      .addTo(map);

    mapRef.current = map;

    return () => {
      // Cancel all pending animations
      for (const frameId of animFramesRef.current.values()) {
        cancelAnimationFrame(frameId);
      }
      animFramesRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Update vehicle markers ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    vehicles.forEach((v) => {
      // Skip vehicles with invalid coordinates
      if (v.lat == null || v.lng == null || !isFinite(v.lat) || !isFinite(v.lng)) return;
      seen.add(v.id);
      const isSelected = v.id === selectedVehicleId;
      const icon = createPinIcon(v.status || "offline", isSelected);

      if (markersRef.current.has(v.id)) {
        const existing = markersRef.current.get(v.id)!;
        existing.setIcon(icon);
        // Smoothly slide to new position instead of snapping
        animateMarker(v.id, existing, [v.lat, v.lng]);
      } else {
        const popupContent = `
          <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 200px; padding: 4px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:36px;height:36px;border-radius:10px;background:${v.status === 'moving' ? '#2563eb' : v.status === 'idle' ? '#f59e0b' : '#6b7280'};display:flex;align-items:center;justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
              </div>
              <div>
                <div style="font-weight:800;font-size:14px;color:#1e293b;">${v.registration || v.id}</div>
                <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${v.status || 'unknown'}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <div style="background:#f8fafc;padding:6px 8px;border-radius:8px;">
                <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Speed</div>
                <div style="font-size:14px;font-weight:800;color:#1e293b;">${v.speed || 0} km/h</div>
              </div>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:8px;">
                <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Driver</div>
                <div style="font-size:12px;font-weight:700;color:#1e293b;">${v.driver || '—'}</div>
              </div>
            </div>
            <div style="margin-top:8px;font-size:10px;color:#94a3b8;font-weight:600;">
              📍 ${(v.lat ?? 0).toFixed(5)}, ${(v.lng ?? 0).toFixed(5)}
            </div>
          </div>
        `;

        const m = L.marker([v.lat, v.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, {
            className: "fleet-popup",
            maxWidth: 280,
            closeButton: true,
          })
          .on("click", () => {
            if (onVehicleClick) onVehicleClick(v.id);
          });

        markersRef.current.set(v.id, m);
      }
    });

    // Remove disappeared vehicles
    for (const id of markersRef.current.keys()) {
      if (!seen.has(id)) {
        // Cancel animation for removed vehicle
        const frameId = animFramesRef.current.get(id);
        if (frameId) {
          cancelAnimationFrame(frameId);
          animFramesRef.current.delete(id);
        }
        markersRef.current.get(id)!.remove();
        markersRef.current.delete(id);
      }
    }

    // Auto-fit bounds on first load so all vehicles are visible
    if (!initialFitDone.current && vehicles.length > 0) {
      initialFitDone.current = true;
      const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng] as LatLngExpression));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: false });
    }
  }, [vehicles, selectedVehicleId, animateMarker, onVehicleClick]);

  // ─── Update track polylines ───────────────────────────────────────
  useEffect(() => {
    if (!showTracks) return;
    const map = mapRef.current;
    if (!map) return;

    Object.entries(tracks).forEach(([id, path]) => {
      if (path.length === 0) return;
      const latlngs = path.map((p) => [p.lat, p.lng] as LatLngExpression);

      if (polylineMapRef.current.has(id)) {
        polylineMapRef.current.get(id)!.setLatLngs(latlngs);
      } else {
        // Dashed indigo trail on light map
        const pl = L.polyline(latlngs, {
          color: "#6366f1",
          weight: 3,
          opacity: 0.5,
          dashArray: "8 6",
          lineCap: "round",
        }).addTo(map);
        polylineMapRef.current.set(id, pl);
      }
    });

    // Clean up removed tracks
    for (const id of Array.from(polylineMapRef.current.keys())) {
      if (!tracks[id]) {
        polylineMapRef.current.get(id)!.remove();
        polylineMapRef.current.delete(id);
      }
    }
  }, [tracks, showTracks]);

  // ─── Optimized route polyline with gradient effect ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous optimized route elements
    if (optimizedLineRef.current) {
      optimizedLineRef.current.remove();
      optimizedLineRef.current = null;
    }
    if (optimizedShadowRef.current) {
      optimizedShadowRef.current.remove();
      optimizedShadowRef.current = null;
    }
    waypointMarkersRef.current.forEach(m => m.remove());
    waypointMarkersRef.current = [];

    if (optimizedRoute.length > 1) {
      const waypointLatLngs = optimizedRoute.map((p) => [p.lat, p.lng] as LatLngExpression);
      const polylineCoords = routePolyline && routePolyline.length > 0
        ? routePolyline.map((p) => [p.lat, p.lng] as LatLngExpression)
        : waypointLatLngs;

      // Soft shadow line underneath for depth
      const shadowLine = L.polyline(polylineCoords, {
        color: "#93c5fd",
        weight: 14,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      optimizedShadowRef.current = shadowLine;

      // Bold blue route line (matches reference)
      const line = L.polyline(polylineCoords, {
        color: "#2563eb",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      optimizedLineRef.current = line;

      // Add waypoint markers
      optimizedRoute.forEach((p, i) => {
        const isFirst = i === 0;
        const isLast = i === optimizedRoute.length - 1;
        const markerColor = isFirst ? "#10b981" : isLast ? "#ef4444" : "#3b82f6";
        const label = isFirst ? "A" : isLast ? "B" : String(i);

        const waypointSvg = `<div style="width:28px;height:28px;border-radius:50%;background:${markerColor};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:11px;font-family:Inter,system-ui;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">${label}</div>`;

        const m = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            html: waypointSvg,
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map);
        waypointMarkersRef.current.push(m);
      });

      map.fitBounds(polylineCoords as any, { padding: [60, 60] });
    }
  }, [optimizedRoute, routePolyline]);

  // ─── Pan to centre ONLY when it intentionally changes ─────────────
  // We compare against the stored ref so that random trackedVehicles
  // updates in the parent don't cause continuous map flyTo vibration.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const dLat = Math.abs(centre.lat - lastCentreRef.current.lat);
    const dLng = Math.abs(centre.lng - lastCentreRef.current.lng);
    const zoomChanged = zoom !== lastZoomRef.current;

    // Only flyTo if the centre has moved significantly (> ~100m) or zoom changed
    if (dLat > 0.001 || dLng > 0.001 || zoomChanged) {
      lastCentreRef.current = { ...centre };
      lastZoomRef.current = zoom;
      map.flyTo([centre.lat, centre.lng], zoom, { duration: 1.2 });
    }
  }, [centre, zoom]);

  // ─── Fly to selected vehicle ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicleId) return;

    const v = vehicles.find((v) => v.id === selectedVehicleId);
    if (v) {
      map.flyTo([v.lat, v.lng], 15, { duration: 1 });
    }
  }, [selectedVehicleId]);

  return (
    <>
      <style>{`
        .fleet-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
          border: 1px solid #e2e8f0 !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .fleet-popup .leaflet-popup-content {
          margin: 12px 14px !important;
        }
        .fleet-popup .leaflet-popup-tip {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important;
        }
        .fleet-popup .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          width: 24px !important;
          height: 24px !important;
          font-size: 16px !important;
          color: #94a3b8 !important;
        }
        .leaflet-control-zoom a {
          border-radius: 12px !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
          background: rgba(255,255,255,0.95) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          color: #334155 !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          gap: 4px;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      />
    </>
  );
};
