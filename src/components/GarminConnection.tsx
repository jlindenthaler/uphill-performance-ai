import { useAuth } from "@/hooks/useSupabase";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useGarmin } from "@/hooks/useGarmin";
import { useGarminJobs } from "@/hooks/useGarminJobs";
import { useToast } from "@/hooks/use-toast";
import { Link, Unlink, Activity, Loader2 } from "lucide-react";
import { GarminHistoryImport } from "@/components/GarminHistoryImport";

export function GarminConnection() {
  const { session } = useAuth();
  const { connectionStatus, initiateGarminConnection, disconnectGarmin, checkGarminConnection } = useGarmin();
  const { activeJob, latestCompletedJob, calculateProgress } = useGarminJobs();
  const { toast } = useToast();
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkGarminConnection();
  }, []);

  const handleConnect = async () => {
    try {
      await initiateGarminConnection();
      const token = session?.access_token;
      if (!token) return console.error("No Supabase session token");
      const res = await fetch("/functions/v1/garmin_backfill", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 90 })
      });
      console.log(res.ok ? "Garmin sync triggered" : await res.text());
    } catch (err) {
      console.error("Connect error:", err);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try { await disconnectGarmin(); } finally { setDisconnecting(false); }
  };

  const getStatusBadge = () => {
    if (connectionStatus.loading) return <Badge variant="secondary">Connecting...</Badge>;
    if (connectionStatus.isConnected) return <Badge className="bg-green-500">Connected</Badge>;
    if (connectionStatus.error) return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="outline">Not Connected</Badge>;
  };

  if (connectionStatus.loading && !connectionStatus.isConnected) {
    return (
      <Card className="card-gradient">
        <CardHeader><CardTitle><Activity className="w-5 h-5 text-primary" /> Garmin Connect</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Garmin Connect</CardTitle>
        <CardDescription>Connect Garmin to sync activities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h4 className="font-medium">Connection Status</h4></div>
          {getStatusBadge()}
        </div>
        <Separator />
        {!connectionStatus.isConnected ? (
          <Button onClick={handleConnect} className="w-full bg-green-600 text-white" disabled={connectionStatus.loading}>
            {connectionStatus.loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : <><Link className="w-4 h-4 mr-2" />Connect Garmin</>}
          </Button>
        ) : (
          <>
            {activeJob && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Syncing History
                {activeJob.status === "running" && (
                  <>
                    <Progress value={calculateProgress(activeJob)} className="mb-2" />
                  </>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>{latestCompletedJob ? `${latestCompletedJob.activities_synced} activities` : "No sync yet"}</div>
              <div>Auto Sync enabled</div>
            </div>
            <Separator />
            <GarminHistoryImport />
            <Separator />
            <Button onClick={handleDisconnect} variant="outline" className="w-full" disabled={disconnecting}>
              {disconnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disconnecting...</> : <><Unlink className="w-4 h-4 mr-2" />Disconnect Garmin</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
