import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapRouteView = () => {
  useEffect(() => {
    const map = L.map('map').setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Fetch optimized route polyline from backend
    async function fetchRoutePolyline() {
      const resp = await fetch('/api/route/optimized-polyline');
      const data = await resp.json();
      const polyline = data.routePolyline || [];
      // Ensure polyline is valid and has more than 2 points
      if (!data.polylineValid || !polyline || polyline.length <= 2) {
        alert('No optimized route available or invalid polyline. Please try again.');
        return;
      }
      // Render the optimized route polyline
      const leafletRoute = polyline.map(p => [p.lat, p.lng]);
      L.polyline(leafletRoute, { color: 'blue', weight: 4 }).addTo(map);
      // Place vehicle marker at start
      let vehicleMarker = L.marker(leafletRoute[0], { icon: L.icon({ iconUrl: 'vehicle.png', iconSize: [32, 32] }) }).addTo(map);
      // Animate vehicle strictly along optimized polyline
      let idx = 0;
      const interval = 1000; // ms
      function moveVehicle() {
        if (idx < leafletRoute.length - 1) {
          vehicleMarker.setLatLng(leafletRoute[idx]);
          idx++;
        }
      }
      setInterval(moveVehicle, interval);
    }
    fetchRoutePolyline();
  }, []);

  return (
    <div id="map" style={{ height: '400px', width: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
  );
};

export default MapRouteView;
