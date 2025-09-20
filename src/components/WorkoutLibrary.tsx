import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, BookOpen, Target, Clock, Zap, Search, Filter, Download } from "lucide-react";
import { WorkoutBlock } from "./WorkoutBlock";
import { useState } from "react";

interface WorkoutData {
  id: string;
  name: string;
  description: string;
  purpose: string;
  research: {
    title: string;
    authors: string;
    link: string;
    year: number;
  };
  structure: {
    warmup: string;
    mainSet: string;
    cooldown: string;
  };
  intervals: Array<{
    zone: number;
    duration: number;
    power: number;
  }>;
  zones: number[];
  duration: number; // minutes
  tss: number; // Training Stress Score
  category: 'vo2max' | 'threshold' | 'tempo' | 'endurance';
  sport: 'cycling' | 'running' | 'swimming' | 'all';
}

const workouts: WorkoutData[] = [
  {
    id: "ronnestad-vo2max",
    name: "Rønnestad 3x13x30:15s VO2Max",
    description: "High-intensity interval training with short work intervals",
    purpose: "Improves VO2max, neuromuscular power, and anaerobic capacity. The short intervals allow for sustained high power outputs at or above MAP while maintaining good form.",
    research: {
      title: "Effects of 12 weeks of block periodization on performance and performance indices in well-trained cyclists",
      authors: "Rønnestad et al.",
      link: "https://pubmed.ncbi.nlm.nih.gov/24382098/",
      year: 2014
    },
    structure: {
      warmup: "15min progressive build",
      mainSet: "3 sets of 13x (30s @ 120% MAP : 15s recovery), 5min between sets",
      cooldown: "10min easy spin"
    },
    intervals: [
      { zone: 1, duration: 900, power: 150 }, // 15min warmup
      { zone: 4, duration: 30, power: 400 }, // First interval set
      { zone: 1, duration: 15, power: 100 },
      { zone: 4, duration: 30, power: 400 },
      { zone: 1, duration: 15, power: 100 },
      { zone: 4, duration: 30, power: 400 },
      { zone: 1, duration: 300, power: 100 }, // 5min recovery
      { zone: 1, duration: 600, power: 120 }, // 10min cooldown
    ],
    zones: [4],
    duration: 90,
    tss: 95,
    category: 'vo2max',
    sport: 'cycling'
  },
  {
    id: "seiler-8x4",
    name: "Seiler 8x4min @ LT2",
    description: "Classic threshold intervals based on Seiler's polarized training model",
    purpose: "Develops lactate buffering capacity and improves time to exhaustion at threshold power. Excellent for building aerobic capacity.",
    research: {
      title: "Intervals, Thresholds, and Long Slow Distance: the Role of Intensity and Duration in Endurance Training",
      authors: "Seiler S.",
      link: "https://pubmed.ncbi.nlm.nih.gov/19918194/",
      year: 2009
    },
    structure: {
      warmup: "20min with 3x3min builds",
      mainSet: "8x (4min @ LT2 : 2min recovery)",
      cooldown: "15min easy"
    },
    intervals: [
      { zone: 1, duration: 1200, power: 160 }, // 20min warmup
      { zone: 3, duration: 240, power: 280 }, // 4min intervals x8
      { zone: 1, duration: 120, power: 120 },
      { zone: 3, duration: 240, power: 280 },
      { zone: 1, duration: 120, power: 120 },
      { zone: 1, duration: 900, power: 120 }, // 15min cooldown
    ],
    zones: [3],
    duration: 95,
    tss: 78,
    category: 'threshold',
    sport: 'cycling'
  },
  {
    id: "laursen-4x8",
    name: "Laursen 4x8min @ LT2",
    description: "Sustained threshold intervals for FTP development",
    purpose: "Improves lactate buffering capacity, glycolytic power, and time to exhaustion at threshold intensities. Excellent for FTP development.",
    research: {
      title: "The scientific basis for high-intensity interval training",
      authors: "Laursen & Jenkins",
      link: "https://pubmed.ncbi.nlm.nih.gov/12500988/",
      year: 2002
    },
    structure: {
      warmup: "20min with 3x3min builds",
      mainSet: "4x (8min @ LT2 : 4min recovery)",
      cooldown: "15min easy"
    },
    intervals: [
      { zone: 1, duration: 1200, power: 160 }, // 20min warmup
      { zone: 3, duration: 480, power: 285 }, // 8min intervals x4
      { zone: 1, duration: 240, power: 120 },
      { zone: 3, duration: 480, power: 285 },
      { zone: 1, duration: 240, power: 120 },
      { zone: 1, duration: 900, power: 120 }, // 15min cooldown
    ],
    zones: [3],
    duration: 105,
    tss: 82,
    category: 'threshold',
    sport: 'cycling'
  },
  {
    id: "coggan-2x20",
    name: "Coggan 2x20min FTP Test",
    description: "Standard FTP assessment protocol",
    purpose: "Establishes current functional threshold power for training zone calculation. Most reliable field test for threshold power.",
    research: {
      title: "Training and Racing with a Power Meter",
      authors: "Coggan A. & Allen H.",
      link: "https://www.trainingpeaks.com/blog/what-is-ftp/",
      year: 2010
    },
    structure: {
      warmup: "20min with opener efforts",
      mainSet: "2x (20min @ FTP : 10min recovery)",
      cooldown: "10min easy"
    },
    intervals: [
      { zone: 1, duration: 1200, power: 160 }, // 20min warmup
      { zone: 3, duration: 1200, power: 275 }, // 20min efforts x2
      { zone: 1, duration: 600, power: 120 },
      { zone: 3, duration: 1200, power: 275 },
      { zone: 1, duration: 600, power: 120 }, // 10min cooldown
    ],
    zones: [3],
    duration: 90,
    tss: 100,
    category: 'threshold',
    sport: 'cycling'
  }
];

