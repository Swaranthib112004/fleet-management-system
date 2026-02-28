// stubbed-out component that returns null; Google Maps removed
import React from "react";

export const MapView = () => {
  console.warn("MapView component is deprecated and should not be used.");
  return null;
}; }
  };

  const addPolyline = () => {
    if (!mapRef.current || !window.google) return;

    if (polyline.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (polylineRef.current) {
      polylineRef.current.setPath(polyline);
    } else {
      polylineRef.current = new window.google.maps.Polyline({
        path: polyline,
        geodesic: true,
        strokeColor: "#2563eb",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapRef.current,
      });
    }
  };

  // Update markers when they change
  useEffect(() => {
    if (mapReady) {
      addMarkers();
    }
  }, [markers, mapReady]);

  // Update polyline when it changes
  useEffect(() => {
    if (mapReady) {
      addPolyline();
    }
  }, [polyline, mapReady]);

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setCenter(center);
    }
  }, [center]);

  return (
    <div className="w-full h-full relative bg-white overflow-hidden">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          backgroundColor: "#f0f0f0",
          position: "relative",
        }}
      >
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-4 text-center z-[6]">
            <p className="font-bold text-red-600">Map failed to load</p>
            <p className="text-xs text-gray-700 mt-2">{loadError}</p>
            <p className="text-xs text-gray-500 mt-1">
              Check console for details and ensure your Google Maps API key is valid and allowed for this origin. Also make sure the correct environment variable name is used (VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_KEY).
            </p>
          </div>
        )}
      </div>

      {/* Status Badge - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 px-6 py-3 pointer-events-auto z-[5] flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-gray-700">
            {markers.filter((v) => v.status === "moving").length} Active
          </span>
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs font-bold text-gray-700">
            {markers.filter((v) => v.status === "idle").length} Idle
          </span>
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs font-bold text-gray-700">
            {markers.filter((v) => v.status === "offline").length} Offline
          </span>
        </div>
      </div>

      {/* Fleet Info Panel - Top Left */}
      {showInfoPanel && (
        <div className="absolute top-6 left-6 bg-white rounded-lg shadow-lg border border-gray-200 p-5 pointer-events-auto z-[5] w-80">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Fleet Tracking</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Vehicles:</span>
              <span className="font-bold text-gray-900">{markers.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-bold text-gray-900">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 mt-2">
              <div className="text-xs text-gray-500 font-medium">Online Status</div>
              <div className="mt-2 space-y-1">
                {markers.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium">{m.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      m.status === "moving" ? "bg-emerald-100 text-emerald-700" :
                      m.status === "idle" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {m.status || "offline"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 pointer-events-auto z-[4] bg-white/90 px-2 py-1 rounded">
        © Maps
      </div>
    </div>
  );
};
