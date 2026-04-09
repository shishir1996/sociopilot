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
      platform, image_style, brand_name, product_details, offer_message,
      main_text, secondary_text, cta_text, color_preference, audience_type,
      design_mood, prompt_details, aspect_ratio, num_images, business_id,
    } = body;

    // Check feature flags
    const { data: flags } = await supabaseAdmin
      .from("ai_feature_flags")
      .select("enabled")
      .eq("feature_key", "image_gen_enabled")
      .single();
    if (flags && !flags.enabled) {
      return new Response(JSON.stringify({ error: "Image generation is currently disabled by admin." }), {
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
        .eq("generation_type", "image")
        .eq("status", "success")
        .gte("created_at", monthStart);
      if ((count || 0) >= planLimits.image_generations_limit) {
        return new Response(JSON.stringify({
          error: `Monthly image generation limit reached (${planLimits.image_generations_limit}). Upgrade your plan for more.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get active image provider
    const { data: provider } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("*")
      .eq("provider_type", "image")
      .eq("is_active", true)
      .limit(1)
      .single();

    const modelName = provider?.model_name || "google/gemini-3.1-flash-image-preview";

    // Get image prompt template
    const { data: promptTemplate } = await supabaseAdmin
      .from("ai_prompt_templates")
      .select("*")
      .eq("template_type", "image_prompt")
      .eq("is_active", true)
      .limit(1)
      .single();

    // Build image prompt
    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024 square",
      "4:5": "1080x1350 portrait",
      "16:9": "1920x1080 landscape",
      "9:16": "1080x1920 vertical/story",
    };

    let imagePrompt = promptTemplate?.system_prompt
      ? `${promptTemplate.system_prompt}\n\n`
      : "";

    imagePrompt += `Create a ${image_style || "modern"} social media image for ${platform || "Instagram"}.
Brand: ${brand_name || "Not specified"}
Product/Service: ${product_details || "Not specified"}
Offer/Message: ${offer_message || "Not specified"}
Main Text on Image: ${main_text || "None"}
${secondary_text ? `Secondary Text: ${secondary_text}` : ""}
${cta_text ? `CTA Text: ${cta_text}` : ""}
Color Preference: ${color_preference || "Brand colors"}
Audience: ${audience_type || "General"}
Mood: ${design_mood || "Professional"}
Aspect Ratio: ${sizeMap[aspect_ratio] || "1024x1024 square"}
${prompt_details ? `Additional Details: ${prompt_details}` : ""}

The image should be visually striking, on-brand, and optimized for social media engagement. Make it look like a professional design, not AI-generated stock art.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI API key not configured");

    const count = Math.min(num_images || 1, 4);
    const outputUrls: string[] = [];

    for (let i = 0; i < count; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (aiResponse.status === 429) {
        if (outputUrls.length > 0) break;
        return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const parts = aiData.choices?.[0]?.message?.content;

      let base64Data: string | null = null;
      if (Array.isArray(parts)) {
        const imgPart = parts.find((p: any) => p.type === "image_url");
        if (imgPart?.image_url?.url) {
          base64Data = imgPart.image_url.url.replace(/^data:image\/\w+;base64,/, "");
        }
      }

      if (base64Data) {
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `ai-studio/${user.id}/${crypto.randomUUID()}.png`;
        await supabaseAdmin.storage.from("content-images").upload(fileName, bytes, {
          contentType: "image/png", upsert: false,
        });
        const { data: urlData } = supabaseAdmin.storage.from("content-images").getPublicUrl(fileName);
        outputUrls.push(urlData.publicUrl);
      }
    }

    const responseTimeMs = Date.now() - startTime;

    // Log usage
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: user.id,
      generation_type: "image",
      provider: provider?.provider_name || "lovable",
      model: modelName,
      prompt_input: imagePrompt.substring(0, 5000),
      output_result: JSON.stringify(outputUrls),
      status: "success",
      credits_used: count,
      response_time_ms: responseTimeMs,
    });

    // Save generation
    await supabaseAdmin.from("ai_image_generations").insert({
      user_id: user.id,
      business_id: business_id || null,
      platform: platform || null,
      image_style: image_style || null,
      input_params: body,
      output_urls: outputUrls,
      image_prompt_used: imagePrompt,
      provider: provider?.provider_name || "lovable",
      model: modelName,
      status: "completed",
    });

    return new Response(JSON.stringify({ images: outputUrls, prompt_used: imagePrompt, response_time_ms: responseTimeMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ai-generate-image error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
