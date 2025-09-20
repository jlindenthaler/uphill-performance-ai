import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bike, PersonStanding } from "lucide-react";
import { useSportMode } from "@/contexts/SportModeContext";

export function SportModeToggle() {
  const { sportMode, setSportMode, isRunning, isCycling } = useSportMode();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Bike className={`w-4 h-4 ${isCycling ? 'text-primary' : 'text-muted-foreground'}`} />
        <Label htmlFor="sport-mode" className="text-sm font-medium">
          Cycling
        </Label>
      </div>
      
      <Switch
        id="sport-mode"
        checked={isRunning}
        onCheckedChange={(checked) => setSportMode(checked ? 'running' : 'cycling')}
        className="data-[state=checked]:bg-primary"
      />
      
      <div className="flex items-center gap-2">
        <Label htmlFor="sport-mode" className="text-sm font-medium">
          Running
        </Label>
        <PersonStanding className={`w-4 h-4 ${isRunning ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      
      <Badge variant={isCycling ? "default" : "secondary"} className="ml-2">
        {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)} Mode
      </Badge>
    </div>
  );
}