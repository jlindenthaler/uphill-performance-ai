import { Button } from "@/components/ui/button";
import { Bike, PersonStanding, Waves } from "lucide-react";
import { useSportMode } from "@/contexts/SportModeContext";

export function SportModeToggle() {
  const { sportMode, setSportMode, isRunning, isCycling, isSwimming } = useSportMode();

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'cycling': return Bike;
      case 'running': return PersonStanding;
      case 'swimming': return Waves;
      default: return Bike;
    }
  };

  const sports = [
    { key: 'cycling', label: 'Cycling', icon: Bike },
    { key: 'running', label: 'Running', icon: PersonStanding },
    { key: 'swimming', label: 'Swimming', icon: Waves },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {sports.map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={sportMode === key ? "default" : "ghost"}
          size="sm"
          onClick={() => setSportMode(key)}
          className={`flex items-center gap-2 transition-all ${
            sportMode === key 
              ? 'bg-background shadow-sm text-primary font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </Button>
      ))}
    </div>
  );
}