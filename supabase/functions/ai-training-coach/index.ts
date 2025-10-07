import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🌐 Your ngrok tunnel (update if it changes)
const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";

// 🔐 Optional API key if you secure your local server
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";

// 🧠 Model assignments
const MODELS = {
  MIXTRAL: "mixtral-8x7b-instruct-v0.1",
  LLAMA: "meta-llama-3.1-8b-instruct",
  GEMMA: "gemma-3-4b-it",
  DEEPSEEK: "deepseek-math-7b-instruct",
} as const;

// =========================
// 🧭 Standardized Zone Model
// =========================
const ZONE_MODEL = `
Use this 4-zone intensity model for ALL training outputs unless explicitly told otherwise:

- Zone 1: < AeT (Aerobic Threshold). Low-intensity; recovery & easy endurance.
- Zone 2: AeT → GT (Glycolytic Threshold). Steady aerobic, endurance/tempo.
- Zone 3: GT → MAP (Max Aerobic Power ≈ VO₂max power). High aerobic/threshold to VO₂max.
- Zone 4: > MAP. Supramaximal/anaerobic/neuromuscular.

Do not use Coggan 7-zone or other models. Refer explicitly to Zones 1–4.
`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Auth context for RLS
    supabaseClient.auth.setSession({
      access_token: authHeader.replace("Bearer ", ""),
      refresh_token: "",
    });

    const { task, context } = await req.json();

    // Defensive logging
    console.log("Incoming task/context:", {
      task,
      user_id: context?.user_id,
      sport_mode: context?.sport_mode,
    });

    const trainingContext = await getTrainingContext(
      supabaseClient,
      context.user_id,
      context.sport_mode,
    );

    let aiResponse: any;
    switch (task) {
      case "daily_recommendations":
        aiResponse = await getDailyRecommendations(trainingContext, context);
        break;
      case "chat_assistant":
        aiResponse = await getChatResponse(trainingContext, context);
        break;
      case "activity_analysis":
        aiResponse = await getActivityAnalysis(trainingContext, context);
        break;
      case "workout_generation":
        aiResponse = await generateWorkout(trainingContext, context);
        break;
      case "math_analysis":
        aiResponse = await runMathAnalysis(trainingContext, context);
        break;
      case "historical_analysis":
        aiResponse = await runHistoricalAnalysis(trainingContext, context);
        break;
      default:
        throw new Error(`Invalid task type: ${task}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: aiResponse,
