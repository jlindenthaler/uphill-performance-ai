import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function GarminHistoryImport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Garmin Historical Sync Not Available</CardTitle>
        <CardDescription>
          Garmin's API only supports webhook-based syncing for new activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold">Why can't I backfill Garmin data?</p>
            <p>Garmin's Partner API is webhook-only, meaning historical activities cannot be automatically synced. New activities will sync automatically going forward.</p>
          </AlertDescription>
        </Alert>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold">Alternatives for historical data:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Export FIT files from Garmin Connect and manually upload them to the Activities tab</li>
              <li>Use the Strava integration to backfill data if you also sync Garmin → Strava</li>
              <li>Contact our support if you need enterprise-level backfill capabilities</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
