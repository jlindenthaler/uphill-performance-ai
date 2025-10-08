import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🌐 Local LLM endpoint (must match ai-training-coach)
const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "placeholder_key";
const LLM_MODEL = "mixtral-8x7b-instruct-v0.1";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.json();
    console.log('Generating plan for user:', user.id, 'with data:', {
      goal: formData.primaryGoal,
      sportMode: formData.sportMode || 'cycling',
    });

    // Fetch athlete baseline
    const [labResults, trainingHistory, goals] = await Promise.all([
      supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_mode', formData.sportMode || 'cycling')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('training_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', formData.sportMode || 'cycling')
        .order('date', { ascending: false })
        .limit(90),
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
    ]);

    const lab = labResults.data;
    const recentHistory = trainingHistory.data || [];
    
    // Calculate baseline metrics
    const recentCTL = recentHistory.length > 0 
      ? recentHistory[0].ctl || 0 
      : 0;
    const recentTSB = recentHistory.length > 0 
      ? recentHistory[0].tsb || 0 
      : 0;
    const avgWeeklyTSS = recentHistory.length > 0
      ? recentHistory.slice(0, 28).reduce((sum, d) => sum + (d.tss || 0), 0) / 4
      : 0;

    // Determine FTP/threshold
    let ftp = formData.primaryGoal.targetPower || 250;
    let ftpSource = 'user_input';
    if (lab) {
      if (lab.vt2_power) {
        ftp = lab.vt2_power;
        ftpSource = 'lab_vt2';
      } else if (lab.lt2_power) {
        ftp = lab.lt2_power;
        ftpSource = 'lab_lt2';
      } else if (lab.critical_power) {
        ftp = lab.critical_power;
        ftpSource = 'lab_cp';
      } else if (lab.map_value) {
        ftp = lab.map_value * 0.95;
        ftpSource = 'lab_map_est';
      }
    }

    // Calculate plan duration
    const startDate = formData.startWeek ? new Date(formData.startWeek) : new Date();
    const eventDate = formData.primaryGoal.eventDate ? new Date(formData.primaryGoal.eventDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const totalWeeks = Math.ceil((eventDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Generate blocks structure
    const blocks = generateBlockStructure(totalWeeks, formData.periodizationStyle || 'auto');

    // Build AI prompt
    const prompt = `You are a world-class endurance training plan architect specializing in scientific periodization.

Generate a structured ${totalWeeks}-week training plan for the following athlete:

**Athlete Context:**
- Sport: ${formData.sportMode || 'cycling'}
- Current FTP/Threshold: ${ftp}W (source: ${ftpSource})
- Current CTL: ${recentCTL.toFixed(1)}
- Current TSB: ${recentTSB.toFixed(1)}
- Recent weekly TSS: ${avgWeeklyTSS.toFixed(0)}
- Thresholds: AeT ${lab?.aet || 'N/A'}W, GT ${lab?.gt || 'N/A'}W, MAP ${lab?.map_value || 'N/A'}W

**Goal:**
- Event: ${formData.primaryGoal.eventName || 'Peak Performance'}
- Date: ${eventDate.toLocaleDateString()}
- Type: ${formData.primaryGoal.eventType || 'endurance'}
- Target: ${formData.primaryGoal.targetObjective || 'performance'}

**Availability:**
- Days per week: ${formData.sessionsPerWeek || 5}
- Target weekly TLI: ${formData.weeklyTLI || 400}
- Long session day: ${formData.longSessionDay || 'Saturday'}

**Plan Structure:**
Use ${formData.periodizationStyle || 'polarized'} approach with these blocks:
${blocks.map(b => `- ${b.name} (${b.weeks} weeks): ${b.intent}`).join('\n')}

**Requirements:**
1. Respect ${formData.deviationTolerance?.tli || 10}% TLI tolerance
2. Balance intensity distribution based on periodization style
3. Build progressively from current fitness
4. Include proper recovery weeks
5. Taper appropriately for event date

Generate ONLY valid JSON in this exact format:
{
  "blocks": [
    {
      "name": "Base",
      "intent": "Aerobic foundation and muscular endurance",
      "weeks": 4,
      "sessions": [
        {
          "name": "Long Endurance",
          "day": "Saturday",
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
}`;

    console.log('Calling LOCAL LLM with prompt length:', prompt.length);
    console.log('LLM Endpoint:', LLM_URL);

    // Call LOCAL LLM to generate plan (NO FALLBACK)
    let aiResponse;
    try {
      const llmStartTime = Date.now();
      console.log('🚀 Sending request to local LLM...');
      
      const aiResult = await fetch(LLM_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: 'You are a world-class endurance training coach and plan architect. Analyze the athlete data deeply and generate a progressive, personalized training plan. Output ONLY valid JSON, no markdown, no explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: -1,
          stream: false,
        }),
      });

      const llmDuration = Date.now() - llmStartTime;
      console.log(`⏱️ LLM responded in ${llmDuration}ms with status:`, aiResult.status);

      if (!aiResult.ok) {
        const errorText = await aiResult.text();
        console.error('❌ LLM API error:', {
          status: aiResult.status,
          statusText: aiResult.statusText,
          error: errorText,
          url: LLM_URL,
          model: LLM_MODEL,
        });
        
        // Return user-friendly error - NO FALLBACK
        return new Response(
          JSON.stringify({ 
            error: 'I am currently unavailable, please try again later',
            details: 'AI service connection failed',
          }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const aiData = await aiResult.json();
      const content = aiData.choices?.[0]?.message?.content || '{}';
      console.log('✅ AI response received, length:', content.length);
      console.log('AI response preview:', content.substring(0, 200));
      
      // Clean up markdown if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      aiResponse = JSON.parse(cleanContent);
      console.log('✅ Parsed AI response, blocks:', aiResponse.blocks?.length || 0);
      
    } catch (llmError) {
      console.error('❌ LLM call failed:', {
        error: llmError instanceof Error ? llmError.message : String(llmError),
        stack: llmError instanceof Error ? llmError.stack : undefined,
        url: LLM_URL,
      });
      
      // Return user-friendly error - NO FALLBACK
      return new Response(
        JSON.stringify({ 
          error: 'I am currently unavailable, please try again later',
          details: llmError instanceof Error ? llmError.message : 'Unknown error',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Generated blocks:', aiResponse.blocks?.length || 0);

    // Store plan in database
    const planName = `${formData.primaryGoal.eventName || 'Training Plan'} - ${eventDate.toLocaleDateString()}`;
    
    const { data: plan, error: planError } = await supabase
      .from('training_plans')
      .insert({
        user_id: user.id,
        sport_mode: formData.sportMode || 'cycling',
        plan_name: planName,
        goal_event_name: formData.primaryGoal.eventName,
        goal_event_date: eventDate.toISOString().split('T')[0],
        goal_event_type: formData.primaryGoal.eventType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: eventDate.toISOString().split('T')[0],
        periodization_style: formData.periodizationStyle || 'auto',
        total_weeks: totalWeeks,
        sessions_per_week: formData.sessionsPerWeek || 5,
        weekly_tli_target: formData.weeklyTLI,
      })
      .select()
      .single();

    if (planError) {
      console.error('Plan creation error:', planError);
      throw planError;
    }

    console.log('Plan created:', plan.id);

    // Store blocks and sessions
    let currentDate = new Date(startDate);
    let sessionCount = 0;

    for (let blockIndex = 0; blockIndex < (aiResponse.blocks || []).length; blockIndex++) {
      const block = aiResponse.blocks[blockIndex];
      const blockStartDate = new Date(currentDate);
      const blockEndDate = new Date(currentDate.getTime() + (block.weeks || 3) * 7 * 24 * 60 * 60 * 1000);

      const { data: dbBlock, error: blockError } = await supabase
        .from('plan_blocks')
        .insert({
          plan_id: plan.id,
          block_name: block.name || `Block ${blockIndex + 1}`,
          block_intent: block.intent || 'Training block',
          start_date: blockStartDate.toISOString().split('T')[0],
          end_date: blockEndDate.toISOString().split('T')[0],
          week_count: block.weeks || 3,
          block_order: blockIndex,
        })
        .select()
        .single();

      if (blockError) {
        console.error('Block creation error:', blockError);
        throw blockError;
      }

      // Create sessions for this block
      const sessions = block.sessions || [];
      const weeksInBlock = block.weeks || 3;
      
      for (let week = 0; week < weeksInBlock; week++) {
        for (const session of sessions) {
          const sessionDate = new Date(blockStartDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
          
          // Map day to date
          const dayMap: Record<string, number> = {
            'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
            'Friday': 5, 'Saturday': 6, 'Sunday': 0
          };
          const targetDay = dayMap[session.day] || 1;
          const currentDay = sessionDate.getDay();
          const daysToAdd = (targetDay - currentDay + 7) % 7;
          sessionDate.setDate(sessionDate.getDate() + daysToAdd);

          const { error: sessionError } = await supabase
            .from('plan_sessions')
            .insert({
              block_id: dbBlock.id,
              scheduled_date: sessionDate.toISOString().split('T')[0],
              session_name: session.name || 'Training Session',
              session_structure: session.structure || {},
              session_intent: session.intent || '',
              tss_target: session.tss || 100,
              duration_minutes: session.duration || 60,
            });

          if (sessionError) {
            console.error('Session creation error:', sessionError);
          } else {
            sessionCount++;
          }
        }
      }

      currentDate = blockEndDate;
    }

    console.log('Plan complete. Total sessions:', sessionCount);

    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          id: plan.id,
          name: planName,
          totalWeeks,
          blockCount: aiResponse.blocks?.length || 0,
          sessionCount,
          startDate: startDate.toISOString().split('T')[0],
          endDate: eventDate.toISOString().split('T')[0],
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-ai-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateBlockStructure(totalWeeks: number, style: string) {
  if (totalWeeks < 8) {
    return [
      { name: 'Build', weeks: totalWeeks - 2, intent: 'Build fitness and intensity tolerance' },
      { name: 'Taper', weeks: 2, intent: 'Freshen and sharpen for event' },
    ];
  } else if (totalWeeks < 16) {
    return [
      { name: 'Base', weeks: Math.floor(totalWeeks * 0.3), intent: 'Aerobic foundation and endurance' },
      { name: 'Build', weeks: Math.floor(totalWeeks * 0.5), intent: 'Intensity and race-specific work' },
      { name: 'Taper', weeks: Math.ceil(totalWeeks * 0.2), intent: 'Recovery and sharpening' },
    ];
  } else {
    return [
      { name: 'Base', weeks: Math.floor(totalWeeks * 0.35), intent: 'Aerobic foundation and muscular endurance' },
      { name: 'Build 1', weeks: Math.floor(totalWeeks * 0.25), intent: 'Threshold and tempo work' },
      { name: 'Build 2', weeks: Math.floor(totalWeeks * 0.25), intent: 'VO2max and race specificity' },
      { name: 'Taper', weeks: Math.ceil(totalWeeks * 0.15), intent: 'Freshen and maintain sharpness' },
    ];
  }
}

// Fallback plan generation removed - user wants error message only if LLM fails
