import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ==================== IMAGE PROVIDER ADAPTERS ====================
interface ImageAdapter {
  generate(apiKey: string, model: string, prompt: string, opts: any): Promise<{ base64?: string; url?: string }>;
}

const lovableImageAdapter: ImageAdapter = {
  async generate(apiKey, model, prompt) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (res.status === 429) throw Object.assign(new Error("Rate limit"), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("Credits exhausted"), { status: 402 });
    if (!res.ok) throw new Error(`Lovable AI error: ${res.status}`);
    const data = await res.json();
    const parts = data.choices?.[0]?.message?.content;
    if (Array.isArray(parts)) {
      const imgPart = parts.find((p: any) => p.type === "image_url");
      if (imgPart?.image_url?.url) {
        return { base64: imgPart.image_url.url.replace(/^data:image\/\w+;base64,/, "") };
      }
    }
    return {};
  },
};

const openaiImageAdapter: ImageAdapter = {
  async generate(apiKey, model, prompt, opts) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "dall-e-3",
        prompt,
        n: 1,
        size: opts.size || "1024x1024",
        quality: opts.quality || "standard",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI Image error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { base64: data.data?.[0]?.b64_json };
  },
};

const stabilityAdapter: ImageAdapter = {
  async generate(apiKey, model, prompt, opts) {
    const res = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/core`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: (() => {
        const fd = new FormData();
        fd.append("prompt", prompt);
        fd.append("output_format", "png");
        if (opts.aspect_ratio) fd.append("aspect_ratio", opts.aspect_ratio);
        return fd;
      })(),
    });
    if (!res.ok) throw new Error(`Stability error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { base64: data.image };
  },
};

const replicateAdapter: ImageAdapter = {
  async generate(apiKey, model, prompt) {
    // Create prediction
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "black-forest-labs/flux-schnell",
        input: { prompt },
      }),
    });
    if (!res.ok) throw new Error(`Replicate error: ${res.status}`);
    let pred = await res.json();
    // Poll for completion (max 60s)
    for (let i = 0; i < 30; i++) {
      if (pred.status === "succeeded") break;
      if (pred.status === "failed") throw new Error("Replicate generation failed");
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(pred.urls.get, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      pred = await poll.json();
    }
    const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    return { url: outputUrl };
  },
};

const falAdapter: ImageAdapter = {
  async generate(apiKey, model, prompt) {
    const res = await fetch(`https://queue.fal.run/${model || "fal-ai/flux/schnell"}`, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: "square_hd" }),
    });
    if (!res.ok) throw new Error(`Fal error: ${res.status}`);
    const data = await res.json();
    return { url: data.images?.[0]?.url };
  },
};

function getImageAdapter(providerName: string): ImageAdapter {
  const adapters: Record<string, ImageAdapter> = {
    lovable: lovableImageAdapter,
    openai_image: openaiImageAdapter,
    stability: stabilityAdapter,
    replicate: replicateAdapter,
    fal: falAdapter,
    custom_image: openaiImageAdapter,
  };
  return adapters[providerName] || lovableImageAdapter;
}

