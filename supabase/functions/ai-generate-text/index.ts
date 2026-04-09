import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      platform, content_type, brand_name, niche, target_audience, goal,
      tone, offer_details, keywords, content_length, language, emojis,
      cta_preference, hashtag_preference, additional_instructions,
      variations_count, brand_preset_id, business_id,
    } = body;

    // Check feature flags
    const { data: flags } = await supabaseAdmin
      .from("ai_feature_flags")
      .select("enabled")
      .eq("feature_key", "text_gen_enabled")
      .single();
    if (flags && !flags.enabled) {
      return new Response(JSON.stringify({ error: "Text generation is currently disabled by admin." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check usage limits
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_name")
      .eq("user_id", user.id)
      .single();
    const planName = subscription?.plan_name || "basic";

    const { data: planLimits } = await supabaseAdmin
      .from("ai_plan_limits")
      .select("*")
      .eq("plan_name", planName)
      .single();

    if (planLimits) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabaseAdmin
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("generation_type", "text")
        .eq("status", "success")
        .gte("created_at", monthStart);
      if ((count || 0) >= planLimits.text_generations_limit) {
        return new Response(JSON.stringify({
          error: `Monthly text generation limit reached (${planLimits.text_generations_limit}). Upgrade your plan for more.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get active text provider
    const { data: provider } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("*")
      .eq("provider_type", "text")
      .eq("is_active", true)
      .limit(1)
      .single();

    // Get prompt template
    const { data: promptTemplate } = await supabaseAdmin
      .from("ai_prompt_templates")
      .select("*")
      .eq("template_type", content_type || "caption")
      .eq("is_active", true)
      .limit(1)
      .single();

    // Get brand preset if selected
    let brandPreset: any = null;
    if (brand_preset_id) {
      const { data } = await supabaseAdmin
        .from("ai_brand_presets")
        .select("*")
        .eq("id", brand_preset_id)
        .single();
      brandPreset = data;
    }

    // Build system prompt
    const modelName = provider?.model_name || "google/gemini-3-flash-preview";
    const temperature = provider?.temperature || 0.7;
    const maxTokens = provider?.max_tokens || 2048;

    const numVariations = variations_count || 3;

    let systemPrompt = promptTemplate?.system_prompt || `You are an expert social media content creator and copywriter. You craft engaging, platform-optimized content that drives results.`;

    if (promptTemplate?.hidden_instructions) {
      systemPrompt += `\n\n${promptTemplate.hidden_instructions}`;
    }

    // Brand preset injection
    if (brandPreset) {
      systemPrompt += `\n\nBRAND CONTEXT:\n- Brand Voice: ${brandPreset.brand_voice}\n- Tone: ${brandPreset.tone}\n- CTA Style: ${brandPreset.cta_style}\n- Post Structure: ${brandPreset.post_structure}\n- Target Audience: ${brandPreset.audience_profile}\n- Default Hashtags: ${(brandPreset.default_hashtags || []).join(", ")}`;
    }

    // Platform formatting
    const platformFormats: Record<string, string> = {
      instagram: "Max 2200 chars. Use line breaks. Emojis welcome. Hashtags at end (up to 30).",
      facebook: "Conversational tone. 1-3 paragraphs. Link-friendly. Minimal hashtags.",
      linkedin: "Professional but human. Use line breaks for readability. 1300 char sweet spot. 3-5 hashtags.",
      twitter: "Max 280 chars. Punchy and concise. 1-2 hashtags max.",
      youtube: "Title (60 chars), Description (first 2 lines critical), Tags.",
      threads: "Conversational, short paragraphs. Similar to Twitter but longer allowed.",
    };

    const userPrompt = `Generate ${numVariations} ${content_type || "caption"} variation(s) for ${platform || "Instagram"}.

CONTEXT:
- Brand/Business: ${brand_name || "Not specified"}
- Niche/Industry: ${niche || "General"}
- Target Audience: ${target_audience || "General audience"}
- Goal: ${goal || "Engagement"}
- Tone: ${tone || "Professional yet friendly"}
- Offer/Product: ${offer_details || "Not specified"}
- Keywords: ${keywords || "None"}
- Content Length: ${content_length || "Medium"}
- Language: ${language || "English"}
- Emojis: ${emojis || "Minimal"}
- CTA: ${cta_preference || "Soft CTA"}
- Hashtags: ${hashtag_preference || "Include"}
${additional_instructions ? `- Additional Instructions: ${additional_instructions}` : ""}

PLATFORM FORMAT: ${platformFormats[platform?.toLowerCase()] || "Standard social media format."}

Return a JSON object with this exact structure:
{
  "variations": [
    {
      "title": "Short descriptive title",
      "content": "The main caption/post content",
      "cta": "Call-to-action line",
      "hashtags": ["hashtag1", "hashtag2"],
      "engagement_score": "high/medium/low",
      "best_for": "engagement/ads/branding",
      "character_count": 123
    }
  ]
}`;

    // Call AI
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI API key not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let variations: any[] = [];
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        variations = parsed.variations || [parsed];
      }
    } catch {
      variations = [{ title: "Generated Content", content: rawContent, cta: "", hashtags: [], engagement_score: "medium", best_for: "engagement", character_count: rawContent.length }];
    }

    const responseTimeMs = Date.now() - startTime;

    // Log usage
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: user.id,
      generation_type: "text",
      provider: provider?.provider_name || "lovable",
      model: modelName,
      prompt_input: userPrompt.substring(0, 5000),
      output_result: JSON.stringify(variations).substring(0, 10000),
      status: "success",
      credits_used: 1,
      response_time_ms: responseTimeMs,
    });

    // Save generation
    await supabaseAdmin.from("ai_text_generations").insert({
      user_id: user.id,
      business_id: business_id || null,
      platform: platform || null,
      content_type: content_type || null,
      input_params: body,
      output_variations: variations,
      brand_preset_id: brand_preset_id || null,
      provider: provider?.provider_name || "lovable",
      model: modelName,
      status: "completed",
    });

    return new Response(JSON.stringify({ variations, response_time_ms: responseTimeMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    console.error("ai-generate-text error:", error);

    // Log failure
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const uc = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: { user } } = await uc.auth.getUser();
        if (user) {
          await supabaseAdmin.from("ai_usage_logs").insert({
            user_id: user.id, generation_type: "text", status: "error",
            error_message: error.message, response_time_ms: responseTimeMs,
          });
        }
      }
    } catch {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
