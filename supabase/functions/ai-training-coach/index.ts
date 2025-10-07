// supabase/functions/ai-training-coach/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// 🌐 Local LLM endpoint (update if your ngrok URL changes)
const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
// 🧠 Models
const MODELS = {
  MIXTRAL: "mixtral-8x7b-instruct-v0.1",
  LLAMA: "meta-llama-3.1-8b-instruct",
  GEMMA: "gemma-3-4b-it",
  DEEPSEEK: "deepseek-math-7b-instruct"
};
// 🔄 Recency thresholds (ENV can override; defaults below)
// ✅ Lab max age explicitly set to 120 days as requested
const RECENCY = {
  LAB_MAX_AGE_DAYS: Number(Deno.env.get("LAB_MAX_AGE_DAYS") ?? 120),
  CP_MAX_AGE_DAYS: Number(Deno.env.get("CP_MAX_AGE_DAYS") ?? 60)
};
function daysBetween(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
// 🔒 Authenticated client (propagates Authorization header for RLS)
function createAuthedClient(authHeader: string) {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}
// =========================
// 🧭 Standardized 4-Zone Model
// =========================
const ZONE_MODEL = `
Use this 4-zone intensity model for ALL outputs unless explicitly told otherwise:

- Zone 1: < AeT (Aerobic Threshold). Low-intensity; recovery & easy endurance.
- Zone 2: AeT → GT (Glycolytic Threshold). Steady aerobic work / tempo.
- Zone 3: GT → MAP (Max Aerobic Power ≈ VO₂max power). High aerobic / threshold to VO₂max.
- Zone 4: > MAP. Supramaximal / anaerobic / neuromuscular.

Do not use Coggan 7-zone or other models. Refer explicitly to Zones 1–4.
`.trim();
// ============
// HTTP handler
// ============
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const supabase = createAuthedClient(authHeader);
    const { task, context } = await req.json();
    const sportMode = String(context?.sport_mode ?? "cycling").toLowerCase().trim();
    const userId = context?.user_id;
    console.log("Incoming task:", {
      task,
      userId,
      sportMode
    });
    const trainingContext = await getTrainingContext(supabase, userId, sportMode);
    let aiResponse;
    switch(task){
      case "daily_recommendations":
        aiResponse = await getDailyRecommendations(trainingContext, {
          sport_mode: sportMode
        });
        break;
      case "chat_assistant":
        aiResponse = await getChatResponse(trainingContext, {
          sport_mode: sportMode,
          message: context?.message ?? ""
        });
        break;
      case "activity_analysis":
        aiResponse = await getActivityAnalysis(trainingContext, {
          activity_data: context?.activity_data ?? {},
          sport_mode: sportMode
        });
        break;
      case "workout_generation":
        aiResponse = await generateWorkout(trainingContext, {
          requirements: context?.requirements ?? {},
          sport_mode: sportMode
        });
        break;
      case "math_analysis":
        aiResponse = await runMathAnalysis(trainingContext, {
          math_payload: context?.math_payload ?? {}
        });
        break;
      case "historical_analysis":
        aiResponse = await runHistoricalAnalysis(trainingContext, {
          history_payload: context?.history_payload ?? {},
          sport_mode: sportMode
        });
        break;
      case "session_feedback":
        aiResponse = await getSessionFeedback(trainingContext, {
          activity_data: context?.activity_data ?? {},
          workout_data: context?.workout_data ?? null,
          sport_mode: sportMode
        });
        break;
      default:
        throw new Error(`Invalid task type: ${task}`);
    }
    
    console.log("AI response generated:", {
      task,
      userId,
      sportMode,
      responseLength: aiResponse?.length || 0,
      responsePreview: aiResponse?.substring(0, 100)
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: aiResponse
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("AI Training Coach Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({
      success: false,
      error: msg,
      fallback: getFallbackResponse(true)
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  }
});
// ====================
// 🔸 Local LLM Helper
// ====================
async function callLocalLLM(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM Error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "[No response]";
}
// ====================
// 🧮 FTP helper (recency-aware)
// ====================
function calculateFTP(lab: any, cp: any, mmp90: any[]): { ftp: number | null; ftpSource: string; recency: any } {
  const labAge = daysBetween(lab?.test_date);
  const cpAge = daysBetween(cp?.test_date);
  const labFresh = !!lab && labAge <= RECENCY.LAB_MAX_AGE_DAYS;
  const cpFresh = !!cp && cpAge <= RECENCY.CP_MAX_AGE_DAYS;
  let ftp = null;
  let src = "none";
  // 1) Fresh lab first (LT2 → VT2)
  if (labFresh && lab?.lt2_power > 0) {
    ftp = Math.round(lab.lt2_power);
    src = "lab_lt2_fresh";
  } else if (labFresh && lab?.vt2_power > 0) {
    ftp = Math.round(lab.vt2_power);
    src = "lab_vt2_fresh";
  } else if (cpFresh && cp?.cp_watts > 0) {
    ftp = Math.round(cp.cp_watts);
    src = "cp_fresh";
  }
  // 3) 90-day MMP (naturally recent)
  if (!ftp && mmp90?.length) {
    const byDur = (s: number) => mmp90.find((p: any) => p.duration_seconds === s)?.power_watts;
    const oneHour = byDur(3600);
    const twenty = byDur(1200);
    const five = byDur(300);
    if (oneHour > 0) {
      ftp = Math.round(oneHour);
      src = "mmp_90d_1h";
    } else if (twenty > 0) {
      ftp = Math.round(twenty * 0.95);
      src = "mmp_90d_20m_est";
    } else if (five > 0) {
      ftp = Math.round(five * 0.90);
      src = "mmp_90d_5m_est";
    }
  }
  // 4) MAP estimate as last non-stale source
  if (!ftp && lab?.map_value > 0) {
    ftp = Math.round(lab.map_value * 0.85);
    src = labFresh ? "lab_map_est_fresh" : "lab_map_est_stale";
  }
  // 5) If still nothing, reluctantly accept **stale** lab/CP (pick the newer)
  if (!ftp) {
    const staleLab = (lab?.lt2_power ?? lab?.vt2_power) || null;
    const staleCP = cp?.cp_watts || null;
    if (staleLab && staleCP) {
      if (labAge <= cpAge) {
        ftp = Math.round(staleLab);
        src = "lab_threshold_stale";
      } else {
        ftp = Math.round(staleCP);
        src = "cp_stale";
      }
    } else if (staleLab) {
      ftp = Math.round(staleLab);
      src = "lab_threshold_stale";
    } else if (staleCP) {
      ftp = Math.round(staleCP);
      src = "cp_stale";
    }
  }
  console.log("FTP computed:", {
    ftp,
    src,
    labAgeDays: labAge,
    cpAgeDays: cpAge,
    labFresh,
    cpFresh
  });
  return {
    ftp,
    ftpSource: src,
    recency: {
      labAgeDays: labAge,
      cpAgeDays: cpAge,
      labFresh,
      cpFresh
    }
  };
}
// ====================
// 🧩 Small helper to surface thresholds concisely
// ====================
function compactPhysioSummary(ctx: any): string {
  const lab = ctx.lab_results;
  const cp = ctx.cp_results;
  const parts = [];
  if (lab?.aet) parts.push(`AeT ${Math.round(lab.aet)}W`);
  if (lab?.gt) parts.push(`GT ${Math.round(lab.gt)}W`);
  if (lab?.map_value) parts.push(`MAP ${Math.round(lab.map_value)}W`);
  if (cp?.cp_watts) {
    const wprime = cp?.w_prime_joules ? `/${Math.round(cp.w_prime_joules / 1000)}kJ` : "";
    parts.push(`CP ${Math.round(cp.cp_watts)}W${wprime}`);
  }
  return parts.length ? `Thresholds: ${parts.join(", ")}` : "";
}
// ====================
// 📊 Training Context (all sources)
// ====================
async function getTrainingContext(supabase: any, userId: string, sportMode: string): Promise<any> {
  const since42 = new Date(Date.now() - 42 * 86400 * 1000).toISOString().slice(0, 10);
  const since7ISO = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const todayDate = new Date().toISOString().slice(0, 10);
  // training_history uses 'sport'
  const { data: trainingHistory, error: thErr } = await supabase.from("training_history").select("*").eq("user_id", userId).eq("sport", sportMode).gte("date", since42).order("date", {
    ascending: false
  });
  // activities use 'sport_mode'
  const { data: recentActivities } = await supabase.from("activities").select("id,name,date,duration_seconds,tss,avg_power,avg_heart_rate").eq("user_id", userId).eq("sport_mode", sportMode).gte("date", since7ISO).order("date", {
    ascending: false
  });
  const { data: goals } = await supabase.from("goals").select("*").eq("user_id", userId).eq("status", "active").gte("event_date", todayDate).order("event_date", {
    ascending: true
  });
  const { data: weeklyTargets } = await supabase.from("weekly_targets").select("*").eq("user_id", userId).eq("sport_mode", sportMode).maybeSingle();
  // labs / cp / 90d power / physiology
  const { data: lab } = await supabase.from("lab_results").select(`
      vo2_max, vla_max, aet, aet_hr, gt, gt_hr, map_value,
      critical_power, w_prime, vt1_hr, vt1_power, vt2_hr, vt2_power,
      lt1_hr, lt1_power, lt2_hr, lt2_power, max_hr, resting_hr,
      fat_max, fat_max_intensity, fat_oxidation_rate, carb_oxidation_rate,
      metabolic_efficiency, body_weight, test_date, test_type
    `).eq("user_id", userId).eq("sport_mode", sportMode).order("test_date", {
    ascending: false
  }).limit(1).maybeSingle();
  const { data: cp } = await supabase.from("cp_results").select("cp_watts, w_prime_joules, test_date, protocol_used, efforts_used").eq("user_id", userId).eq("sport_mode", sportMode).order("test_date", {
    ascending: false
  }).limit(1).maybeSingle();
  // power_profile uses 'sport'
  const { data: mmp90 } = await supabase.from("power_profile").select("power_watts, pace_per_km, duration_seconds, date_achieved").eq("user_id", userId).eq("sport", sportMode).eq("time_window", "90-day").order("duration_seconds", {
    ascending: true
  });
  const { data: phys } = await supabase.from("physiology_data").select("metabolic_flexibility, hrv_rmssd, sleep_hours, sleep_quality, stress_level, fat_max_rate, fat_max_intensity, carb_max_rate, hydration_target, notes, nutrition_strategy, created_at").eq("user_id", userId).eq("sport_mode", sportMode).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  const currentTSB = trainingHistory?.[0]?.tsb ?? 0;
  // Weekly TLI from training_history
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const { data: weeklyProgressRows } = await supabase.from("training_history").select("tss").eq("user_id", userId).eq("sport", sportMode).gte("date", weekStartStr);
  const currentTLI = weeklyProgressRows?.reduce((s: number, r: any) => s + (r.tss || 0), 0) || 0;
  const currentSessions = recentActivities?.filter((a: any) => new Date(a.date) >= weekStart).length || 0;
  const { ftp, ftpSource, recency } = calculateFTP(lab, cp, mmp90 || []);
  console.log("Context summary:", {
    userId,
    sportMode,
    since: since42,
    th_count: trainingHistory?.length || 0,
    ra_count: recentActivities?.length || 0,
    goals: goals?.length || 0,
    tsb: currentTSB,
    ftp,
    ftpSource,
    labFresh: recency.labFresh,
    cpFresh: recency.cpFresh
  });
  return {
    sport_mode: sportMode,
    current_tsb: currentTSB,
    tsb_status: getTSBStatus(currentTSB),
    recent_activities: recentActivities || [],
    active_goals: goals || [],
    weekly_progress: {
      current_tli: currentTLI,
      target_tli: weeklyTargets?.weekly_tli_target || 400,
      current_sessions: currentSessions,
      target_sessions: weeklyTargets?.weekly_sessions_target || 12
    },
    lab_results: lab || null,
    cp_results: cp || null,
    power_profile_90day: mmp90 || [],
    physiology_data: phys || null,
    ftp,
    ftp_source: ftpSource,
    staleness: recency
  };
}
// ====================
// 🧠 Task Handlers
// ====================
// Daily recs — Mixtral, concise, rationale-first, 4-zone
async function getDailyRecommendations(ctx: any, _reqCtx: any): Promise<string> {
  const systemPrompt = `
You are a world-class endurance coach.
${ZONE_MODEL}

Give clear, concise *daily* training recommendations using the 4-zone model.
Requirements:
- Start with the **main focus** (e.g., "Zone 2 Endurance", "Zone 1 Recovery").
- Provide **1–2 sentences of rationale** referencing TSB / weekly load / goals.
- If prescribing structure, keep it brief and in dot points(only what’s necessary).
- ≤ 140 words. No essays. No questions back.
`.trim();
  const nextGoal = ctx.active_goals?.[0] ? `${ctx.active_goals[0].name} on ${ctx.active_goals[0].event_date}` : "No upcoming goal";
  const physioLine = compactPhysioSummary(ctx);
  const freshness = ctx.staleness ? `Data Freshness: Lab ${ctx.staleness.labFresh ? "fresh" : `stale (${ctx.staleness.labAgeDays}d)`}, CP ${ctx.staleness.cpFresh ? "fresh" : `stale (${ctx.staleness.cpAgeDays}d)`}` : "";
  const userPrompt = `
Athlete
- Sport: ${ctx.sport_mode}
- TSB: ${ctx.current_tsb} (${ctx.tsb_status})
- Weekly Progress: ${ctx.weekly_progress.current_tli}/${ctx.weekly_progress.target_tli} TLI; Sessions: ${ctx.weekly_progress.current_sessions}/${ctx.weekly_progress.target_sessions}
- Recent Activities (7d): ${ctx.recent_activities.length}
- Goal: ${nextGoal}
${ctx.ftp ? `- FTP: ${ctx.ftp}W (${ctx.ftp_source})` : ""}
${physioLine ? `- ${physioLine}` : ""}
${freshness}

Task
Give **today's recommendation** in Zones 1–4 with a short rationale.
`.trim();
  let text = await callLocalLLM(systemPrompt, userPrompt, MODELS.MIXTRAL);
  text = text.split(/\s+/).slice(0, 140).join(" ");
  return text;
}
// Chat — Mixtral with full context (numbers + freshness)
async function getChatResponse(ctx: any, reqCtx: any): Promise<string> {
  const systemPrompt = `
You are a world-class endurance coach and sports scientist.
${ZONE_MODEL}
Use the athlete context to answer precisely and practically.
Be concise; avoid long theory unless asked.
`.trim();
  const physioLine = compactPhysioSummary(ctx);
  const freshness = ctx.staleness ? `Data Freshness: Lab ${ctx.staleness.labFresh ? "fresh" : `stale (${ctx.staleness.labAgeDays}d)`}, CP ${ctx.staleness.cpFresh ? "fresh" : `stale (${ctx.staleness.cpAgeDays}d)`}` : "";
  const userPrompt = `
Context
- Sport: ${ctx.sport_mode}
- TSB: ${ctx.current_tsb} (${ctx.tsb_status})
- Weekly: ${ctx.weekly_progress.current_tli}/${ctx.weekly_progress.target_tli} TLI; Sessions: ${ctx.weekly_progress.current_sessions}/${ctx.weekly_progress.target_sessions}
- Recent Activities (7d): ${ctx.recent_activities.length}
- Goals: ${ctx.active_goals.length}
${ctx.ftp ? `- FTP: ${ctx.ftp}W (${ctx.ftp_source})` : ""}
${physioLine ? `- ${physioLine}` : ""}
${freshness}

User
${reqCtx.message}
`.trim();
  return await callLocalLLM(systemPrompt, userPrompt, MODELS.MIXTRAL);
}
// Activity analysis — Mixtral (use FTP/thresholds for zone mapping)
async function getActivityAnalysis(ctx: any, reqCtx: any): Promise<string> {
  const systemPrompt = `
You are an expert cycling performance analyst.
${ZONE_MODEL}
Use FTP=${ctx.ftp ?? "unknown"}W and (${compactPhysioSummary(ctx) || "no thresholds"}) to map intensity to Zones 1–4.
Provide concise insights: zone distribution, intensity hotspots, and any red flags.
`.trim();
  const userPrompt = `Activity JSON:\n${JSON.stringify(reqCtx.activity_data, null, 2)}`;
  return await callLocalLLM(systemPrompt, userPrompt, MODELS.MIXTRAL);
}
// Workout generation — Mixtral
async function generateWorkout(_ctx: any, reqCtx: any): Promise<string> {
  const systemPrompt = `
You are a professional endurance coach and workout designer.
${ZONE_MODEL}
Generate a concise workout using Zones 1–4. Keep it minimal: goal, brief structure, key cues.
`.trim();
  const userPrompt = `Requirements JSON:\n${JSON.stringify(reqCtx.requirements, null, 2)}`;
  return await callLocalLLM(systemPrompt, userPrompt, MODELS.MIXTRAL);
}
// Math — DeepSeek
async function runMathAnalysis(_ctx: any, reqCtx: any): Promise<string> {
  const systemPrompt = `
You are a mathematical and physiological analysis engine.
${ZONE_MODEL}
Perform calculations precisely and explain briefly.
`.trim();
  const userPrompt = JSON.stringify(reqCtx.math_payload, null, 2);
  return await callLocalLLM(systemPrompt, userPrompt, MODELS.DEEPSEEK);
}
// Historical — Gemma (include FTP/thresholds reference)
async function runHistoricalAnalysis(ctx: any, reqCtx: any): Promise<string> {
  const systemPrompt = `
You are an endurance training data analyst.
${ZONE_MODEL}
From historical sessions, infer intensity distribution in the 4-zone model and what drove improvements. Be concise.
`.trim();
  const physioLine = compactPhysioSummary(ctx);
  const userPrompt = `History JSON:
${JSON.stringify(reqCtx.history_payload, null, 2)}

Reference:
${ctx.ftp ? `FTP: ${ctx.ftp}W (${ctx.ftp_source})` : "FTP: n/a"}
${physioLine || ""}
`.trim();
  return await callLocalLLM(systemPrompt, userPrompt, MODELS.GEMMA);
}

// Session Feedback — Gemma (planned vs actual or unplanned insights)
async function getSessionFeedback(ctx: any, reqCtx: any): Promise<string> {
  const { activity_data, workout_data } = reqCtx;
  const isPlannedWorkout = !!workout_data;
  
  const systemPrompt = `You are an expert endurance coach analyzing a completed training session.

ATHLETE CONTEXT:
${compactPhysioSummary(ctx)}

${isPlannedWorkout ? `
SESSION TYPE: Planned Workout
- Planned: ${workout_data.name}
- Planned Duration: ${workout_data.duration_minutes}min, TLI: ${workout_data.tss}
- Actual Duration: ${Math.round(activity_data.duration_seconds/60)}min, TLI: ${Math.round(activity_data.tss || 0)}
- Completion: ${Math.round(((activity_data.tss || 0) / workout_data.tss) * 100)}%

TASK: Compare planned vs actual execution and explain how completing this workout contributes to the athlete's goal: "${ctx.active_goals[0]?.name || 'general fitness'}".
` : `
SESSION TYPE: Unplanned Activity
- Activity: ${activity_data.name}
- Duration: ${Math.round(activity_data.duration_seconds/60)}min, TLI: ${Math.round(activity_data.tss || 0)}
- Intensity: ${activity_data.intensity_factor?.toFixed(2) || 'N/A'}

TASK: Highlight what was effective about this session and how it supports the athlete's goal: "${ctx.active_goals[0]?.name || 'general fitness'}".
`}

REQUIREMENTS:
- Maximum 100 words
- 2-3 bullet points
- Be specific and constructive
- Reference physiological adaptations when relevant
- Avoid generic praise

Return only the feedback text.`;

  return await callLocalLLM(systemPrompt, '', MODELS.GEMMA);
}

// ====================
// TSB bands + helpers
// ====================
const TSB_BANDS = {
  VERY_TIRED: -25,
  AT_RISK: -10,
  OPTIMAL: 5,
  RESTED: 10,
  RACE_READY: 25
};
function getTSBStatus(tsb: number): string {
  if (tsb >= TSB_BANDS.RACE_READY) return "Fresh";
  if (tsb >= TSB_BANDS.RESTED) return "Race Ready";
  if (tsb >= TSB_BANDS.OPTIMAL) return "Rested";
  if (tsb >= TSB_BANDS.AT_RISK) return "Optimal Training";
  if (tsb >= TSB_BANDS.VERY_TIRED) return "At Risk";
  return "Very Tired";
}
function getFallbackResponse(isDaily: boolean): string {
  if (isDaily) {
    return "Focus on consistent training and proper recovery. Listen to your body and adjust intensity based on how you feel today.";
  }
  return "I'm currently unavailable, but keep up the great training!";
}
