// 🔹 Uphill AI – DeepSeek Analysis Function
// Purpose: Analyse historical activity & lab data to derive CP/FTP, thresholds,
// phenotype, load, and training model tendencies before Gemma generates plans.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mean, linearRegression } from "https://esm.sh/simple-statistics@7.8.3";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { user_id } = await req.json();

    if (!user_id) throw new Error("Missing user_id in request body.");

    // ---------------------------------------
    // 1️⃣ Fetch data
    // ---------------------------------------
    const { data: activities } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user_id)
      .order("start_time", { ascending: true });

    const { data: labs } = await supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: true });

    if (!activities?.length) throw new Error("No activity history found.");

    // ---------------------------------------
    // 2️⃣ Validate 365-day backfill coverage
    // ---------------------------------------
    const startDate = new Date(activities[0].start_time);
    const endDate = new Date(activities[activities.length - 1].start_time);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (totalDays < 300) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Insufficient history. Require ≥ 300 days of data for full analysis.",
        }),
        { status: 400 }
      );
    }

    // ---------------------------------------
    // 3️⃣ Extract lab hierarchy thresholds
    // ---------------------------------------
    const latestLab = labs?.[labs.length - 1];
    const labAeT = latestLab?.lt1 || latestLab?.vt1;
    const labGT = latestLab?.lt2 || latestLab?.vt2;
    const labCP = latestLab?.cp;
    const labFTP = latestLab?.ftp;
    const labMAP = latestLab?.map;
    const labVO2 = latestLab?.vo2max;

    // ---------------------------------------
    // 4️⃣ Derive CP curve (3–20 min bests)
    // ---------------------------------------
    const durations = [180, 360, 720, 1200]; // 3, 6, 12, 20 min
    const cpPoints = [];

    for (const d of durations) {
      const mmp = Math.max(...activities.map(a => a[`mmp_${d}`] || 0));
      if (mmp > 0) cpPoints.push({ duration: d, power: mmp });
    }

    let cp = null;
    if (cpPoints.length >= 3) {
      const invT = cpPoints.map(p => 1 / p.duration);
      const pwr = cpPoints.map(p => p.power);
      const reg = linearRegression(invT.map((x, i) => [x, pwr[i]]));
      cp = reg.b; // critical power
    }

    // ---------------------------------------
    // 5️⃣ Estimate FTP (95% of 20-min MMP or 40–60min best)
    // ---------------------------------------
    const mmp20 = Math.max(...activities.map(a => a.mmp_1200 || 0));
    const mmp40 = Math.max(...activities.map(a => a.mmp_2400 || 0));
    const mmp60 = Math.max(...activities.map(a => a.mmp_3600 || 0));

    const ftp = labFTP || (mmp60 || mmp40 || mmp20 * 0.95) || null;

    // ---------------------------------------
    // 6️⃣ CP vs FTP comparison & phenotype
    // ---------------------------------------
    let deltaPct = null, phenotype = null;

    if (cp && ftp) {
      deltaPct = ((cp - ftp) / ftp) * 100;

      if (Math.abs(deltaPct) <= 3) phenotype = "balanced";
      else if (cp > ftp) phenotype = "durability_dominant";
      else phenotype = "fatigue_resistant";
    }

    // ---------------------------------------
    // 7️⃣ Derive AeT & GT with hierarchy
    // ---------------------------------------
    const AeT =
      labAeT ||
      (latestLab?.vt1 ?? null) ||
      null; // future: dfa_a1

    const GT =
      labGT ||
      (labCP ? labCP * 1.0 : ftp ? ftp : null);

    // ---------------------------------------
    // 8️⃣ Load & adaptation trends (4–12 week window)
    // ---------------------------------------
    const last12wks = activities.slice(-84);
    const tliSeries = last12wks.map((a) => a.tli || 0);
    const rpeSeries = last12wks.map((a) => a.rpe || 0);
    const ctl = mean(tliSeries);
    const atl = mean(tliSeries.slice(-7));
    const tsb = ctl - atl;
    const trend = (tliSeries[tliSeries.length - 1] - tliSeries[0]) / tliSeries.length;

    const analysisWindow = trend > 0.5 ? 8 : trend > 0 ? 4 : 12;

    // ---------------------------------------
    // 9️⃣ Output JSON for Gemma
    // ---------------------------------------
    const result = {
      user_id,
      window: {
        type: "rolling_365d",
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        totalDays,
      },
      thresholds: {
        source_priority: ["lab", "cp", "ftp"],
        AeT,
        AeT_source: labAeT ? "lab" : "fallback",
        GT,
        GT_source: labGT ? "lab" : ftp ? "ftp" : "cp",
        CP: cp,
        CP_source: cp ? "field" : "none",
        FTP: ftp,
        FTP_source: ftp ? "field" : "none",
        MAP: labMAP || null,
        VO2max: labVO2 || null,
      },
      cp_meta: { points_used: cpPoints.length, durations, cpPoints },
      cp_ftp_relation: { delta_pct: deltaPct, phenotype },
      load: { ctl, atl, tsb, trend, analysisWindow },
      qa: { data_quality: activities.length >= 300 ? "good" : "low" },
      notes: [
        "AeT from lab or fallback; DFA α₁ inactive (future feature).",
        "CP vs FTP classification per Uphill-AI rules.",
        "Backfill-aware rolling-365d window applied.",
      ],
    };

    await supabase.from("analysis_results").upsert(result);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Analysis Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
