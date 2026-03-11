import React, { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  status?: string;
  label?: string;
}

interface MapViewProps {
  markers: MarkerData[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (marker: MarkerData) => void;
  polyline?: { lat: number; lng: number }[];
}

// the old `Loader` class has been removed; use the functional helpers instead
setOptions({
});

export const MapView: React.FC<MapViewProps> = ({
  markers,
  center,
  zoom = 5,
  onMarkerClick,
  polyline = [],
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerMap = useRef<{ [id: string]: google.maps.Marker }>({});
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const VEHICLE_SPEED_KMH = 50;
  const VEHICLE_SPEED_MPS = VEHICLE_SPEED_KMH * 1000 / 3600; // meters per second

  // Helper to calculate distance between two lat/lng points (Haversine)
  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // meters
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // if no explicit center provided, compute a fallback from markers
  const computedCenter = React.useMemo(() => {
    if (center && (center.lat !== 0 || center.lng !== 0)) return center;
    if (markers && markers.length > 0) {
      const m = markers[0];
      return { lat: m.lat, lng: m.lng };
    }
    return { lat: 0, lng: 0 };
  }, [center, markers]);

  useEffect(() => {

    // Vite exposes env variables as import.meta.env
    // @ts-ignore
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
    if (!key) {
      const msg = "No Google Maps API key found; map will not render.";
      console.warn(msg);
      setError(msg);
      return;
    }

    importLibrary("maps")
      .then(() => {
        if (ref.current && !mapRef.current) {
          const mapOptions: google.maps.MapOptions = {
            center: computedCenter,
            zoom,
            mapTypeId: 'roadmap',
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
              { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
              { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
              { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#cccccc' }] },
              { featureType: 'administrative.land_parcel', elementType: 'geometry.stroke', stylers: [{ color: '#dcdcdc' }] },
              { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#86753d' }] },
              { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
              { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
              { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
              { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
              { featureType: 'poi.attraction', elementType: 'geometry.fill', stylers: [{ color: '#fac858' }] },
              { featureType: 'poi.business', elementType: 'geometry.fill', stylers: [{ color: '#b3e5fc' }] },
              { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#b7e7c4' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
              { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d4d4d4' }] },
              { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
              { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
              { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fbfbfb' }] },
              { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ffe082' }] },
              { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
              { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
              { featureType: 'transit.line', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
              { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4ed' }] },
              { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
            ],
            mapTypeControl: true,
            fullscreenControl: true,
            streetViewControl: true,
            zoomControl: true,
            scaleControl: true,
          };
          mapRef.current = new google.maps.Map(ref.current, mapOptions);
        }
      })
      .catch((err) => {
        const msg = `Google Maps importLibrary failed: ${err}`;
        console.error(msg);
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [computedCenter, zoom]);

  // update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // add or move existing
    markers.forEach((m) => {
      let mk = markerMap.current[m.id];
      const position = new google.maps.LatLng(m.lat, m.lng);
      if (mk) {
        mk.setPosition(position);
      } else {
        mk = new google.maps.Marker({
          position,
          map: mapRef.current!,
          title: m.label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: m.status === "moving" ? "#22c55e" : m.status === "idle" ? "#f59e0b" : "#94a3b8",
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "white",
          },
        });
        if (onMarkerClick) {
          mk.addListener("click", () => onMarkerClick(m));
        }
        markerMap.current[m.id] = mk;
      }
    });

    // remove disappeared markers
    Object.keys(markerMap.current).forEach((id) => {
      if (!markers.find((m) => m.id === id)) {
        markerMap.current[id].setMap(null);
        delete markerMap.current[id];
      }
    });
  }, [markers]);

  // recenter if center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setCenter(center);
    }
  }, [center]);

  // draw polyline if provided
  useEffect(() => {
    if (!mapRef.current) return;
    if (polyline && polyline.length > 0) {
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          map: mapRef.current,
          path: polyline.map((p) => ({ lat: p.lat, lng: p.lng })),
          strokeColor: "#2563eb",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        });
      } else {
        polylineRef.current.setPath(polyline.map((p) => ({ lat: p.lat, lng: p.lng })));
      }
    } else {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    }
  }, [polyline]);

  // In vehicle animation logic, update interval based on segment distance and speed
  // Example:
  // let idx = 0;
  // function moveVehicle() {
  //   if (idx < polyline.length - 1) {
  //     const curr = polyline[idx];
  //     const next = polyline[idx+1];
  //     const dist = haversineDistance(curr.lat, curr.lng, next.lat, next.lng);
  //     const interval = dist / VEHICLE_SPEED_MPS * 1000; // ms
  //     vehicleMarker.setLatLng([next.lat, next.lng]);
  //     idx++;
  //     setTimeout(moveVehicle, interval);
  //   }
  // }
  // moveVehicle();

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        Loading map...
      </div>
    );
  }

  // show placeholder when there are no markers at all
  if (!loading && markers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        No vehicle locations available
      </div>
    );
  }

  return <div ref={ref} className="w-full h-full" />;
};
