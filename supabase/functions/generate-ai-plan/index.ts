// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LLM_URL = Deno.env.get("LLM_URL") || "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "gemma-3-4b-it";

// ────────────────────────────────────────────────
// 🧠 Helper — block structure with start/end dates
// ────────────────────────────────────────────────
function generateBlockTimeline(startDate: Date, totalWeeks: number) {
  const blocks: { name: string; weeks: number; intent: string }[] = [];
  if (totalWeeks < 8) {
    blocks.push({ name: "Build", weeks: totalWeeks - 2, intent: "Build fitness and intensity tolerance" });
    blocks.push({ name: "Taper", weeks: 2, intent: "Freshen and sharpen for event" });
  } else if (totalWeeks < 16) {
    blocks.push({ name: "Base", weeks: Math.floor(totalWeeks * 0.3), intent: "Aerobic foundation and endurance" });
    blocks.push({ name: "Build", weeks: Math.floor(totalWeeks * 0.5), intent: "Intensity and race-specific work" });
    blocks.push({ name: "Taper", weeks: Math.ceil(totalWeeks * 0.2), intent: "Recovery and sharpening" });
  } else {
    blocks.push({ name: "Base", weeks: Math.floor(totalWeeks * 0.35), intent: "Aerobic foundation and muscular endurance" });
    blocks.push({ name: "Build 1", weeks: Math.floor(totalWeeks * 0.25), intent: "Threshold and tempo work" });
    blocks.push({ name: "Build 2", weeks: Math.floor(totalWeeks * 0.25), intent: "VO2max and race specificity" });
    blocks.push({ name: "Taper", weeks: Math.ceil(totalWeeks * 0.15), intent: "Freshen and maintain sharpness" });
  }

  // Add actual dates
  let blockStart = new Date(startDate);
  return blocks.map(b => {
    const blockEnd = new Date(blockStart.getTime() + b.weeks * 7 * 86400 * 1000);
    const out = { ...b, startISO: blockStart.toISOString(), endISO: blockEnd.toISOString() };
    blockStart = blockEnd;
    return out;
  });
}

// ────────────────────────────────────────────────
// 🧠 SYSTEM PROMPT — now with no fences & ramp control
// ────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are UpHill AI, a world-class endurance training plan architect.
You must output a strictly valid JSON object conforming to the PlanAIOutput schema.
Do NOT wrap your response in Markdown code fences or use \`\`\`json. Return a raw JSON object only.

Zones follow the **Modified Seiler 4-Zone model**:
- Z1: below AeT
- Z2: AeT → GT
- Z3: GT → MAP
- Z4: above MAP

RULES:
- If training model classification is unknown, DEFAULT to "polarized".
- Use the block start/end dates provided in the input — do not invent your own timeline.
- Respect availability and target weekly TLI progression. Do not exceed maxWeeklyRampPct.
- Progress load conservatively, insert recovery weeks every 3–4 weeks.
- Match intensity distribution to the periodization style.
- Do not invent lab data or power values.
- Output ONLY valid JSON. No Markdown, no explanations.

SCHEMA: PlanAIOutput
{
  "chosenTrainingModel": string,
  "rationale": string,
  "macrocycle": [...],
  "microcycles": [...],
  "adaptationPolicy": {...}
}
`;

// ────────────────────────────────────────────────
// 🚀 Main handler
// ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.json();
    const sport = formData.sportMode || "cycling";

    // ── Fetch lab + history
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

    // ── Baseline
    const avgWeeklyTSS = recent.slice(0, 28).reduce((sum, d) => sum + (d.tss || 0), 0) / 4 || 0;
    const recentCTL = recent[0]?.ctl || 0;
    const recentTSB = recent[0]?.tsb || 0;

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
    const blocks = generateBlockTimeline(startDate, totalWeeks);

    // ── Build structured input
    const aiInput = {
      athlete: {
        sport,
        ftp,
        thresholds: { aet: lab.aet || null, gt: lab.gt || null, map: lab.map_value || null },
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
        dailySchedule: formData.weeklySchedule || [
          { day: "Monday", availableHours: 1 },
          { day: "Tuesday", availableHours: 2 },
          { day: "Wednesday", availableHours: 1 },
          { day: "Thursday", availableHours: 2 },
          { day: "Friday", availableHours: 1 },
          { day: "Saturday", availableHours: 4 },
          { day: "Sunday", availableHours: 2 }
        ],
        weeklySessions: formData.sessionsPerWeek || 5,
        weeklyTLI: formData.weeklyTLI || 400,
        maxWeeklyRampPct: formData.maxWeeklyRampPct || 10
      },
      planStructure: { periodization: formData.periodizationStyle || "auto", blocks },
      adaptation: {
        tliTolerancePct: formData.deviationTolerance?.tli || 15,
        durationTolerancePct: formData.deviationTolerance?.duration || 15,
        feedbackSources: formData.feedbackSources || ["HRV", "RPE", "Z2 decoupling"]
      },
      historySummary: {
        // MMP curves go here later
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

    // No more code fences expected, but just in case:
    if (content.startsWith("```")) content = content.replace(/```json|```/g, "").trim();

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
