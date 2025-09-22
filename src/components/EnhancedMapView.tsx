import React, { useEffect, useRef, useState } from 'react';
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
        center: [0, 0], // Default center
        zoom: 12
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // If we have GPS data, process it
      if (gpsData && gpsData.coordinates && Array.isArray(gpsData.coordinates)) {
        const coordinates = gpsData.coordinates;
        
        if (coordinates.length > 0) {
          // Create a GeoJSON line
          const geojson = {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: coordinates.map(coord => [coord.lng || coord.longitude, coord.lat || coord.latitude])
            }
          };

          map.current.on('load', () => {
            if (!map.current) return;

            // Add the route source
            map.current.addSource('route', {
              type: 'geojson',
              data: geojson
            });

            // Add the route layer
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

            // Add start marker
            const startCoord = coordinates[0];
            new mapboxgl.Marker({ color: '#22c55e' })
              .setLngLat([startCoord.lng || startCoord.longitude, startCoord.lat || startCoord.latitude])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Start</div>'))
              .addTo(map.current);

            // Add end marker
            const endCoord = coordinates[coordinates.length - 1];
            new mapboxgl.Marker({ color: '#ef4444' })
              .setLngLat([endCoord.lng || endCoord.longitude, endCoord.lat || endCoord.latitude])
              .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Finish</div>'))
              .addTo(map.current);

            // Fit map to route bounds
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => {
              bounds.extend([coord.lng || coord.longitude, coord.lat || coord.latitude]);
            });
            map.current.fitBounds(bounds, { padding: 50 });
          });
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

          new mapboxgl.Marker({ color: '#22c55e' })
            .setLngLat(mockRoute[0] as [number, number])
            .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Start</div>'))
            .addTo(map.current);

          new mapboxgl.Marker({ color: '#ef4444' })
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

  return (
    <div className={`${className} rounded-lg overflow-hidden border relative`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}