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
    try {
      await backfillPowerProfile();
      toast({
        title: "Power Profile Updated",
        description: "Successfully analyzed existing activities and populated power profile data.",
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
          Analyze your existing activities to populate power profile best efforts for different durations (5s, 1min, 5min, 20min, 60min).
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