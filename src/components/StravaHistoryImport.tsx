import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Download, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StravaHistoryImport() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: stravaToken } = await supabase
        .from('strava_tokens')
        .select('athlete_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!stravaToken) {
        toast.error("Strava not connected");
        return;
      }

      const { data, error } = await supabase
        .from('strava_backfill_jobs')
        .insert({
          user_id: user.id,
          strava_athlete_id: String(stravaToken.athlete_id),
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'pending' as const,
          user_selected: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Import job created! Your activities will be synced in the background.");
      setStartDate(undefined);
      setEndDate(undefined);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to create import job");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
        <CardDescription>
          Select a date range to import your Strava activity history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Importing more data helps create better AI training plans, but larger date ranges can take up to several days to complete. 
            Only Running, Cycling, and Swimming activities will be imported.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  disabled={(date) => date > new Date()}
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button
          onClick={handleImport}
          disabled={!startDate || !endDate || importing}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Download className="mr-2 h-4 w-4" />
          {importing ? "Creating Import Job..." : "Import History"}
        </Button>
      </CardContent>
    </Card>
  );
}
