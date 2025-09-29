import { GarminConnection } from "@/components/GarminConnection";


export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Third-Party Integrations</h2>
        <p className="text-muted-foreground">
          Connect your favorite fitness platforms to automatically sync activities and training data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GarminConnection />
        {/* Strava integration will be rebuilt from scratch */}
      </div>
    </div>
  );
}