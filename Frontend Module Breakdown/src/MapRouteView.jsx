import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapRouteView = () => {
  useEffect(() => {
    const map = L.map('map').setView([28.6139, 77.2090], 12); // Delhi

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Route coordinates: New Delhi to Noida City Centre
    const route = [
      [28.6139, 77.2090], // New Delhi
      [28.5355, 77.3910]  // Noida City Centre
    ];

    // Draw route
    L.polyline(route, { color: 'blue', weight: 4 }).addTo(map);

    // Markers
    L.marker(route[0]).addTo(map).bindPopup('New Delhi');
    L.marker(route[1]).addTo(map).bindPopup('Noida City Centre');
  }, []);

  return (
    <div id="map" style={{ height: '400px', width: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
  );
};

export default MapRouteView;
