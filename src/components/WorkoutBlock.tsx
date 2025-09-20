interface Interval {
  zone: number;
  duration: number; // in seconds
  power: number; // in watts
}

interface WorkoutBlockProps {
  intervals: Interval[];
}

export function WorkoutBlock({ intervals }: WorkoutBlockProps) {
  const totalDuration = intervals.reduce((sum, interval) => sum + interval.duration, 0);
  
  const getZoneColor = (zone: number) => {
    switch (zone) {
      case 1: return 'bg-zone-1';
      case 2: return 'bg-zone-2';
      case 3: return 'bg-zone-3';
      case 4: return 'bg-zone-4';
      default: return 'bg-muted';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${minutes}min`;
  };

  return (
    <div className="space-y-4">
      <div className="flex h-16 rounded-lg overflow-hidden border">
        {intervals.map((interval, index) => {
          const widthPercentage = (interval.duration / totalDuration) * 100;
          return (
            <div
              key={index}
              className={`${getZoneColor(interval.zone)} flex items-center justify-center text-xs font-medium text-primary-foreground transition-all hover:brightness-110`}
              style={{ width: `${widthPercentage}%` }}
              title={`Zone ${interval.zone} - ${interval.power}W - ${formatTime(interval.duration)}`}
            >
              {widthPercentage > 8 && (
                <div className="text-center">
                  <div className="font-bold">{interval.power}W</div>
                  <div className="text-xs opacity-90">{formatTime(interval.duration)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zone-1"></div>
          <span>Zone 1: &lt;AeT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zone-2"></div>
          <span>Zone 2: AeT-GT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zone-3"></div>
          <span>Zone 3: GT-MAP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zone-4"></div>
          <span>Zone 4: &gt;MAP</span>
        </div>
      </div>
    </div>
  );
}