import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = "gemma-3-4b-it";
const SYSTEM_PROMPT = `You are a world-class endurance training plan architect with expertise in periodization, exercise physiology, and training load management.

ZONE DEFINITIONS (4-Zone Model):
- Z1 (Recovery): <70% FTP, conversational pace, aerobic adaptation
- Z2 (Endurance): 70-85% FTP, sustainable aerobic effort
- Z3 (Tempo/Threshold): 85-95% FTP, moderate lactate accumulation
- Z4 (VO2max/Anaerobic): 95-120% FTP, high intensity, limited duration

OUTPUT REQUIREMENTS:
1. Output ONLY valid JSON. No markdown code fences, no commentary, no preamble.
2. Use ONLY these day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
3. Every session MUST have: name, day, duration (minutes), tss, structure, intent
4. Session durations must respect daily availability limits provided in the prompt
5. Structure must include "intervals" array with duration, target, zone
6. Do not invent extra fields like "sessionTemplate" or "microcycles"

PLANNING PRINCIPLES:
- Progressive overload: gradually increase weekly TSS
- Recovery weeks: every 3-4 weeks reduce load by 30-50%
- Taper: 2-week taper before event (60% then 40% of peak load)
- Specificity: align intensity with event demands`;
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const formData = await req.json();
    console.log("🧠 Generating plan for user:", user.id);
    console.log("📊 Request params:", {
      sportMode: formData.sportMode,
      eventDate: formData.primaryGoal?.eventDate,
      periodizationStyle: formData.periodizationStyle,
      sessionsPerWeek: formData.sessionsPerWeek
    });
    // 1️⃣ Fetch athlete baseline data
    const [labResults, trainingHistory] = await Promise.all([
      supabase.from("lab_results").select("*").eq("user_id", user.id).eq("sport_mode", formData.sportMode || "cycling").order("created_at", {
        ascending: false
      }).limit(1).maybeSingle(),
      supabase.from("training_history").select("*").eq("user_id", user.id).eq("sport", formData.sportMode || "cycling").order("date", {
        ascending: false
      }).limit(90)
    ]);
    const lab = labResults.data;
    const recentHistory = trainingHistory.data || [];
    const recentCTL = recentHistory.length > 0 ? recentHistory[0].ctl || 0 : 0;
    const recentTSB = recentHistory.length > 0 ? recentHistory[0].tsb || 0 : 0;
    const avgWeeklyTSS = recentHistory.length > 0 ? recentHistory.slice(0, 28).reduce((sum, d)=>sum + (d.tss || 0), 0) / 4 : 0;
    console.log("📈 Athlete baseline:", {
      recentCTL,
      recentTSB,
      avgWeeklyTSS
    });
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
    const eventDate = formData.primaryGoal.eventDate ? new Date(formData.primaryGoal.eventDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const totalWeeks = Math.ceil((eventDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    console.log("📅 Plan timeline:", {
      startDate: startDate.toISOString().split("T")[0],
      eventDate: eventDate.toISOString().split("T")[0],
      totalWeeks
    });
    // 4️⃣ Build prompt sections
    const athleteContext = `
ATHLETE CONTEXT:
- Sport: ${formData.sportMode || "cycling"}
- FTP: ${ftp}W (${ftpSource})
- AeT: ${lab?.aet || "N/A"}W, GT: ${lab?.gt || "N/A"}W, MAP: ${lab?.map_value || "N/A"}W
- VO2max: ${lab?.vo2max || "N/A"}
- Current CTL: ${recentCTL.toFixed(1)}, TSB: ${recentTSB.toFixed(1)}
- Average Weekly TSS (last 4 weeks): ${avgWeeklyTSS.toFixed(0)}
`;
    // Parse weekly availability correctly
    const weeklyAvailability = formData.weeklyAvailability || {};
    const totalWeeklyHours = Object.values(weeklyAvailability).reduce((sum, day)=>sum + (day.training_hours || 0), 0);
    const weeklyScheduleString = Object.entries(weeklyAvailability).map(([day, data])=>{
      const hours = data.training_hours || 1;
      const times = data.preferred_training_times?.join(", ") || "flexible";
      return `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours}h (${times})`;
    }).join("\n");
    const availabilityContext = `
WEEKLY AVAILABILITY SCHEDULE:
${weeklyScheduleString}

Total Weekly Training Hours: ${totalWeeklyHours.toFixed(1)}h
Long Session Day: ${formData.longSessionDay || "Saturday"}
Target Weekly Sessions: ${formData.sessionsPerWeek || "Auto"}
Target Weekly TLI: ${formData.weeklyTLI || "Auto"}

⚠️ IMPORTANT: Respect these daily hour limits when scheduling sessions.
`;
    const courseContext = formData.courseMeta ? `
COURSE DETAILS:
- Distance: ${formData.courseMeta.distance_km || "?"} km
- Elevation: ${formData.courseMeta.elevation_m || "?"} m
- Avg Gradient: ${formData.courseMeta.avgGradient || "?"}%
- Target Performance: ${formData.primaryGoal.targetObjective || "N/A"}
` : "";
    const periodizationContext = `
PLAN STRUCTURE:
- Periodization Style: ${formData.periodizationStyle || "auto"}
- Block Length: ${formData.blockLength || "auto"} weeks
- Start Date: ${startDate.toISOString().split("T")[0]}
- Event Date: ${eventDate.toISOString().split("T")[0]}
- Total Weeks: ${totalWeeks}

ADAPTATION POLICY:
- TLI Tolerance: ±${formData.deviationTolerance?.tli || 20}%
- Duration Tolerance: ±${formData.deviationTolerance?.duration || 20}%
`;
    const prompt = `Generate a ${totalWeeks}-week training plan for the following athlete:

${athleteContext}
${availabilityContext}
${courseContext}
${periodizationContext}

REQUIRED OUTPUT FORMAT:
{
  "blocks": [
    {
      "name": "Base Build",
      "weeks": 4,
      "intent": "Build aerobic capacity and endurance",
      "sessions": [
        {
          "name": "Long Endurance Ride",
          "day": "Sunday",
          "duration": 180,
          "tss": 150,
          "structure": {
            "intervals": [
              { "duration": 180, "target": "65%", "zone": "Z2" }
            ]
          },
          "intent": "Sustained aerobic work"
        }
      ]
    }
  ]
}

Generate the complete plan now.`;
    console.log("📝 Prompt length:", prompt.length, "chars");
    console.log("🎯 LLM Config:", {
      url: LLM_URL,
      model: LLM_MODEL
    });
    // 5️⃣ Call LLM
    const llmStartTime = Date.now();
    console.log("🤖 Calling LLM...");
    const aiResult = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: -1,
        stream: false
      })
    });
    const llmDuration = Date.now() - llmStartTime;
    console.log(`✅ LLM responded in ${llmDuration}ms with status ${aiResult.status}`);
    if (!aiResult.ok) {
      const errorText = await aiResult.text();
      console.error("❌ LLM Error:", {
        status: aiResult.status,
        statusText: aiResult.statusText,
        body: errorText.substring(0, 500),
        duration: llmDuration,
        userId: user.id,
        sportMode: formData.sportMode
      });
      return new Response(JSON.stringify({
        error: "AI service unavailable"
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const aiData = await aiResult.json();
    let content = aiData.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(content);
    const totalSessions = aiResponse.blocks?.reduce((sum, b)=>sum + (b.sessions?.length || 0), 0) || 0;
    const planName = `${formData.primaryGoal.eventName || "Training Plan"} - ${eventDate.toLocaleDateString()}`;
    console.log("✅ AI Plan Generated:", {
      blockCount: aiResponse.blocks?.length || 0,
      totalSessions,
      planName
    });
    // 6️⃣ Store in DB
    const { data: plan, error: planError } = await supabase.from("training_plans").insert({
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
      weekly_tli_target: formData.weeklyTLI
    }).select().single();
    if (planError) throw planError;
    let currentDate = new Date(startDate);
    let sessionCount = 0;
    for (const [blockIndex, block] of (aiResponse.blocks || []).entries()){
      const blockStartDate = new Date(currentDate);
      const blockEndDate = new Date(currentDate.getTime() + (block.weeks || 3) * 7 * 24 * 60 * 60 * 1000);
      const { data: dbBlock, error: blockError } = await supabase.from("plan_blocks").insert({
        plan_id: plan.id,
        block_name: block.name || `Block ${blockIndex + 1}`,
        block_intent: block.intent || "Training block",
        start_date: blockStartDate.toISOString().split("T")[0],
        end_date: blockEndDate.toISOString().split("T")[0],
        week_count: block.weeks || 3,
        block_order: blockIndex
      }).select().single();
      if (blockError) throw blockError;
      for(let week = 0; week < (block.weeks || 3); week++){
        for (const session of block.sessions || []){
          // Validate session before insertion
          const validation = validateSession(session, Object.keys(weeklyAvailability));
          if (!validation.valid) {
            console.warn(`⚠️ Invalid session skipped:`, validation.errors, session);
            continue;
          }
          const dayMap = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
            Sunday: 0
          };
          // Always start block on Monday and map sessions relative to that
          const targetDayIndex = dayMap[session.day] ?? 1;
          const weekOffset = week * 7;
          const dayOffset = (targetDayIndex - 1 + 7) % 7; // Monday = 1 baseline
          const sessionDate = new Date(blockStartDate);
          sessionDate.setDate(sessionDate.getDate() + weekOffset + dayOffset);

          const { error: sessionError } = await supabase.from("plan_sessions").insert({
            block_id: dbBlock.id,
            scheduled_date: sessionDate.toISOString().split("T")[0],
            session_name: session.name || "Session",
            session_structure: session.structure || {},
            session_intent: session.intent || "",
            tss_target: session.tss || 100,
            duration_minutes: session.duration || 60
          });
          if (!sessionError) sessionCount++;
        }
      }
      currentDate = blockEndDate;
    }
    return new Response(JSON.stringify({
      success: true,
      plan: {
        id: plan.id,
        name: planName,
        totalWeeks,
        blockCount: aiResponse.blocks?.length || 0,
        sessionCount,
        startDate: startDate.toISOString().split("T")[0],
        endDate: eventDate.toISOString().split("T")[0]
      }
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("❌ Error in generate-ai-plan:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
/** Validate session data before DB insertion */ function validateSession(session, availableDays) {
  const errors = [];
  const validDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];
  if (!session.name || typeof session.name !== 'string') {
    errors.push("Missing or invalid session name");
  }
  if (!session.day || !validDays.includes(session.day)) {
    errors.push(`Invalid day: ${session.day}. Must be one of: ${validDays.join(", ")}`);
  }
  if (!session.duration || session.duration < 1 || session.duration > 720) {
    errors.push(`Invalid duration: ${session.duration}. Must be between 1-720 minutes`);
  }
  if (!session.tss || session.tss < 1) {
    errors.push(`Invalid TSS: ${session.tss}`);
  }
  if (!session.structure || !session.structure.intervals || !Array.isArray(session.structure.intervals)) {
    errors.push("Missing or invalid structure.intervals");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
