// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// ────────────────────────────────────────────────
// 🔐 CORS & Env
// ────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LLM_URL = Deno.env.get("LLM_URL") || "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "gemma-3-4b-it";

// ────────────────────────────────────────────────
// 🧠 Helper: Generate structured block skeleton
// ────────────────────────────────────────────────
function generateBlockStructure(totalWeeks: number) {
  if (totalWeeks < 8) {
    return [
      { name: "Build", weeks: totalWeeks - 2, intent: "Build fitness and intensity tolerance" },
      { name: "Taper", weeks: 2, intent: "Freshen and sharpen for event" },
    ];
  } else if (totalWeeks < 16) {
    return [
      { name: "Base", weeks: Math.floor(totalWeeks * 0.3), intent: "Aerobic foundation and endurance" },
      { name: "Build", weeks: Math.floor(totalWeeks * 0.5), intent: "Intensity and race-specific work" },
      { name: "Taper", weeks: Math.ceil(totalWeeks * 0.2), intent: "Recovery and sharpening" },
    ];
  } else {
    return [
      { name: "Base", weeks: Math.floor(totalWeeks * 0.35), intent: "Aerobic foundation and muscular endurance" },
      { name: "Build 1", weeks: Math.floor(totalWeeks * 0.25), intent: "Threshold and tempo work" },
      { name: "Build 2", weeks: Math.floor(totalWeeks * 0.25), intent: "VO2max and race specificity" },
      { name: "Taper", weeks: Math.ceil(totalWeeks * 0.15), intent: "Freshen and maintain sharpness" },
    ];
  }
}

// ────────────────────────────────────────────────
// 🧠 SYSTEM PROMPT — doctrine & schema rules
// ────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are UpHill AI, a world-class endurance training plan architect.
You must output a strictly valid JSON object conforming to the PlanAIOutput schema.

Zones follow the **Modified Seiler 4-Zone model**:
- Z1: below Aerobic Threshold (AeT)
- Z2: AeT → Glycolytic Threshold (GT)
- Z3: GT → MAP
- Z4: above MAP

RULES:
- If training model classification is unknown, DEFAULT to "polarized".
- Respect the athlete's availability and event timeline.
- Progress load conservatively (deload every 3–4 weeks).
- Match intensity distribution to the periodization style.
- Do not invent data. If something is missing, fall back conservatively.
- Output ONLY valid JSON. No Markdown, no explanations.

SCHEMA: PlanAIOutput
{
  "chosenTrainingModel": "polarized" | "pyramidal" | "threshold" | "timecrunched",
  "rationale": string,
  "macrocycle": [
    {
      "block": string,
      "startISO": string,
      "endISO": string,
      "intents": string[],
      "targetWeeklyTLI": number[]
    }
  ],
  "microcycles": [
    {
      "weekStartISO": string,
      "targetTLI": number,
      "sessionsPlanned": number,
      "keyWorkouts": [
        {
          "name": string,
          "zoneIntent": "Z1"|"Z2"|"Z3"|"Z4",
          "prescription": string,
          "export": {
            "type": "ERG"|"ZWO"|"FITSTRUCT",
            "payload": string
          }
        }
      ]
    }
  ],
  "adaptationPolicy": {
    "tliTolerancePct": number,
    "durationTolerancePct": number,
    "triggers": string[]
  }
}
`;

// ────────────────────────────────────────────────
// 🚀 MAIN
// ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.json();
    const sport = formData.sportMode || "cycling";

    // ── Fetch latest lab results & 90-day training history
    const [labResult, history] = await Promise.all([
      supabase
        .from("lab_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("sport_mode", sport)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("training_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("sport", sport)
        .order("date", { ascending: false })
        .limit(90),
    ]);

    const lab = labResult.data || {};
    const recent = history.data || [];

    // ── Compute baseline
    const avgWeeklyTSS = recent.length > 0
      ? recent.slice(0, 28).reduce((sum, d) => sum + (d.tss || 0), 0) / 4
      : 0;
    const recentCTL = recent[0]?.ctl || 0;
    const recentTSB = recent[0]?.tsb || 0;

    // ── FTP estimation hierarchy
    let ftp = formData.primaryGoal?.targetPower || 250;
    if (lab.vt2_power) ftp = lab.vt2_power;
    else if (lab.lt2_power) ftp = lab.lt2_power;
    else if (lab.critical_power) ftp = lab.critical_power;
    else if (lab.map_value) ftp = lab.map_value * 0.95;

    // ── Timeline
    const startDate = formData.startWeek ? new Date(formData.startWeek) : new Date();
    const eventDate = formData.primaryGoal?.eventDate
      ? new Date(formData.primaryGoal.eventDate)
      : new Date(startDate.getTime() + 90 * 86400 * 1000);
    const totalWeeks = Math.ceil((eventDate.getTime() - startDate.getTime()) / (7 * 86400 * 1000));
    const blocks = generateBlockStructure(totalWeeks);

    // ── Construct structured JSON prompt input
    const aiInput = {
      athlete: {
        sport,
        ftp,
        thresholds: {
          aet: lab.aet || null,
          gt: lab.gt || null,
          map: lab.map_value || null,
        },
        ctl: recentCTL,
        tsb: recentTSB,
        avgWeeklyTSS,
      },
      goal: {
        name: formData.primaryGoal?.eventName,
        date: eventDate.toISOString(),
        type: formData.primaryGoal?.eventType,
        target: formData.primaryGoal?.targetObjective,
      },
      availability: {
        weeklySessions: formData.sessionsPerWeek || 5,
        weeklyTLI: formData.weeklyTLI || 400,
        longSessionDay: formData.longSessionDay || "Saturday",
        dailySchedule: formData.weeklySchedule || null, // you can fill this in later
      },
      planStructure: {
        periodization: formData.periodizationStyle || "auto",
        blocks,
      },
      adaptation: {
        tliTolerancePct: formData.deviationTolerance?.tli || 10,
        durationTolerancePct: formData.deviationTolerance?.duration || 10,
        feedbackSources: formData.feedbackSources || [],
      },
      historySummary: {
        // You can extend this later with zone distributions or MMP curves
      }
    };

    // ── LLM Call
    const response = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(aiInput) },
        ],
        temperature: 0.4,
        max_tokens: -1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ LLM Error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const llmData = await response.json();
    let content = llmData.choices?.[0]?.message?.content?.trim() || "{}";

    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    const aiPlan = JSON.parse(content);
    console.log("✅ Plan generated:", aiPlan.chosenTrainingModel, aiPlan.macrocycle?.length || 0, "blocks");

    return new Response(JSON.stringify({ success: true, aiPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
