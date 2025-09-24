import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
            new mapboxgl.Marker()
              .setLngLat(startCoord as [number, number])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Start</div>'))
              .addTo(map.current);

            // Add finish marker - Default style
            const endCoord = coordinates[coordinates.length - 1];
            new mapboxgl.Marker()
              .setLngLat(endCoord as [number, number])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Finish</div>'))
              .addTo(map.current);

            // Fit map to route bounds
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => {
              bounds.extend(coord as [number, number]);
            });
            map.current.fitBounds(bounds, { padding: 50 });
          });
        } else {
          console.warn('GPS data has no coordinates');
        }
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

  // Calculate elevation data from GPS coordinates
  const elevationData = useMemo(() => {
    if (!gpsData?.coordinates || !Array.isArray(gpsData.coordinates)) return [];
    
    let cumulativeDistance = 0;
    return gpsData.coordinates.map((coord: number[], index: number) => {
      if (index > 0) {
        const prevCoord = gpsData.coordinates[index - 1];
        // Simple distance calculation (Haversine would be more accurate)
        const deltaLat = coord[1] - prevCoord[1];
        const deltaLng = coord[0] - prevCoord[0];
        const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111000; // Rough conversion to meters
        cumulativeDistance += distance;
      }
      
      return {
        distance: cumulativeDistance / 1000, // Convert to km
        elevation: coord[2] || 0, // Altitude if available, otherwise 0
        index
      };
    });
  }, [gpsData]);

  return (
    <div className={`${className} rounded-lg overflow-hidden border relative flex flex-col`}>
      {/* Map */}
      <div ref={mapContainer} className="w-full flex-1 min-h-[300px]" />
      
      {/* Elevation Chart */}
      {elevationData.length > 0 && (
        <div className="w-full h-32 bg-muted/10 border-t p-2">
          <div className="text-xs font-medium mb-1 text-muted-foreground">Elevation Profile</div>
          <svg
            width="100%"
            height="100"
            viewBox="0 0 400 80"
            className="w-full h-full"
          >
            {/* Create elevation path */}
            {elevationData.length > 1 && (
              <path
                d={`M ${elevationData.map((point, index) => 
                  `${(index / (elevationData.length - 1)) * 400},${80 - ((point.elevation - Math.min(...elevationData.map(p => p.elevation))) / 
                  (Math.max(...elevationData.map(p => p.elevation)) - Math.min(...elevationData.map(p => p.elevation)))) * 60}`
                ).join(' L ')}`}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                fill="none"
              />
            )}
            
            {/* Fill area under curve */}
            {elevationData.length > 1 && (
              <path
                d={`M 0,80 L ${elevationData.map((point, index) => 
                  `${(index / (elevationData.length - 1)) * 400},${80 - ((point.elevation - Math.min(...elevationData.map(p => p.elevation))) / 
                  (Math.max(...elevationData.map(p => p.elevation)) - Math.min(...elevationData.map(p => p.elevation)))) * 60}`
                ).join(' L ')} L 400,80 Z`}
                fill="hsl(var(--primary))"
                fillOpacity="0.2"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}