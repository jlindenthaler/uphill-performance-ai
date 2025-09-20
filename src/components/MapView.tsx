import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  gpsData?: any;
  className?: string;
}

export function MapView({ gpsData, className = "w-full h-64" }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !gpsData) return;

    // For now, show a placeholder map since we don't have real GPS data yet
    // This will be enhanced when we have proper FIT file parsing
    
    // Set a default access token (users will need to add their own)
    mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdC1tYXBib3giLCJhIjoiY2xvdmFibGUxMjMifQ.placeholder';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [0, 0], // Default center
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // If we have GPS data, process it here
    if (gpsData && gpsData.coordinates) {
      // This will be implemented when we have proper GPS data structure
      console.log('GPS data available:', gpsData);
    }

    return () => {
      map.current?.remove();
    };
  }, [gpsData]);

  if (!gpsData) {
    return (
      <div className={`${className} bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted`}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No GPS data available</p>
          <p className="text-sm text-muted-foreground">Upload an activity with GPS tracking to see the route</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden border`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}