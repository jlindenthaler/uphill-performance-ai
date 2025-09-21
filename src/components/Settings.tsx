import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "@/components/settings/UserSettings";
import { AppSettings } from "@/components/settings/AppSettings";
import { ExternalConnections } from "@/components/settings/ExternalConnections";
import { User, Settings as SettingsIcon, Link } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            User Settings
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            App Settings
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            External Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <UserSettings />
        </TabsContent>

        <TabsContent value="app">
          <AppSettings />
        </TabsContent>

        <TabsContent value="connections">
          <ExternalConnections />
        </TabsContent>
      </Tabs>
    </div>
  );
}