function getApiKey(provider: any): string {
  if (provider.api_key_secret_name) {
    const key = Deno.env.get(provider.api_key_secret_name);
    if (key) return key;
  }
  return Deno.env.get("LOVABLE_API_KEY") || "";
}

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
      .from("ai_feature_flags").select("enabled")
      .eq("feature_key", "image_gen_enabled").single();
    if (flags && !flags.enabled) {
      return new Response(JSON.stringify({ error: "Image generation is currently disabled by admin." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check usage limits
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions").select("plan_name").eq("user_id", user.id).single();
    const planName = subscription?.plan_name || "basic";
    const { data: planLimits } = await supabaseAdmin
      .from("ai_plan_limits").select("*").eq("plan_name", planName).single();

    if (planLimits) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabaseAdmin
        .from("ai_usage_logs").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("generation_type", "image").eq("status", "success")
        .gte("created_at", monthStart);
      if ((count || 0) >= planLimits.image_generations_limit) {
        return new Response(JSON.stringify({
          error: `Monthly image generation limit reached (${planLimits.image_generations_limit}).`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get active + fallback image providers
    const { data: providerRows } = await supabaseAdmin
      .from("ai_provider_settings").select("*")
      .eq("provider_type", "image").order("is_active", { ascending: false });

    const activeProvider = (providerRows || []).find((p: any) => p.is_active);
    const fallbackProvider = (providerRows || []).find((p: any) => p.is_fallback && p.id !== activeProvider?.id);
    const provider = activeProvider || { provider_name: "lovable", model_name: "google/gemini-3.1-flash-image-preview" };

    // Get prompt template
    const { data: promptTemplate } = await supabaseAdmin
      .from("ai_prompt_templates").select("*")
      .eq("template_type", "image_prompt").eq("is_active", true).limit(1).single();

    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024 square", "4:5": "1080x1350 portrait",
      "16:9": "1920x1080 landscape", "9:16": "1080x1920 vertical/story",
    };

    let imagePrompt = promptTemplate?.system_prompt ? `${promptTemplate.system_prompt}\n\n` : "";
    imagePrompt += `Create a ${image_style || "modern"} social media image for ${platform || "Instagram"}.
Brand: ${brand_name || "Not specified"}
Product/Service: ${product_details || "Not specified"}
Offer/Message: ${offer_message || "Not specified"}
Main Text: ${main_text || "None"}
${secondary_text ? `Secondary Text: ${secondary_text}` : ""}
${cta_text ? `CTA Text: ${cta_text}` : ""}
Color: ${color_preference || "Brand colors"}
Audience: ${audience_type || "General"}
Mood: ${design_mood || "Professional"}
Aspect Ratio: ${sizeMap[aspect_ratio] || "1024x1024 square"}
${prompt_details ? `Additional: ${prompt_details}` : ""}

The image should be visually striking, on-brand, and optimized for social media.`;

    const count = Math.min(num_images || 1, 4);
    const outputUrls: string[] = [];

    for (let i = 0; i < count; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));

      let result: { base64?: string; url?: string } = {};
      let usedProvider = provider;
      const adapter = getImageAdapter(provider.provider_name);
      const apiKey = getApiKey(provider);

      try {
        result = await adapter.generate(apiKey, provider.model_name, imagePrompt, { size: sizeMap[aspect_ratio], aspect_ratio });
      } catch (err: any) {
        if (fallbackProvider) {
          console.log("Image fallback to:", fallbackProvider.provider_name);
          const fbAdapter = getImageAdapter(fallbackProvider.provider_name);
          const fbKey = getApiKey(fallbackProvider);
          usedProvider = fallbackProvider;
          result = await fbAdapter.generate(fbKey, fallbackProvider.model_name, imagePrompt, { size: sizeMap[aspect_ratio], aspect_ratio });
        } else {
          throw err;
        }
      }

      // Upload to storage
      if (result.base64) {
        const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
        const fileName = `ai-studio/${user.id}/${crypto.randomUUID()}.png`;
        await supabaseAdmin.storage.from("content-images").upload(fileName, bytes, {
          contentType: "image/png", upsert: false,
        });
        const { data: urlData } = supabaseAdmin.storage.from("content-images").getPublicUrl(fileName);
        outputUrls.push(urlData.publicUrl);
      } else if (result.url) {
        // Download from URL and re-upload
        const imgRes = await fetch(result.url);
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
        const fileName = `ai-studio/${user.id}/${crypto.randomUUID()}.png`;
        await supabaseAdmin.storage.from("content-images").upload(fileName, imgBytes, {
          contentType: "image/png", upsert: false,
        });
        const { data: urlData } = supabaseAdmin.storage.from("content-images").getPublicUrl(fileName);
        outputUrls.push(urlData.publicUrl);
      }
    }

    const responseTimeMs = Date.now() - startTime;

    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: user.id, generation_type: "image",
      provider: provider.provider_name, model: provider.model_name,
      prompt_input: imagePrompt.substring(0, 5000),
      output_result: JSON.stringify(outputUrls),
      status: "success", credits_used: count, response_time_ms: responseTimeMs,
    });

    await supabaseAdmin.from("ai_image_generations").insert({
      user_id: user.id, business_id: business_id || null,
      platform: platform || null, image_style: image_style || null,
      input_params: body, output_urls: outputUrls,
      image_prompt_used: imagePrompt,
      provider: provider.provider_name, model: provider.model_name,
      status: "completed",
    });

    return new Response(JSON.stringify({ images: outputUrls, prompt_used: imagePrompt, response_time_ms: responseTimeMs, provider_used: provider.provider_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ai-generate-image error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
