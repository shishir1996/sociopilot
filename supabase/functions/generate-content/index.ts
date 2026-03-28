import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_id } = await req.json();
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .eq("user_id", user.id)
      .single();

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing plan count
    const { count } = await supabase
      .from("content_plans")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);

    const weekNumber = (count || 0) + 1;

    const systemPrompt = `You are an AI Content Growth Manager. Generate a 7-day social media content plan.
Return ONLY a valid JSON object with this exact structure:
{
  "strategy_summary": "Brief strategy for this week",
  "days": [
    {
      "day_number": 1,
      "content_theme": "Theme",
      "content_goal": "Goal",
      "primary_platform": "Platform name",
      "secondary_platforms": ["Platform2"],
      "content_type": "Carousel|Reel|Image|Text",
      "topic": "Post topic",
      "hook": "Scroll-stopping hook",
      "pain_point": "Audience pain point addressed",
      "core_message": "Key message",
      "cta": "Call to action",
      "posting_time": "10:00 AM",
      "why_it_matters": "Why this post matters for growth",
      "caption": "Full ready-to-post caption (150-300 words)",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "image_prompt": "Detailed AI image generation prompt",
      "visual_style": "Visual direction for the creative",
      "repurposing_suggestion": "How to repurpose this for other platforms"
    }
  ]
}
Generate exactly 7 days. Make content diverse: mix educational, trust-building, promotional, engagement, authority, local visibility, and conversion posts. Every caption must be complete and ready to copy-paste. Hashtags should be relevant and a mix of broad and niche.`;

    const userPrompt = `Generate a Week ${weekNumber} content plan for:
Business: ${business.name}
Industry: ${business.industry || "General"}
Products/Services: ${business.products_services || "Not specified"}
Location: ${business.location || "Global"}
Target Audience: ${business.target_audience || "General audience"}
Goals: ${(business.goals || []).join(", ") || "Brand awareness"}
Brand Tone: ${business.brand_tone || "Professional"}
Platforms: ${(business.platforms || []).join(", ") || "Instagram, Facebook, LinkedIn"}
Content Types: ${(business.content_types || []).join(", ") || "Mixed"}
Content Style: ${business.content_style || "Balanced"}
Main Offers: ${business.main_offers || "Not specified"}
Competitors: ${business.competitors || "Not specified"}

Important: Make this week fresh and different from previous weeks. Focus on content that drives ${(business.posting_goals || ["engagement"]).join(", ")}.`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_content_plan",
            description: "Create a 7-day content plan",
            parameters: {
              type: "object",
              properties: {
                strategy_summary: { type: "string" },
                days: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      day_number: { type: "number" },
                      content_theme: { type: "string" },
                      content_goal: { type: "string" },
                      primary_platform: { type: "string" },
                      secondary_platforms: { type: "array", items: { type: "string" } },
                      content_type: { type: "string" },
                      topic: { type: "string" },
                      hook: { type: "string" },
                      pain_point: { type: "string" },
                      core_message: { type: "string" },
                      cta: { type: "string" },
                      posting_time: { type: "string" },
                      why_it_matters: { type: "string" },
                      caption: { type: "string" },
                      hashtags: { type: "array", items: { type: "string" } },
                      image_prompt: { type: "string" },
                      visual_style: { type: "string" },
                      repurposing_suggestion: { type: "string" },
                    },
                    required: ["day_number", "content_theme", "content_goal", "primary_platform", "content_type", "topic", "hook", "caption", "cta"],
                  },
                },
              },
              required: ["strategy_summary", "days"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_content_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const plan = JSON.parse(toolCall.function.arguments);

    // Create the content plan
    const { data: newPlan, error: planError } = await supabase
      .from("content_plans")
      .insert({
        business_id,
        user_id: user.id,
        week_start: new Date().toISOString().split("T")[0],
        week_number: weekNumber,
        strategy_summary: plan.strategy_summary,
        status: "draft",
      })
      .select()
      .single();

    if (planError) throw planError;

    // Insert content items
    const items = plan.days.map((day: any) => ({
      plan_id: newPlan.id,
      user_id: user.id,
      day_number: day.day_number,
      content_theme: day.content_theme,
      content_goal: day.content_goal || "",
      primary_platform: day.primary_platform || "",
      secondary_platforms: day.secondary_platforms || [],
      content_type: day.content_type,
      topic: day.topic,
      hook: day.hook || "",
      pain_point: day.pain_point || "",
      core_message: day.core_message || "",
      cta: day.cta || "",
      posting_time: day.posting_time || "",
      why_it_matters: day.why_it_matters || "",
      caption: day.caption || "",
      hashtags: day.hashtags || [],
      image_prompt: day.image_prompt || "",
      visual_style: day.visual_style || "",
      repurposing_suggestion: day.repurposing_suggestion || "",
      status: "draft",
    }));

    const { error: itemsError } = await supabase.from("content_items").insert(items);
    if (itemsError) throw itemsError;

    return new Response(JSON.stringify({ success: true, plan_id: newPlan.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
