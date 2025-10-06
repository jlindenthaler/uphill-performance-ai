import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';

export function PowerProfileBackfill() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, activityName: '' });
  const [showProgress, setShowProgress] = useState(false);
  const { backfillPowerProfile } = useActivities();
  const { toast } = useToast();

  const handleBackfill = async () => {
    if (!backfillPowerProfile) {
      console.error('❌ backfillPowerProfile function not available');
      toast({
        title: "Error",
        description: "Power profile backfill function is not available",
        variant: "destructive",
      });
      return;
    }

    setIsBackfilling(true);
    setShowProgress(true);
    setProgress({ current: 0, total: 0, activityName: '' });
    
    console.log('🎯 Starting backfill from UI...');
    
    try {
      await backfillPowerProfile((current, total, activityName) => {
        console.log(`Progress: ${current}/${total} - ${activityName}`);
        setProgress({ current, total, activityName });
      });
      
      console.log('✅ Backfill completed successfully');
      
      toast({
        title: "Power Profile Updated",
        description: `Successfully analyzed ${progress.total} activities with granular duration data (1s-1hr+). Your power curve should now display smoothly!`,
      });
      
      // Auto-dismiss progress after 3 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: error instanceof Error ? error.message : "Failed to populate power profile data. Please try again.",
        variant: "destructive",
      });
      setShowProgress(false);
    } finally {
      setIsBackfilling(false);
    }
  };

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      {showProgress && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <CardTitle className="text-base">Syncing History</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary">
                  {isBackfilling ? 'In Progress' : 'Complete'}
                </span>
                {!isBackfilling && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowProgress(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              {isBackfilling 
                ? "We're syncing your full training history in the background. This may take a few minutes."
                : "Sync complete! Your power profile has been updated."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.current} activities synced</span>
                <span>{percentage}% complete</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
            {progress.activityName && isBackfilling && (
              <p className="text-xs text-muted-foreground">
                Processing: {progress.activityName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Power Profile Analysis</CardTitle>
          <CardDescription>
            Analyze your existing activities to populate granular power profile data across all durations (1s, 2s, 3s...1hr+). This creates a smooth, continuous power curve like WKO5. Run this after uploading new activities or to update historical data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleBackfill}
            disabled={isBackfilling}
            className="w-full"
          >
            {isBackfilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Activities...
              </>
            ) : (
              'Analyze Existing Activities'
            )}
          </Button>
          
          {progress.total > 0 && !isBackfilling && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Synced</span>
                <span className="text-lg font-semibold">{progress.current} activities</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}