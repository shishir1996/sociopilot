import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ==================== PROVIDER ADAPTERS ====================
interface ProviderAdapter {
  call(apiKey: string, model: string, messages: any[], opts: any): Promise<any>;
}

const lovableAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, ...opts }),
    });
    if (res.status === 429) throw Object.assign(new Error("Rate limit"), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("Credits exhausted"), { status: 402 });
    if (!res.ok) throw new Error(`Lovable AI error: ${res.status} ${await res.text()}`);
    return res.json();
  },
};

const openaiAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, ...opts }),
    });
    if (res.status === 429) throw Object.assign(new Error("OpenAI rate limit"), { status: 429 });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    return res.json();
  },
};

const geminiAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    // Use OpenAI-compatible endpoint for Gemini
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, ...opts }),
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    return res.json();
  },
};

const anthropicAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    const systemMsg = messages.find((m: any) => m.role === "system");
    const nonSystem = messages.filter((m: any) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.max_tokens || 2048,
        system: systemMsg?.content || "",
        messages: nonSystem,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    // Normalize to OpenAI format
    return {
      choices: [{
        message: { role: "assistant", content: data.content?.[0]?.text || "" },
      }],
    };
  },
};

const groqAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, ...opts }),
    });
    if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
    return res.json();
  },
};

const openrouterAdapter: ProviderAdapter = {
  async call(apiKey, model, messages, opts) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, ...opts }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    return res.json();
  },
};

function getAdapter(providerName: string): ProviderAdapter {
  const adapters: Record<string, ProviderAdapter> = {
    lovable: lovableAdapter,
    openai: openaiAdapter,
    gemini: geminiAdapter,
    anthropic: anthropicAdapter,
    groq: groqAdapter,
    openrouter: openrouterAdapter,
    custom: openaiAdapter, // custom uses OpenAI-compatible format
  };
  return adapters[providerName] || lovableAdapter;
}

