import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ElevationChart } from './ElevationChart';

interface EnhancedMapViewProps {
  gpsData?: any;
  className?: string;
  activity?: any;
}

export function EnhancedMapView({ gpsData, className = "w-full h-64", activity }: EnhancedMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const routeMarkers = useRef<mapboxgl.Marker[]>([]);
  const { toast } = useToast();

  const fetchMapboxToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        console.error('Error fetching Mapbox token:', error);
        setError('Unable to load map configuration');
        return;
      }
      
      if (data?.token) {
        setMapboxToken(data.token);
      } else {
        setError('Map configuration not found');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Unable to connect to mapping service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || loading) return;

    // Initialize Mapbox
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [151.2211, -33.8797], // St Vincent's Hospital, Sydney - Where the UpHill journey began with my heart transplant
        zoom: 12
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // If we have GPS data, process it
      if (gpsData && gpsData.type === 'LineString' && gpsData.coordinates && Array.isArray(gpsData.coordinates)) {
        console.log('Processing GPS data:', gpsData);
        console.log('GPS data type:', gpsData.type);
        console.log('Coordinates array length:', gpsData.coordinates.length);
        console.log('Sample coordinates:', gpsData.coordinates.slice(0, 3));
        const coordinates = gpsData.coordinates; // Already in [lng, lat] format from fitParser
        
        if (coordinates.length > 0) {
          console.log('Route has', coordinates.length, 'points');
          console.log('Start point:', coordinates[0]);
          console.log('End point:', coordinates[coordinates.length - 1]);
          
          // Create a GeoJSON feature using the coordinates directly
          const geojson = {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: coordinates // Already in correct [lng, lat] format
            }
          };

          map.current.on('load', () => {
            if (!map.current) return;
            
            console.log('Map loaded, adding route source and layer');
            console.log('GeoJSON data:', geojson);

            // Add the route source
            map.current.addSource('route', {
              type: 'geojson',
              data: geojson
            });

            // Add the route layer - ORANGE color as requested
            map.current.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#f97316', // Orange color
                'line-width': 4
              }
            });

            // Add start marker - Default style
            const startCoord = coordinates[0];
            const startMarker = new mapboxgl.Marker()
              .setLngLat(startCoord as [number, number])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Start</div>'))
              .addTo(map.current);

            // Add finish marker - Default style
            const endCoord = coordinates[coordinates.length - 1];
            const finishMarker = new mapboxgl.Marker()
              .setLngLat(endCoord as [number, number])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Finish</div>'))
              .addTo(map.current);

            routeMarkers.current = [startMarker, finishMarker];

            // Add hover indicator marker (initially hidden)
            const hoverMarker = new mapboxgl.Marker({
              color: '#3b82f6',
              scale: 0.8
            });
            
            // Initialize with start coordinate to prevent undefined errors
            hoverMarker.setLngLat(startCoord as [number, number]);
            hoverMarker.addTo(map.current);
            hoverMarker.getElement().style.display = 'none';
            routeMarkers.current.push(hoverMarker);

            // Set map as ready after all markers are initialized
            setMapReady(true);

            // Fit map to route bounds
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => {
              bounds.extend(coord as [number, number]);
            });
            console.log('Fitting map to bounds:', bounds);
            map.current.fitBounds(bounds, { padding: 50 });
          });
        } else {
          console.warn('GPS data has no coordinates');
        }
      } else if (gpsData) {
        console.warn('GPS data exists but not in expected format:', {
          type: gpsData.type,
          hasCoordinates: !!gpsData.coordinates,
          isArray: Array.isArray(gpsData.coordinates),
          coordinatesLength: gpsData.coordinates?.length
        });
      } else if (activity) {
        // Mock GPS route for demonstration
        const mockRoute = [
          [-122.4194, 37.7749],
          [-122.4094, 37.7849],
          [-122.3994, 37.7949],
          [-122.3894, 37.8049]
        ];

        const geojson = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: mockRoute
          }
        };

        map.current.on('load', () => {
          if (!map.current) return;

          map.current.addSource('route', {
            type: 'geojson',
            data: geojson
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#22c55e',
              'line-width': 4
            }
          });

          new mapboxgl.Marker()
            .setLngLat(mockRoute[0] as [number, number])
            .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Start</div>'))
            .addTo(map.current);

          new mapboxgl.Marker()
            .setLngLat(mockRoute[mockRoute.length - 1] as [number, number])
            .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Finish</div>'))
            .addTo(map.current);

          const bounds = new mapboxgl.LngLatBounds();
          mockRoute.forEach(coord => bounds.extend(coord as [number, number]));
          map.current.fitBounds(bounds, { padding: 50 });
        });
      }

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Mapbox initialization error:', error);
      setError('Failed to initialize map');
      toast({
        title: "Map Error",
        description: "Failed to initialize the map. Please try refreshing.",
        variant: "destructive"
      });
    }
  }, [gpsData, mapboxToken, activity, loading, toast]);

  // Handle elevation chart hover
  const handleElevationHover = (index: number | null) => {
    setHoverIndex(index);
    
    // Only allow hover interactions when map is ready
    if (!mapReady || !map.current || !gpsData?.coordinates || !Array.isArray(gpsData.coordinates)) {
      return;
    }
    
    // Ensure markers are initialized and hover marker exists
    if (!routeMarkers.current || routeMarkers.current.length < 3) {
      return;
    }
    
    const hoverMarker = routeMarkers.current[2]; // Third marker is the hover indicator
    
    try {
      if (index !== null && index >= 0 && index < gpsData.coordinates.length && gpsData.coordinates[index]) {
        const coord = gpsData.coordinates[index];
        // Ensure coordinate is valid
        if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          hoverMarker.setLngLat(coord as [number, number]);
          hoverMarker.getElement().style.display = 'block';
        }
      } else {
        hoverMarker.getElement().style.display = 'none';
      }
    } catch (error) {
      console.error('Error in handleElevationHover:', error);
      // Hide marker on error to prevent visual artifacts
      if (hoverMarker?.getElement()) {
        hoverMarker.getElement().style.display = 'none';
      }
    }
  };

  if (loading) {
    return (
      <div className={`${className} bg-muted/20 rounded-lg flex items-center justify-center border`}>
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Map Unavailable
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchMapboxToken} className="w-full" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!gpsData && !activity) {
    return (
      <div className={`${className} bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted`}>
        <div className="text-center space-y-2">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No GPS data available</p>
          <p className="text-sm text-muted-foreground">Upload an activity with GPS tracking to see the route</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${className} rounded-lg overflow-hidden border relative`}>
        <div ref={mapContainer} className="w-full h-full" />
      </div>
      
      {/* Elevation Chart */}
      <ElevationChart 
        gpsData={gpsData} 
        activity={activity}
        onHover={handleElevationHover}
        hoverIndex={hoverIndex}
      />
    </div>
  );
}