import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, Calendar as CalendarIcon, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGarminJobs } from "@/hooks/useGarminJobs";

export function GarminHistoryImport() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { activeJob, refreshJobs } = useGarminJobs();

  const handleCancelJob = async () => {
    if (!activeJob) return;
    
    try {
      const { error } = await supabase
        .from('garmin_backfill_jobs')
        .update({ 
          status: 'cancelled',
          last_error: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeJob.id);

      if (error) throw error;

      toast({
        title: "Job cancelled",
        description: "The import job has been cancelled",
      });
      
      refreshJobs();
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: "Failed to cancel",
        description: error instanceof Error ? error.message : "Failed to cancel job",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get Garmin token
      const { data: tokenData } = await supabase
        .from('garmin_tokens')
        .select('garmin_user_id')
        .eq('user_id', user.id)
        .single();

      if (!tokenData?.garmin_user_id) {
        throw new Error("Garmin not connected");
      }

      // Create backfill job
      const { error: jobError } = await supabase
        .from('garmin_backfill_jobs')
        .insert({
          user_id: user.id,
          garmin_user_id: tokenData.garmin_user_id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'pending',
        });

      if (jobError) throw jobError;

      toast({
        title: "Import started",
        description: "Your Garmin activities are being imported in the background. This may take a while.",
      });

      refreshJobs();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to start import",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Garmin Historical Data Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJob && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Import in progress</p>
                  <p className="text-sm">
                    Status: {activeJob.status} | Synced: {activeJob.activities_synced} | Skipped: {activeJob.activities_skipped}
                  </p>
                  {activeJob.progress_date && (
                    <p className="text-sm text-muted-foreground">
                      Progress: {format(new Date(activeJob.progress_date), "PPP")}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelJob}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!startDate || !endDate || isLoading || !!activeJob}
            className="w-full"
          >
            {isLoading ? "Starting import..." : "Import Activities"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
