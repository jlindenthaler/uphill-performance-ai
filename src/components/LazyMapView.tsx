import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LazyMapViewProps {
  gpsData?: any;
  activity?: any;
  className?: string;
}

export function LazyMapView({ gpsData, activity, className = "w-full h-96" }: LazyMapViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  const loadMapComponent = useCallback(async () => {
    if (!MapComponent && !isLoaded) {
      setIsLoaded(true);
      try {
        const { EnhancedMapView } = await import('./EnhancedMapView');
        setMapComponent(() => EnhancedMapView);
      } catch (error) {
        console.error('Error loading map component:', error);
        setIsLoaded(false);
      }
    }
  }, [MapComponent, isLoaded]);

  // Auto-load if GPS data is available and small dataset
  React.useEffect(() => {
    if (gpsData?.coordinates && gpsData.coordinates.length < 1000) {
      loadMapComponent();
    }
  }, [gpsData, loadMapComponent]);

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

  if (!isLoaded || !MapComponent) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Map ready to load</p>
            <p className="text-sm text-muted-foreground">
              {gpsData?.coordinates ? `${gpsData.coordinates.length} GPS points available` : 'GPS data ready'}
            </p>
          </div>
          <Button onClick={loadMapComponent} variant="outline" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Load Map & Elevation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <MapComponent gpsData={gpsData} activity={activity} className={className} />;
}