export function WorkoutLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { sportMode } = useSportMode();

  // Filter workouts by sport
  const sportSpecificWorkouts = workouts.filter(workout => 
    workout.sport === sportMode || workout.sport === 'all'
  );

  const getZoneColor = (zone: number) => {
    switch (zone) {
      case 1: return 'bg-zone-1 text-zone-1-foreground';
      case 2: return 'bg-zone-2 text-zone-2-foreground';
      case 3: return 'bg-zone-3 text-zone-3-foreground';
      case 4: return 'bg-zone-4 text-zone-4-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'vo2max': return 'bg-zone-4/20 text-zone-4';
      case 'threshold': return 'bg-zone-3/20 text-zone-3';
      case 'tempo': return 'bg-zone-2/20 text-zone-2';
      case 'endurance': return 'bg-zone-1/20 text-zone-1';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const filteredWorkouts = sportSpecificWorkouts.filter(workout => {
    const matchesSearch = workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.research.authors.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || workout.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Science-Based Workouts - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}</h1>
          <p className="text-muted-foreground">Research-backed training sessions for optimal performance</p>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          {filteredWorkouts.length} Workouts
        </Badge>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search workouts, authors, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="vo2max">VO2Max</SelectItem>
            <SelectItem value="threshold">Threshold</SelectItem>
            <SelectItem value="tempo">Tempo</SelectItem>
            <SelectItem value="endurance">Endurance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredWorkouts.map((workout) => (
          <Card key={workout.id} className="card-gradient shadow-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {workout.name}
                    </CardTitle>
                    <Badge className={getCategoryColor(workout.category)}>
                      {workout.category.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>{workout.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {workout.zones.map((zone) => (
                    <Badge key={zone} className={getZoneColor(zone)}>
                      Zone {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{workout.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">TSS: {workout.tss}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{workout.research.year}</span>
                </div>
              </div>

              <Separator />

              {/* Workout Visual Block */}
              <div className="space-y-3">
                <h4 className="font-semibold">Workout Structure</h4>
                <WorkoutBlock intervals={workout.intervals} />
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Purpose & Benefits</h4>
                <p className="text-sm text-muted-foreground">{workout.purpose}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Training Structure</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">WARMUP</p>
                    <p className="text-sm">{workout.structure.warmup}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs font-medium text-primary">MAIN SET</p>
                    <p className="text-sm">{workout.structure.mainSet}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">COOLDOWN</p>
                    <p className="text-sm">{workout.structure.cooldown}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Research Foundation</h4>
                <div className="p-4 rounded-lg border bg-muted/10">
                  <p className="font-medium">{workout.research.title}</p>
                  <p className="text-sm text-muted-foreground">{workout.research.authors} ({workout.research.year})</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(workout.research.link, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Research
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  Add to Calendar
                </Button>
                <Button size="sm" className="primary-gradient">
                  Create Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkouts.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workouts found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
        </div>
      )}
    </div>
  );
}