import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Provider helpers ---------------------------------------------------
// We support OpenRouter (preferred) and the built-in Lovable AI gateway as
// a transparent fallback. Both are OpenAI-compatible chat-completions APIs.
function resolveApiKey(provider: any): string {
  const raw = (provider?.api_key_secret_name || "").trim();
  if (raw) {
    const looksLikeRawKey = /^(sk-|pk-|key-|Bearer\s)/i.test(raw) || raw.length > 40;
    if (looksLikeRawKey) return raw.replace(/^Bearer\s+/i, "");
    const k = Deno.env.get(raw);
    if (k) return k;
  }
  if (provider?.provider_name === "lovable") return Deno.env.get("LOVABLE_API_KEY") || "";
  return "";
}

function providerEndpoint(name: string): string {
  if (name === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (name === "openai") return "https://api.openai.com/v1/chat/completions";
  if (name === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  // default -> Lovable AI gateway
  return "https://ai.gateway.lovable.dev/v1/chat/completions";
}

async function callTextProvider(provider: any, body: any) {
  const url = providerEndpoint(provider?.provider_name || "lovable");
  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    throw new Error(`Missing API key for provider "${provider?.provider_name}". Configure it in Admin → AI Control Center.`);
  }
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function ensureBucketExists(supabaseAdmin: any) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.id === "content-images");
  if (!exists) {
    await supabaseAdmin.storage.createBucket("content-images", { public: true });
  }
}

