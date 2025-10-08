export interface Thresholds {
  AeT?: number;
  GT?: number;
  MAP?: number;
  CP?: number;
  FTP?: number;
}

export interface IntensityBlock {
  anchor: keyof Thresholds;
  fallback: (keyof Thresholds)[];
  targets?: {
    work?: number;
    recovery?: number;
  };
}

/**
 * Choose the best available base (AeT/GT/MAP then CP then FTP)
 * and return helper functions to convert multipliers -> watts,
 * as well as a Zwift-friendly FTP fraction converter.
 */
export function makeIntensityResolver(intensity: IntensityBlock, thresholds: Thresholds) {
  let base: number | undefined = thresholds[intensity.anchor];
  if (!base) {
    for (const fb of intensity.fallback) {
      if (thresholds[fb] !== undefined) {
        base = thresholds[fb];
        break;
      }
    }
  }
  if (!base) throw new Error("No valid threshold data found to resolve intensity.");

  const ftpForZwift = thresholds.FTP ?? thresholds.CP ?? thresholds.GT ?? thresholds.AeT ?? base;

  return {
    base,
    wattsFromMultiplier(mult: number) {
      return Math.round(base! * mult);
    },
    // Zwift ZWO requires a fraction of FTP, not watts.
    ftpFractionFromWatts(watts: number) {
      return +(watts / ftpForZwift).toFixed(3);
    }
  };
}
