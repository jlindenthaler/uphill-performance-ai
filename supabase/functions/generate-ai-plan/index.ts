import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = "gemma-3-4b-it";

const SYSTEM_PROMPT = `You are a world-class endurance training plan architect with expertise in periodization, exercise physiology, and training load management.

ZONE DEFINITIONS (4-Zone Model):
- Z1 (Recovery): <70% FTP, conversational pace, aerobic adaptation
- Z2 (Endurance): 70–85% FTP, sustainable aerobic effort
- Z3 (Tempo/Threshold): 85–95% FTP, moderate lactate accumulation
- Z4 (VO2max/Anaerobic): 95–120% FTP, high intensity, limited duration

OUTPUT REQUIREMENTS:
1. Output ONLY valid JSON. No markdown code fences, no commentary, no preamble.
2. Use ONLY these day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
3. Every session MUST have: name, day, duration (minutes), tss, structure, intent.
4. Respect daily availability limits provided.
5. Structure must include "intervals" array with duration, target, zone.
6. Do not invent extra fields.

PLANNING PRINCIPLES:
- Progressive overload: gradually increase weekly TSS.
- Recovery weeks every 3–4 weeks (-30–50%).
- 2-week taper before event (60%, then 40%).
- Specificity: align intensity with event demands.
`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 🔐 Verify auth
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const formData = await req.json();
    console.log("🧠 Generating plan for user:", user.id);

    // 1️⃣ Fetch DeepSeek + Lab data
    const [analysisRes, labRes] = await Promise.all([
      supabase.from("analysis_results").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("lab_results").select("*").eq("user_id", user.id).eq("sport_mode", formData.sportMode || "cycling").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const analysis = analysisRes.data;
    const lab = labRes.data;

    if (!analysis)
      throw new Error("Missing DeepSeek analysis. Run analyse-history first.");

    // 2️⃣ Extract threshold hierarchy
    const thresholds = analysis?.thresholds || {};
    const AeT = lab?.lt1 || lab?.vt1 || thresholds.AeT || "N/A";
    const GT = lab?.lt2 || lab?.vt2 || thresholds.GT || "N/A";
    const CP = thresholds.CP || lab?.cp || "N/A";
    const FTP = thresholds.FTP || lab?.ftp || "N/A";
    const MAP = lab?.map || thresholds.MAP || "N/A";
    const VO2max = lab?.vo2max || thresholds.VO2max || "N/A";
    const phenotype = analysis?.cp_ftp_relation?.phenotype || "unknown";
    const ctl = analysis?.load?.ctl?.toFixed?.(1) || "N/A";
    const tsb = analysis?.load?.tsb?.toFixed?.(1) || "N/A";
    const trend = analysis?.load?.trend?.toFixed?.(2) || "N/A";

    // 3️⃣ Timeline
    const startDate = formData.startWeek ? new Date(formData.startWeek) : new Date();
    const eventDate = formData.primaryGoal?.eventDate
      ? new Date(formData.primaryGoal.eventDate)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const totalWeeks = Math.ceil(
      (eventDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // 4️⃣ Build context
    const athleteContext = `
ATHLETE CONTEXT:
- Sport: ${formData.sportMode || "cycling"}
- AeT: ${AeT}W, GT: ${GT}W, CP: ${CP}W, FTP: ${FTP}W
- MAP: ${MAP}, VO₂max: ${VO2max}
- Phenotype: ${phenotype}
- CTL: ${ctl}, TSB: ${tsb}, Trend: ${trend}
`;

    const weeklyAvailability = formData.weeklyAvailability || {};
    const totalWeeklyHours = Object.values(weeklyAvailability).reduce(
      (sum: number, d: any) => sum + (d.training_hours || 0),
      0
    );
    const availabilityContext = Object.entries(weeklyAvailability)
      .map(([day, d]: any) => `- ${day}: ${d.training_hours || 1}h (${d.preferred_training_times?.join(", ") || "flex"})`)
      .join("\n");

    const availabilityBlock = `
WEEKLY AVAILABILITY:
${availabilityContext}
Total Weekly Hours: ${(totalWeeklyHours as number).toFixed(1)}h
Long Ride Day: ${formData.longSessionDay || "Saturday"}
Sessions/Week: ${formData.sessionsPerWeek || "Auto"}
`;

    const courseContext = formData.courseMeta
      ? `
COURSE:
- Distance: ${formData.courseMeta.distance_km || "?"} km
- Elevation: ${formData.courseMeta.elevation_m || "?"} m
- Avg Gradient: ${formData.courseMeta.avgGradient || "?"}%
- Goal: ${formData.primaryGoal?.targetObjective || "N/A"}
`
      : "";

    const planMeta = `
PLAN STRUCTURE:
- Periodization: ${formData.periodizationStyle || "auto"}
- Block Length: ${formData.blockLength || "auto"} weeks
- Start: ${startDate.toISOString().split("T")[0]}
- Event: ${eventDate.toISOString().split("T")[0]}
- Total Weeks: ${totalWeeks}
`;

    // 5️⃣ Build LLM prompt
    const prompt = `
Generate a ${totalWeeks}-week plan using the athlete’s physiological profile and training history.

${athleteContext}
${availabilityBlock}
${courseContext}
${planMeta}

Use DeepSeek-derived thresholds and phenotype to shape block focus.
`;

    // 6️⃣ LLM call
    const aiResult = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: -1,
        stream: false,
      }),
    });

    if (!aiResult.ok) {
      const err = await aiResult.text();
      throw new Error(`LLM error: ${err.slice(0, 300)}`);
    }

    const aiData = await aiResult.json();
    let content = aiData.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(content);

    // 7️⃣ Save plan + sessions (unchanged from your original code)
    // ... (keep your DB insertion & validateSession logic exactly as before) ...

    return new Response(JSON.stringify(aiResponse, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ generate-ai-plan error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