async function generateImage(
  prompt: string,
  imageProvider: any | null,
  lovableApiKey: string,
  maxRetries = 3,
): Promise<{ data: string | null; rateLimited: boolean; error?: string }> {
  // Image generation requires an image-capable provider. OpenRouter text-only
  // models cannot produce images — fall back to Lovable AI image gateway only
  // when an image provider isn't explicitly configured AND the Lovable key exists.
  const useLovable = !imageProvider || imageProvider.provider_name === "lovable";
  if (useLovable && !lovableApiKey) {
    return { data: null, rateLimited: false, error: "no_image_provider" };
  }
  const url = useLovable
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : providerEndpoint(imageProvider.provider_name);
  const apiKey = useLovable ? lovableApiKey : resolveApiKey(imageProvider);
  const model = useLovable
    ? "google/gemini-3.1-flash-image-preview"
    : (imageProvider.model_name || "google/gemini-3.1-flash-image-preview");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 3000;
        console.log(`Retry ${attempt}/${maxRetries}, waiting ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (response.status === 429) {
        console.warn(`Image gen rate limited (attempt ${attempt + 1})`);
        if (attempt === maxRetries - 1) return { data: null, rateLimited: true };
        continue;
      }

      if (response.status === 402) {
        console.error("AI credits exhausted");
        return { data: null, rateLimited: false };
      }

      if (!response.ok) {
        console.error("Image gen error:", response.status);
        return { data: null, rateLimited: false };
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return { data: imageUrl || null, rateLimited: false };
    } catch (err) {
      console.error("Image generation failed:", err);
      if (attempt === maxRetries - 1) return { data: null, rateLimited: false };
    }
  }
  return { data: null, rateLimited: false };
}

async function uploadBase64Image(
  supabaseAdmin: any,
  base64Data: string,
  fileName: string,
  supabaseUrl: string,
): Promise<string | null> {
  try {
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));

    const { error } = await supabaseAdmin.storage
      .from("content-images")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    return `${supabaseUrl}/storage/v1/object/public/content-images/${fileName}`;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
}

async function generateImagesInBackground(
  insertedItems: any[],
  planId: string,
  supabaseUrl: string,
  supabaseKey: string,
  imageProvider: any | null,
  lovableApiKey: string,
) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  await ensureBucketExists(supabaseAdmin);

  // Only process items that need images (text_with_image or image_carousel)
  const imageItems = insertedItems.filter((item) => item.image_prompt && item.post_format !== "text_only");

  console.log(`Generating images for ${imageItems.length} of ${insertedItems.length} items (skipping text-only posts)`);

  for (const item of imageItems) {
    try {
      const result = await generateImage(item.image_prompt, imageProvider, lovableApiKey);
      if (!result.data) {
        if (result.error === "no_image_provider") {
          console.warn("Skipping image gen — no image provider configured.");
        }
        continue;
      }

      const fileName = `${planId}/day-${item.day_number}-${Date.now()}.png`;
      const publicUrl = await uploadBase64Image(supabaseAdmin, result.data, fileName, supabaseUrl);

      if (publicUrl) {
        await supabaseAdmin
          .from("content_items")
          .update({ image_url: publicUrl })
          .eq("id", item.id);
        console.log(`Image generated for day ${item.day_number} (${item.post_format})`);
      }
    } catch (err) {
      console.error(`Image gen failed for day ${item.day_number}:`, err);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log("Background image generation complete for plan", planId);
}

// ----- Full content generation pipeline (runs in background) -----------
// Encapsulates the AI text-plan call, plan/items insert, and kicks off
// image generation. Designed to be invoked from EdgeRuntime.waitUntil so
// the HTTP request can return immediately and avoid the 150s wall clock.
interface RunFullGenerationArgs {
  supabaseAdmin: any;
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  business: any;
  businessId: string;
  generationRequestId?: string | null;
  weekNumber: number;
  allowImage: boolean;
  allowVideo: boolean;
  textProvider: any;
  imageProvider: any;
  lovableApiKey: string;
  brandContext: string;
  colorContext: string;
  sloganContext: string;
  creativeDirectionContext: string;
}

async function runFullGeneration(args: RunFullGenerationArgs) {
  const {
    supabaseAdmin, supabaseUrl, supabaseKey, userId, business, businessId, generationRequestId,
    weekNumber, allowImage, textProvider, imageProvider, lovableApiKey,
    brandContext, colorContext, sloganContext, creativeDirectionContext,
  } = args;

  // Fetch previous week topics to avoid repetition
  let previousTopicsSummary = "";
  const { data: recentItems } = await supabaseAdmin
    .from("content_items")
    .select("topic")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(21);
  if (recentItems && recentItems.length > 0) {
    const topicList = recentItems.map((i: any) => `"${i.topic}"`).join(", ");
    previousTopicsSummary = `\n\nPREVIOUSLY USED TOPICS (DO NOT REPEAT THESE — create completely new angles):\n${topicList}`;
  }

  // When admin disables image generation, force every post to be text_only.
  const formatGuidance = allowImage
    ? `For EACH post, decide post_format from: "text_only" | "text_with_image" | "image_carousel".
- A good weekly mix is: 2-3 text_with_image, 1-2 image_carousel, 2-3 text_only
- text_only posts: image_prompt and visual_style MUST be empty strings
- text_with_image and image_carousel: include a detailed image_prompt`
    : `IMPORTANT: image generation is currently DISABLED by the administrator.
EVERY post MUST use post_format = "text_only", content_type = "Text Post",
image_prompt = "" and visual_style = "". Do NOT suggest carousels or images.`;

  const systemPrompt = `You are a senior AI Content Strategist specialized in ${business.industry || "business"} marketing.
You create hyper-personalized, niche-specific social media content plans.

BUSINESS PROFILE:
- Name: ${business.name}
- Industry/Niche: ${business.industry || "General"}
- Products/Services: ${business.products_services || "Not specified"}
- Location: ${business.location || "Not specified"}
- Target Audience: ${business.target_audience || "General audience"}
- Business Goals: ${(business.goals || []).join(", ") || "Brand awareness"}
- Brand Tone: ${business.brand_tone || "Professional"}
- Content Style: ${business.content_style || "Balanced"}
- Main Offers: ${business.main_offers || "Not specified"}
- Competitors: ${business.competitors || "Not specified"}
- Posting Goals: ${(business.posting_goals || ["engagement"]).join(", ")}${colorContext}${sloganContext}${brandContext}${creativeDirectionContext}

=== FORMAT DECISION RULES (CRITICAL — FOLLOW EXACTLY) ===
${formatGuidance}
- NEVER use "Reel", "Video", "Story" as content_type — only use: "Text Post", "Image Post", "Carousel"

=== CONTENT RULES ===
1. Every post MUST be specifically about "${business.name}" — NO generic filler.
2. Captions must mention the business name, products, or services naturally.
3. Hooks must be scroll-stopping and address real pain points of "${business.target_audience || "the target audience"}".
4. CTAs must drive specific actions: calls, DMs, website visits, bookings.
5. Hashtags must include brand-specific, location-specific, and niche-specific tags.
6. Each day must target a DIFFERENT content goal.

Generate exactly 7 days with diverse, non-repetitive content.${previousTopicsSummary}`;

  const userPrompt = `Generate Week ${weekNumber} content plan for "${business.name}".
Platforms: ${(business.platforms || ["Instagram", "Facebook"]).join(", ")}
This week focus: ${weekNumber % 4 === 1 ? "brand awareness" : weekNumber % 4 === 2 ? "engagement" : weekNumber % 4 === 3 ? "trust building" : "sales conversion"}.`;

  const contentPlanRequest: any = {
    model: textProvider.model_name || "openrouter/auto",
    messages: [
      { role: "system", content: systemPrompt + "\n\nReturn ONLY the raw JSON object via the create_content_plan tool." },
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
                  post_format: { type: "string", enum: ["text_only", "text_with_image", "image_carousel"] },
                  content_theme: { type: "string" },
                  content_goal: { type: "string" },
                  primary_platform: { type: "string" },
                  secondary_platforms: { type: "array", items: { type: "string" } },
                  content_type: { type: "string", enum: ["Text Post", "Image Post", "Carousel"] },
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
                required: ["day_number", "post_format", "content_theme", "primary_platform", "content_type", "topic", "hook", "caption", "cta"],
              },
            },
          },
          required: ["strategy_summary", "days"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "create_content_plan" } },
  };

  const plainJsonRequest: any = {
    model: textProvider.model_name || "openrouter/auto",
    messages: [
      { role: "system", content: `${systemPrompt}\n\nReturn STRICT JSON only with this shape: {"strategy_summary":"...","days":[...]}. Do not use markdown.` },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: Number(textProvider.temperature ?? 0.7),
    max_tokens: Number(textProvider.max_tokens ?? 4096),
  };

  let aiResponse = await callTextProvider(textProvider, contentPlanRequest);
  if (!aiResponse.ok && aiResponse.status === 404 && textProvider.provider_name === "openrouter" && contentPlanRequest.model !== "openrouter/auto") {
    console.warn(`Configured OpenRouter model returned 404. Retrying with openrouter/auto.`);
    aiResponse = await callTextProvider(
      { ...textProvider, model_name: "openrouter/auto" },
      { ...contentPlanRequest, model: "openrouter/auto" },
    );
  }
  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errText.slice(0, 500));
    throw new Error(`AI provider failed (${aiResponse.status}). Check the active model/API key in Admin → AI Control Center.`);
  }

  const aiData = await aiResponse.json();
  const choice = aiData.choices?.[0]?.message;
  const toolCall = choice?.tool_calls?.[0];
  let rawJson: string | undefined;
  if (toolCall?.function?.arguments) {
    rawJson = toolCall.function.arguments;
  } else if (typeof choice?.content === "string" && choice.content.trim().length > 0) {
    rawJson = choice.content.trim();
    const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) rawJson = fenceMatch[1].trim();
    const firstBrace = rawJson.indexOf("{");
    const lastBrace = rawJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) rawJson = rawJson.slice(firstBrace, lastBrace + 1);
  }
  if (!rawJson) {
    console.warn("Tool-call response was empty; retrying with plain JSON mode.");
    const fallbackResponse = await callTextProvider(textProvider, plainJsonRequest);
    if (!fallbackResponse.ok) {
      const errText = await fallbackResponse.text();
      console.error("Plain JSON AI fallback error:", fallbackResponse.status, errText.slice(0, 500));
      throw new Error(`AI provider failed (${fallbackResponse.status}). Check the active model/API key in Admin → AI Control Center.`);
    }
    const fallbackData = await fallbackResponse.json();
    rawJson = fallbackData.choices?.[0]?.message?.content?.trim();
    const fenceMatch = rawJson?.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) rawJson = fenceMatch[1].trim();
    const firstBrace = rawJson?.indexOf("{") ?? -1;
    const lastBrace = rawJson?.lastIndexOf("}") ?? -1;
    if (rawJson && firstBrace !== -1 && lastBrace > firstBrace) rawJson = rawJson.slice(firstBrace, lastBrace + 1);
  }
  if (!rawJson) {
    console.error("AI response had no parsable content");
    throw new Error("AI returned an empty content plan. Select a stronger text model in Admin → AI Control Center.");
  }

  let plan: any;
  try { plan = JSON.parse(rawJson); }
  catch { console.error("Failed to parse AI response"); throw new Error("AI returned invalid JSON. Select a stronger text model in Admin → AI Control Center."); }

  if (!Array.isArray(plan?.days)) {
    for (const k of ["plan", "content_plan", "result", "data", "output"]) {
      if (plan?.[k] && Array.isArray(plan[k]?.days)) { plan = plan[k]; break; }
    }
  }
  if (Array.isArray(plan)) plan = { strategy_summary: `Week ${weekNumber} content plan`, days: plan };
  if (!plan?.days?.length) { console.error("AI plan missing days"); throw new Error("AI returned 0 content days. Select a stronger text model in Admin → AI Control Center."); }

  // Normalize
  const validFormats = ["text_only", "text_with_image", "image_carousel"];
  for (const day of plan.days) {
    if (!allowImage) { day.post_format = "text_only"; }
    if (!validFormats.includes(day.post_format)) {
      day.post_format = day.image_prompt ? "text_with_image" : "text_only";
    }
    if (day.post_format === "text_only") { day.image_prompt = ""; day.visual_style = ""; }
    day.content_type = day.post_format === "text_only" ? "Text Post" : day.post_format === "image_carousel" ? "Carousel" : "Image Post";
  }

  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() + (weekNumber - 1) * 7);
  const weekStart = weekStartDate.toISOString().split("T")[0];

  const { data: newPlan, error: planError } = await supabaseAdmin
    .from("content_plans")
    .insert({
      business_id: businessId,
      user_id: userId,
      week_start: weekStart,
      week_number: weekNumber,
      strategy_summary: plan.strategy_summary || `Week ${weekNumber} plan`,
      status: "draft",
    })
    .select()
    .single();
  if (planError || !newPlan) { console.error("Plan insert error:", planError); throw new Error("Content plan could not be saved."); }

  const items = plan.days.map((day: any) => ({
    plan_id: newPlan.id,
    user_id: userId,
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
    image_prompt: day.post_format !== "text_only" ? (day.image_prompt || "") : "",
    visual_style: day.post_format !== "text_only" ? (day.visual_style || "") : "",
    repurposing_suggestion: day.repurposing_suggestion || "",
    status: "draft",
  }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from("content_items")
    .insert(items)
      .select("id, image_prompt, day_number, content_type");
    if (itemsError) { console.error("Items insert error:", itemsError); throw new Error("Content items could not be saved."); }

    const insertedCount = insertedItems?.length || 0;
    if (generationRequestId) {
      await supabaseAdmin.from("weekly_generation_requests")
        .update({ status: "completed", content_plan_id: newPlan.id })
        .eq("id", generationRequestId)
        .eq("user_id", userId);
    } else {
      await supabaseAdmin.from("weekly_generation_requests")
        .update({ status: "completed", content_plan_id: newPlan.id })
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .eq("status", "generating")
        .is("content_plan_id", null);
    }

  if (allowImage) {
    const itemsNeedingImages = (insertedItems || []).filter((it: any) => it.image_prompt?.length > 0);
    if (itemsNeedingImages.length > 0) {
      const itemsWithFormat = itemsNeedingImages.map((item: any) => {
        const dayData = plan.days.find((d: any) => d.day_number === item.day_number);
        return { ...item, post_format: dayData?.post_format || "text_with_image" };
      });
      // Run inline (we're already in background) so images finish too.
      await generateImagesInBackground(itemsWithFormat, newPlan.id, supabaseUrl, supabaseKey, imageProvider, lovableApiKey);
    }
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title: "Content generated",
    message: `${insertedCount} content items were created for Week ${weekNumber}.`,
    type: "success",
    action_url: "/content",
  });

  console.log(`Background generation complete for plan ${newPlan.id} with ${insertedCount} items`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestStartedAt = Date.now();

  const respond = (payload: Record<string, unknown>) => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const succeed = (payload: Record<string, unknown> = {}) => respond({
    ok: true,
    ...payload,
    diagnostics: {
      processing_time_ms: Date.now() - requestStartedAt,
    },
  });

  const fail = (
    error: string,
    requestedStatus: number,
    errorStage: string,
    diagnostics: Record<string, unknown> = {},
  ) => respond({
    ok: false,
    error,
    diagnostics: {
      requested_status: requestedStatus,
      error_stage: errorStage,
      processing_time_ms: Date.now() - requestStartedAt,
      ...diagnostics,
    },
  });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return fail("Unauthorized", 401, "auth");

    const body = await req.json();

    // Resolve admin-configured providers (text + image). The text provider
    // is required; the image provider is optional and only used when posts
    // need images.
    const { data: providerRows } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("*")
      .eq("is_active", true)
      .in("provider_type", ["text", "image", "video"]);
    const textProvider =
      (providerRows || []).find((p: any) => p.provider_type === "text") ||
      { provider_name: "lovable", model_name: "google/gemini-2.5-flash" };
    const imageProvider =
      (providerRows || []).find((p: any) => p.provider_type === "image") || null;

    // Handle image regeneration for a single content item
    if (body.regenerate_image && body.content_item_id && body.image_prompt) {
      await ensureBucketExists(supabaseAdmin);
      const result = await generateImage(body.image_prompt, imageProvider, LOVABLE_API_KEY);
      if (result.rateLimited) {
        return fail("AI rate limit reached. Please try again in a minute.", 429, "regenerate_image_rate_limit");
      }
      if (result.error === "no_image_provider") {
        return fail(
          "No image provider configured. Add an image-capable provider in Admin → AI Control Center → Image Models.",
          400,
          "no_image_provider",
        );
      }
      if (!result.data) {
        return fail("Image generation failed. Please try again.", 500, "regenerate_image_failed");
      }
      const fileName = `regen/${body.content_item_id}-${Date.now()}.png`;
      const publicUrl = await uploadBase64Image(supabaseAdmin, result.data, fileName, supabaseUrl);
      if (publicUrl) {
        await supabaseAdmin.from("content_items").update({ image_url: publicUrl }).eq("id", body.content_item_id);
        return succeed({ success: true, image_url: publicUrl });
      }
      return fail("Upload failed", 500, "regenerate_image_upload_failed");
    }

    const { business_id, generation_request_id } = body;
    if (!business_id) {
      return fail("business_id is required", 400, "validation", { field: "business_id" });
    }

    // Fetch business details
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .eq("user_id", user.id)
      .single();

    if (bizError || !business) return fail("Business not found", 404, "business_lookup", { business_id });

    // Fetch brand assets for richer prompts
    const { data: brandAssets } = await supabaseAdmin
      .from("brand_assets")
      .select("asset_type, file_url, label")
      .eq("business_id", business_id);

    const brandContext = brandAssets && brandAssets.length > 0
      ? `\nBrand Assets: ${brandAssets.map((a: any) => `${a.asset_type}: ${a.label || a.file_url}`).join(", ")}`
      : "";

    const colorContext = business.brand_colors && business.brand_colors.length > 0
      ? `\nBrand Colors: ${business.brand_colors.join(", ")}`
      : "";

    const sloganContext = business.slogan
      ? `\nSlogan/Tagline: ${business.slogan}`
      : "";

    const creativeDirectionContext = business.creative_direction
      ? `\n\n--- USER'S CREATIVE DIRECTION (MUST FOLLOW) ---\n${business.creative_direction}\n--- END CREATIVE DIRECTION ---`
      : "";

    // Get existing plan count for correct week numbering
    const { count } = await supabaseAdmin
      .from("content_plans")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id)
      .eq("user_id", user.id);

    const weekNumber = (count || 0) + 1;

    // ---- Admin-controlled generation modes ------------------------------
    // Read three feature flags managed in Admin → AI Control Center:
    //   allow_text_generation   — must be enabled for any generation at all
    //   allow_image_generation  — when off, force every post to text_only
    //   allow_video_generation  — reserved for future video posts
    const { data: flagRows } = await supabaseAdmin
      .from("ai_feature_flags")
      .select("feature_key, enabled")
      .in("feature_key", ["allow_text_generation", "allow_image_generation", "allow_video_generation"]);
    const flagMap: Record<string, boolean> = {};
    (flagRows || []).forEach((f: any) => { flagMap[f.feature_key] = !!f.enabled; });
    const allowText = flagMap["allow_text_generation"] !== false; // default true
    const allowImage = flagMap["allow_image_generation"] !== false; // default true
    const allowVideo = flagMap["allow_video_generation"] === true; // default false

    if (!allowText) {
      return fail(
        "Content generation is currently disabled by the administrator.",
        403,
        "feature_disabled",
      );
    }

    // The full text+image pipeline can take 60-180s. To avoid the edge
    // function 150s wall clock (which surfaces as "Failed to send a request
    // to the Edge Function") we kick the heavy work into a background task
    // and acknowledge the request immediately. The UI polls the
    // content_plans table to detect when the new plan appears.
    const backgroundJob = (async () => {
      try {
        await runFullGeneration({
          supabaseAdmin,
          supabaseUrl,
          supabaseKey,
          userId: user.id,
          business,
          businessId: business_id,
          generationRequestId: generation_request_id || null,
          weekNumber,
          allowImage,
          allowVideo,
          textProvider,
          imageProvider,
          lovableApiKey: LOVABLE_API_KEY,
          brandContext,
          colorContext,
          sloganContext,
          creativeDirectionContext,
        });
      } catch (bgErr) {
        console.error("Background generation failed:", bgErr);
        if (generation_request_id) {
          await supabaseAdmin.from("weekly_generation_requests")
            .update({ status: "failed" })
            .eq("id", generation_request_id)
            .eq("user_id", user.id);
        }
      }
    })();
    // @ts-ignore -- EdgeRuntime is available in Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(backgroundJob);

    return succeed({
      success: true,
      status: "queued",
      week_number: weekNumber,
      message: "Generation started. New posts will appear in your dashboard within 1–2 minutes — feel free to refresh.",
    });
  } catch (error) {
    console.error("generate-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail(message, 500, "unhandled_exception");
  }
});
