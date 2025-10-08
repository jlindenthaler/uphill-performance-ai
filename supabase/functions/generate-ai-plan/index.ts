import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = "gemma-3-4b-it";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.json();
    console.log("🧠 Generating plan for user:", user.id);

    // 1️⃣ Fetch athlete baseline data
    const [labResults, trainingHistory] = await Promise.all([
      supabase
        .from("lab_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("sport_mode", formData.sportMode || "cycling")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("training_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("sport", formData.sportMode || "cycling")
        .order("date", { ascending: false })
        .limit(90),
    ]);

    const lab = labResults.data;
    const recentHistory = trainingHistory.data || [];

    const recentCTL = recentHistory.length > 0 ? recentHistory[0].ctl || 0 : 0;
    const recentTSB = recentHistory.length > 0 ? recentHistory[0].tsb || 0 : 0;
    const avgWeeklyTSS =
      recentHistory.length > 0
        ? recentHistory
            .slice(0, 28)
            .reduce((sum, d) => sum + (d.tss || 0), 0) / 4
        : 0;

    // 2️⃣ Determine FTP/Threshold
    let ftp = formData.primaryGoal.targetPower || 250;
    let ftpSource = "user_input";
    if (lab) {
      if (lab.vt2_power) {
        ftp = lab.vt2_power;
        ftpSource = "lab_vt2";
      } else if (lab.lt2_power) {
        ftp = lab.lt2_power;
        ftpSource = "lab_lt2";
      } else if (lab.critical_power) {
        ftp = lab.critical_power;
        ftpSource = "lab_cp";
      } else if (lab.map_value) {
        ftp = lab.map_value * 0.95;
        ftpSource = "lab_map_est";
      }
    }

    // 3️⃣ Plan timing
    const startDate = formData.startWeek ? new Date(formData.startWeek) : new Date();
    const eventDate = formData.primaryGoal.eventDate
      ? new Date(formData.primaryGoal.eventDate)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const totalWeeks = Math.ceil(
      (eventDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // 4️⃣ Analyze history (NEW)
    const historicalAnalysis = analyzeTrainingHistory(recentHistory, lab);

    // 5️⃣ Build prompt sections
    const athleteContext = `
Athlete Context:
- Sport: ${formData.sportMode || "cycling"}
- FTP: ${ftp}W (${ftpSource})
- AeT: ${lab?.aet || "N/A"}W, GT: ${lab?.gt || "N/A"}W, MAP: ${lab?.map_value || "N/A"}W
- VO2max: ${lab?.vo2max || "N/A"}
- CTL: ${recentCTL.toFixed(1)}, TSB: ${recentTSB.toFixed(1)}, Weekly TSS: ${avgWeeklyTSS.toFixed(0)}
`;

    const weeklyScheduleString = (formData.weeklySchedule || []).map(day => {
      return `${day.day}: ${day.availableHours}h`;
    }).join("\n");

    const availabilityContext = `
Weekly Availability:
${weeklyScheduleString}

Long Session Day: ${formData.longSessionDay || "Saturday"}
Target Weekly Sessions: ${formData.sessionsPerWeek || "Auto"}
Target Weekly TLI: ${formData.weeklyTLI || "Auto"}
`;

    const courseContext = formData.courseMeta
      ? `
Course:
- Distance: ${formData.courseMeta.distance_km || "?"} km
- Elevation: ${formData.courseMeta.elevation_m || "?"} m
- Avg Gradient: ${formData.courseMeta.avgGradient || "?"}%
- CdA: ${formData.courseMeta.cda_m2 || "?"} m²
- Weight: ${formData.courseMeta.weight_kg || "?"} kg
- Drivetrain Loss: ${formData.courseMeta.drivetrain_loss_pct || "?"}%
- Target Performance: ${formData.primaryGoal.targetObjective || "N/A"}
`
      : "";

    const historyContext = `
Historical Training Pattern:
- Dominant Model: ${historicalAnalysis.dominantModel}
- Z1: ${historicalAnalysis.z1Pct?.toFixed(1) || 0}%
- Z2: ${historicalAnalysis.z2Pct?.toFixed(1) || 0}%
- Z3: ${historicalAnalysis.z3Pct?.toFixed(1) || 0}%
- Z4: ${historicalAnalysis.z4Pct?.toFixed(1) || 0}%
- Evidence: ${historicalAnalysis.evidence}
- Blocks: ${historicalAnalysis.blockStructure.map(b => `${b.type} (${b.weeks}w)`).join(", ") || "N/A"}
`;

    const periodizationContext = `
Plan Structure:
- Style: ${formData.periodizationStyle || "auto"}
- Block Length: ${formData.blockLength || "auto"} weeks
- Start Date: ${startDate.toISOString().split("T")[0]}
- Event Date: ${eventDate.toISOString().split("T")[0]}
- Total Weeks: ${totalWeeks}
Adaptation Policy:
- TLI Tolerance: ±${formData.deviationTolerance?.tli || 20}%
- Duration Tolerance: ±${formData.deviationTolerance?.duration || 20}%
`;

    const prompt = `
You are a world-class endurance training plan architect.
Generate a structured ${totalWeeks}-week plan for the athlete.

${athleteContext}
${availabilityContext}
${courseContext}
${historyContext}
${periodizationContext}

Requirements:
1. Use historical model as a bias if clear, else choose based on goal.
2. Respect availability and tolerances.
3. Progressive overload, appropriate recovery & taper.
4. Output only valid JSON in the following format:
{
  "blocks": [
    {
      "name": "Base",
      "weeks": 4,
      "intent": "Aerobic development",
      "sessions": [
        {
          "name": "Long Endurance",
          "day": "Sunday",
          "duration": 180,
          "tss": 150,
          "structure": {
            "intervals": [
              { "duration": 180, "target": "65%", "zone": "Z2" }
            ]
          },
          "intent": "Build aerobic base"
        }
      ]
    }
  ]
}
`;

    // 6️⃣ Call LLM
    const aiResult = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a world-class endurance training plan architect. Output only valid JSON. No markdown, no commentary.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: -1,
        stream: false,
      }),
    });

    if (!aiResult.ok) {
      const errorText = await aiResult.text();
      console.error("❌ LLM Error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResult.json();
    let content = aiData.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(content);

    console.log("✅ AI Plan Generated. Blocks:", aiResponse.blocks?.length || 0);

    // 7️⃣ Store in DB (same as your previous logic)
    const planName = `${formData.primaryGoal.eventName || "Training Plan"} - ${eventDate.toLocaleDateString()}`;
    const { data: plan, error: planError } = await supabase
      .from("training_plans")
      .insert({
        user_id: user.id,
        sport_mode: formData.sportMode || "cycling",
        plan_name: planName,
        goal_event_name: formData.primaryGoal.eventName,
        goal_event_date: eventDate.toISOString().split("T")[0],
        goal_event_type: formData.primaryGoal.eventType,
        start_date: startDate.toISOString().split("T")[0],
        end_date: eventDate.toISOString().split("T")[0],
        periodization_style: formData.periodizationStyle || "auto",
        total_weeks: totalWeeks,
        sessions_per_week: formData.sessionsPerWeek || 5,
        weekly_tli_target: formData.weeklyTLI,
      })
      .select()
      .single();

    if (planError) throw planError;

    let currentDate = new Date(startDate);
    let sessionCount = 0;

    for (const [blockIndex, block] of (aiResponse.blocks || []).entries()) {
      const blockStartDate = new Date(currentDate);
      const blockEndDate = new Date(
        currentDate.getTime() + (block.weeks || 3) * 7 * 24 * 60 * 60 * 1000
      );

      const { data: dbBlock, error: blockError } = await supabase
        .from("plan_blocks")
        .insert({
          plan_id: plan.id,
          block_name: block.name || `Block ${blockIndex + 1}`,
          block_intent: block.intent || "Training block",
          start_date: blockStartDate.toISOString().split("T")[0],
          end_date: blockEndDate.toISOString().split("T")[0],
          week_count: block.weeks || 3,
          block_order: blockIndex,
        })
        .select()
        .single();

      if (blockError) throw blockError;

      for (let week = 0; week < (block.weeks || 3); week++) {
        for (const session of block.sessions || []) {
          const sessionDate = new Date(blockStartDate);
          const dayMap: Record<string, number> = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
            Sunday: 0,
          };
          const targetDay = dayMap[session.day] || 1;
          const currentDay = sessionDate.getDay();
          const daysToAdd = (targetDay - currentDay + 7) % 7;
          sessionDate.setDate(sessionDate.getDate() + daysToAdd + week * 7);

          const { error: sessionError } = await supabase
            .from("plan_sessions")
            .insert({
              block_id: dbBlock.id,
              scheduled_date: sessionDate.toISOString().split("T")[0],
              session_name: session.name || "Session",
              session_structure: session.structure || {},
              session_intent: session.intent || "",
              tss_target: session.tss || 100,
              duration_minutes: session.duration || 60,
            });

          if (!sessionError) sessionCount++;
        }
      }
      currentDate = blockEndDate;
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          id: plan.id,
          name: planName,
          totalWeeks,
          blockCount: aiResponse.blocks?.length || 0,
          sessionCount,
          startDate: startDate.toISOString().split("T")[0],
          endDate: eventDate.toISOString().split("T")[0],
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error in generate-ai-plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** 🧠 Analyze training history to classify training model & block structure */
function analyzeTrainingHistory(recentHistory: any[], lab: any) {
  if (!recentHistory || recentHistory.length === 0) {
    return { dominantModel: "auto", evidence: "No history", blockStructure: [] };
  }

  let totalZ1 = 0, totalZ2 = 0, totalZ3 = 0, totalZ4 = 0;
  for (const s of recentHistory) {
    totalZ1 += s.z1_tli || 0;
    totalZ2 += s.z2_tli || 0;
    totalZ3 += s.z3_tli || 0;
    totalZ4 += s.z4_tli || 0;
  }

  const total = totalZ1 + totalZ2 + totalZ3 + totalZ4;
  if (total === 0) return { dominantModel: "auto", evidence: "No TLI data", blockStructure: [] };

  const z1Pct = (totalZ1 / total) * 100;
  const z2Pct = (totalZ2 / total) * 100;
  const z3Pct = (totalZ3 / total) * 100;
  const z4Pct = (totalZ4 / total) * 100;

  let dominantModel = "auto", evidence = "";
  if (z1Pct >= 70 && (z3Pct + z4Pct) >= 10 && z2Pct < 20) {
    dominantModel = "polarized";
    evidence = `Z1 ${z1Pct.toFixed(1)}%, Z3+4 ${(z3Pct+z4Pct).toFixed(1)}%`;
  } else if (z1Pct >= 50 && z2Pct >= 25 && z3Pct + z4Pct <= 25) {
    dominantModel = "pyramidal";
    evidence = `Z1 ${z1Pct.toFixed(1)}%, Z2 ${z2Pct.toFixed(1)}%`;
  } else if (z2Pct >= 40) {
    dominantModel = "threshold";
    evidence = `Z2 ${z2Pct.toFixed(1)}%`;
  }

  // simple TSS trend
  const sorted = [...recentHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const weeks: number[] = [];
  let currentWeekKey = "";
  let tssSum = 0;

  for (const s of sorted) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + (d.getDay()||7))/7)}`;
    if (currentWeekKey && key !== currentWeekKey) {
      weeks.push(tssSum);
      tssSum = 0;
    }
    tssSum += s.tss || 0;
    currentWeekKey = key;
  }
  if (tssSum > 0) weeks.push(tssSum);

  const blockStructure: { type: string; weeks: number }[] = [];
  if (weeks.length >= 6) {
    const avgFirst = avg(weeks.slice(0, Math.floor(weeks.length/3)));
    const avgMid = avg(weeks.slice(Math.floor(weeks.length/3), Math.floor(2*weeks.length/3)));
    const avgLast = avg(weeks.slice(Math.floor(2*weeks.length/3)));

    if (avgMid > avgFirst * 1.2) blockStructure.push({ type: "Base→Build", weeks: Math.floor(weeks.length * 2/3) });
    if (avgLast < avgMid * 0.85) blockStructure.push({ type: "Taper", weeks: Math.floor(weeks.length/3) });
  }

  return { dominantModel, evidence, z1Pct, z2Pct, z3Pct, z4Pct, blockStructure };
}

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
