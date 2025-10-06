import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';

export function PowerProfileBackfill() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const { backfillPowerProfile } = useActivities();
  const { toast } = useToast();

  const handleBackfill = async () => {
    setIsBackfilling(true);
    toast({
      title: "Analysis Started",
      description: "Analyzing all activities to populate granular power profile data. This may take a few minutes...",
    });
    
    try {
      await backfillPowerProfile();
      toast({
        title: "Power Profile Updated",
        description: "Successfully analyzed existing activities with granular duration data (1s-1hr+). Your power curve should now display smoothly!",
      });
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: "Failed to populate power profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Profile Analysis</CardTitle>
        <CardDescription>
          Analyze your existing activities to populate granular power profile data across all durations (1s, 2s, 3s...1hr+). This creates a smooth, continuous power curve like WKO5. Run this after uploading new activities or to update historical data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="w-full"
        >
          {isBackfilling ? 'Analyzing Activities...' : 'Analyze Existing Activities'}
        </Button>
      </CardContent>
    </Card>
  );
}