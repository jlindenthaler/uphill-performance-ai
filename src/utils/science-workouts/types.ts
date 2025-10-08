export interface IntensityBlock {
  anchor: "AeT" | "GT" | "MAP";
  /** fallback anchors in order of preference */
  fallback: ("CP" | "FTP")[];
  /** Optional generic default targets if intervals don't define explicit ones */
  targets?: { work: number; rest?: number };
}

export interface SetBlock {
  reps: number;
  /** seconds for "on" rep */
  on_sec: number;
  /** optional seconds for "off" (float or endurance) */
  off_sec?: number;
  /** recovery between sets */
  rec_sec?: number;
  /** target multipliers relative to the chosen anchor/threshold */
  target_on: number;
  target_off?: number;
}

export interface ErgSchema {
  warmup?: { duration_min: number; target: number };
  sets: SetBlock[];
  cooldown?: { duration_min: number; target: number };
}

export interface Workout {
  id: string;
  zone: "Z1" | "Z2" | "Z3" | "Z4";
  title: string;
  protocol: string;
  reference: string;
  doi?: string | null;
  outcome: string;
  intensity: IntensityBlock;
  erg_schema: ErgSchema;
  exportable_formats: ("zwo" | "erg" | "mrc")[];
}
