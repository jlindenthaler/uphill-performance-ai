import type { Workout } from './types';
import { makeIntensityResolver, type Thresholds } from './resolver';

/** Build a second-by-second timeline of [time_sec, watts] segments */
function buildTimeline(workout: Workout, thresholds: Thresholds): Array<[number, number]> {
  const r = makeIntensityResolver(workout.intensity, thresholds);
  const timeline: Array<[number, number]> = [];
  let t = 0;

  // Warmup as steady
  if (workout.erg_schema.warmup) {
    const dur = Math.round(workout.erg_schema.warmup.duration_min * 60);
    const w = r.wattsFromMultiplier(workout.erg_schema.warmup.target);
    timeline.push([t, w]);
    t += dur;
    timeline.push([t, w]);
  }

  // Sets
  for (const set of workout.erg_schema.sets) {
    for (let i = 0; i < set.reps; i++) {
      const wOn = r.wattsFromMultiplier(set.target_on);
      timeline.push([t, wOn]);
      t += set.on_sec;
      timeline.push([t, wOn]);

      if (set.off_sec && set.target_off !== undefined) {
        const wOff = r.wattsFromMultiplier(set.target_off);
        timeline.push([t, wOff]);
        t += set.off_sec;
        timeline.push([t, wOff]);
      }
    }
    if (set.rec_sec && set.rec_sec > 0) {
      const recW = r.wattsFromMultiplier(Math.min(set.target_off ?? 0.5, 0.6));
      timeline.push([t, recW]);
      t += set.rec_sec;
      timeline.push([t, recW]);
    }
  }

  // Cooldown
  if (workout.erg_schema.cooldown) {
    const dur = Math.round(workout.erg_schema.cooldown.duration_min * 60);
    const w = r.wattsFromMultiplier(workout.erg_schema.cooldown.target);
    timeline.push([t, w]);
    t += dur;
    timeline.push([t, w]);
  }

  return timeline;
}

export function exportToERG(workout: Workout, thresholds: Thresholds): string {
  const timeline = buildTimeline(workout, thresholds);
  const header = [
    "ERG File",
    `WORKOUT NAME: ${workout.title}`,
    workout.reference,
    "[COURSE HEADER]",
    "VERSION = 2",
    "UNITS = WATTS",
    "DESCRIPTION = ${workout.title}",
    "FILE NAME = ${workout.id}.erg",
    "MINUTES WATTS",
    "[END COURSE HEADER]",
    "[COURSE DATA]"
  ].join("\n");

  let body = "";
  for (const [timeSec, watts] of timeline) {
    const minutes = (timeSec / 60).toFixed(3);
    body += `${minutes}\t${watts}\n`;
  }
  const footer = "[END COURSE DATA]";
  return `${header}\n${body}${footer}`;
}

export function exportToMRC(workout: Workout, thresholds: Thresholds): string {
  const timeline = buildTimeline(workout, thresholds);
  const header = [
    "[COURSE HEADER]",
    "VERSION = 2",
    "UNITS = WATTS",
    "DESCRIPTION = ${workout.title}",
    "FILE NAME = ${workout.id}.mrc",
    "MINUTES WATTS",
    "[END COURSE HEADER]",
    "[COURSE DATA]"
  ].join("\n");

  let body = "";
  for (const [timeSec, watts] of timeline) {
    const minutes = (timeSec / 60).toFixed(3);
    body += `${minutes}\t${watts}\n`;
  }
  const footer = "[END COURSE DATA]";
  return `${header}\n${body}${footer}`;
}

export function exportToZWO(workout: Workout, thresholds: Thresholds): string {
  const r = makeIntensityResolver(workout.intensity, thresholds);
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<workout_file>`);
  lines.push(`  <author>UpHill AI</author>`);
  lines.push(`  <name>${workout.title}</name>`);
  lines.push(`  <description>${workout.reference}</description>`);
  lines.push(`  <workout>`);

  // Warmup
  if (workout.erg_schema.warmup) {
    const dur = Math.round(workout.erg_schema.warmup.duration_min * 60);
    const watts = r.wattsFromMultiplier(workout.erg_schema.warmup.target);
    const ftpFrac = r.ftpFractionFromWatts(watts);
    lines.push(`    <Warmup Duration="${dur}" Power="${ftpFrac}"/>`);
  }

  // Sets
  for (const set of workout.erg_schema.sets) {
    const onW = r.wattsFromMultiplier(set.target_on);
    const onFtp = r.ftpFractionFromWatts(onW);
    const offW = (set.target_off !== undefined) ? r.wattsFromMultiplier(set.target_off) : undefined;
    const offFtp = (offW !== undefined) ? r.ftpFractionFromWatts(offW) : undefined;

    const reps = set.reps;
    const onDur = Math.round(set.on_sec);
    const offDur = set.off_sec ? Math.round(set.off_sec) : 0;

    if (set.off_sec && offFtp !== undefined) {
      lines.push(`    <IntervalsT Repeat="${reps}" OnDuration="${onDur}" OffDuration="${offDur}" OnPower="${onFtp}" OffPower="${offFtp}"/>`);
    } else {
      // If no off-phase, emit repeats of steady blocks
      for (let i = 0; i < reps; i++) {
        lines.push(`    <SteadyState Duration="${onDur}" Power="${onFtp}"/>`);
      }
    }

    // Set recovery if specified
    if (set.rec_sec && set.rec_sec > 0) {
      const recW = r.wattsFromMultiplier(Math.min(set.target_off ?? 0.5, 0.6));
      const recFtp = r.ftpFractionFromWatts(recW);
      lines.push(`    <SteadyState Duration="${Math.round(set.rec_sec)}" Power="${recFtp}"/>`);
    }
  }

  // Cooldown
  if (workout.erg_schema.cooldown) {
    const dur = Math.round(workout.erg_schema.cooldown.duration_min * 60);
    const watts = r.wattsFromMultiplier(workout.erg_schema.cooldown.target);
    const ftpFrac = r.ftpFractionFromWatts(watts);
    lines.push(`    <Cooldown Duration="${dur}" Power="${ftpFrac}"/>`);
  }

  lines.push(`  </workout>`);
  lines.push(`</workout_file>`);
  return lines.join("\n");
}