function getApiKey(provider: any): string {
  const raw = (provider.api_key_secret_name || "").trim();
  if (raw) {
    // If admin pasted the raw API key directly (e.g. "sk-or-...") use it as-is.
    const looksLikeRawKey = /^(sk-|pk-|key-|Bearer\s)/i.test(raw) || raw.length > 40;
    if (looksLikeRawKey) return raw.replace(/^Bearer\s+/i, "");
    // Otherwise treat it as the name of an env-var/secret.
    const key = Deno.env.get(raw);
    if (key) return key;
  }
  // Only the Lovable provider may fall back to the built-in Lovable AI key.
  if (provider.provider_name === "lovable") {
    return Deno.env.get("LOVABLE_API_KEY") || "";
  }
  return "";
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
      platform, content_type, brand_name, niche, target_audience, goal,
      tone, offer_details, keywords, content_length, language, emojis,
      cta_preference, hashtag_preference, additional_instructions,
      variations_count, brand_preset_id, business_id,
    } = body;

    // Check feature flags
    const { data: flags } = await supabaseAdmin
      .from("ai_feature_flags").select("enabled")
      .eq("feature_key", "text_gen_enabled").single();
    if (flags && !flags.enabled) {
      return new Response(JSON.stringify({ error: "Text generation is currently disabled by admin." }), {
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
        .eq("user_id", user.id).eq("generation_type", "text").eq("status", "success")
        .gte("created_at", monthStart);
      if ((count || 0) >= planLimits.text_generations_limit) {
        return new Response(JSON.stringify({
          error: `Monthly text generation limit reached (${planLimits.text_generations_limit}). Upgrade your plan for more.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get active text provider + fallback
    const { data: providers } = await supabaseAdmin
      .from("ai_provider_settings").select("*")
      .eq("provider_type", "text").order("is_active", { ascending: false }).order("is_fallback", { ascending: false });

    const activeProvider = (providers || []).find((p: any) => p.is_active);
    const fallbackProvider = (providers || []).find((p: any) => p.is_fallback && p.id !== activeProvider?.id);

    // Get prompt template
    const { data: promptTemplate } = await supabaseAdmin
      .from("ai_prompt_templates").select("*")
      .eq("template_type", content_type || "caption").eq("is_active", true).limit(1).single();

    // Get brand preset
    let brandPreset: any = null;
    if (brand_preset_id) {
      const { data } = await supabaseAdmin.from("ai_brand_presets").select("*").eq("id", brand_preset_id).single();
      brandPreset = data;
    }

    const provider = activeProvider || { provider_name: "lovable", model_name: "google/gemini-3-flash-preview", temperature: 0.7, max_tokens: 2048 };
    const modelName = provider.model_name || "google/gemini-3-flash-preview";
    const temperature = provider.temperature || 0.7;
    const maxTokens = provider.max_tokens || 2048;
    const numVariations = variations_count || 3;

    let systemPrompt = promptTemplate?.system_prompt || `You are an expert social media content creator and copywriter.`;
    if (promptTemplate?.hidden_instructions) systemPrompt += `\n\n${promptTemplate.hidden_instructions}`;
    if (brandPreset) {
      systemPrompt += `\n\nBRAND CONTEXT:\n- Brand Voice: ${brandPreset.brand_voice}\n- Tone: ${brandPreset.tone}\n- CTA Style: ${brandPreset.cta_style}\n- Post Structure: ${brandPreset.post_structure}\n- Target Audience: ${brandPreset.audience_profile}\n- Default Hashtags: ${(brandPreset.default_hashtags || []).join(", ")}`;
    }

    const platformFormats: Record<string, string> = {
      instagram: "Max 2200 chars. Use line breaks. Emojis welcome. Hashtags at end (up to 30).",
      facebook: "Conversational tone. 1-3 paragraphs. Link-friendly. Minimal hashtags.",
      linkedin: "Professional but human. Use line breaks. 1300 char sweet spot. 3-5 hashtags.",
      twitter: "Max 280 chars. Punchy and concise. 1-2 hashtags max.",
      youtube: "Title (60 chars), Description (first 2 lines critical), Tags.",
      threads: "Conversational, short paragraphs.",
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
${additional_instructions ? `- Additional: ${additional_instructions}` : ""}

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

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const callOpts: any = { temperature, max_tokens: maxTokens };

    let aiData: any;
    let usedProvider = provider;

    // Try active provider first, then fallback
    const adapter = getAdapter(provider.provider_name);
    const apiKey = getApiKey(provider);

    try {
      aiData = await adapter.call(apiKey, modelName, messages, callOpts);
    } catch (primaryErr: any) {
      console.error("Primary provider failed:", primaryErr.message);
      const shouldRetryOpenRouterAuto =
        provider.provider_name === "openrouter" &&
        primaryErr.message?.includes("404") &&
        modelName !== "openrouter/auto";

      if (shouldRetryOpenRouterAuto) {
        try {
          console.log("Configured OpenRouter model unavailable, retrying with openrouter/auto");
          aiData = await adapter.call(apiKey, "openrouter/auto", messages, callOpts);
          usedProvider = { ...provider, model_name: "openrouter/auto" };
        } catch (autoRetryErr: any) {
          console.error("OpenRouter auto retry failed:", autoRetryErr.message);
          primaryErr = autoRetryErr;
        }
      }

      if (aiData) {
        // noop: the OpenRouter auto retry succeeded.
      } else if (primaryErr.status === 429 || primaryErr.status === 402) {
        // Check if we have a fallback
        if (fallbackProvider) {
          console.log("Trying fallback provider:", fallbackProvider.provider_name);
          const fbAdapter = getAdapter(fallbackProvider.provider_name);
          const fbKey = getApiKey(fallbackProvider);
          usedProvider = fallbackProvider;
          aiData = await fbAdapter.call(fbKey, fallbackProvider.model_name, messages, callOpts);
        } else {
          return new Response(JSON.stringify({ error: primaryErr.message }), {
            status: primaryErr.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (fallbackProvider) {
        console.log("Trying fallback provider:", fallbackProvider.provider_name);
        const fbAdapter = getAdapter(fallbackProvider.provider_name);
        const fbKey = getApiKey(fallbackProvider);
        usedProvider = fallbackProvider;
        aiData = await fbAdapter.call(fbKey, fallbackProvider.model_name, messages, callOpts);
      } else {
        throw primaryErr;
      }
    }

    const rawContent = aiData.choices?.[0]?.message?.content || "";
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
      user_id: user.id, generation_type: "text",
      provider: usedProvider.provider_name, model: usedProvider.model_name,
      prompt_input: userPrompt.substring(0, 5000),
      output_result: JSON.stringify(variations).substring(0, 10000),
      status: "success", credits_used: 1, response_time_ms: responseTimeMs,
    });

    await supabaseAdmin.from("ai_text_generations").insert({
      user_id: user.id, business_id: business_id || null,
      platform: platform || null, content_type: content_type || null,
      input_params: body, output_variations: variations,
      brand_preset_id: brand_preset_id || null,
      provider: usedProvider.provider_name, model: usedProvider.model_name,
      status: "completed",
    });

    return new Response(JSON.stringify({ variations, response_time_ms: responseTimeMs, provider_used: usedProvider.provider_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    console.error("ai-generate-text error:", error);
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
