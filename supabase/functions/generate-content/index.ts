import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ensureBucketExists(supabaseAdmin: any) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.id === "content-images");
  if (!exists) {
    await supabaseAdmin.storage.createBucket("content-images", { public: true });
  }
}

async function generateImage(prompt: string, apiKey: string, maxRetries = 3): Promise<{ data: string | null; rateLimited: boolean }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 3000;
        console.log(`Retry ${attempt}/${maxRetries}, waiting ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
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
  apiKey: string,
) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  await ensureBucketExists(supabaseAdmin);

  for (const item of insertedItems) {
    if (!item.image_prompt) continue;
    try {
      const result = await generateImage(item.image_prompt, apiKey);
      if (!result.data) continue;

      const fileName = `${planId}/day-${item.day_number}-${Date.now()}.png`;
      const publicUrl = await uploadBase64Image(supabaseAdmin, result.data, fileName, supabaseUrl);

      if (publicUrl) {
        await supabaseAdmin
          .from("content_items")
          .update({ image_url: publicUrl })
          .eq("id", item.id);
        console.log(`Image generated for day ${item.day_number}`);
      }
    } catch (err) {
      console.error(`Image gen failed for day ${item.day_number}:`, err);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log("Background image generation complete for plan", planId);
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    // Handle image regeneration for a single content item
    if (body.regenerate_image && body.content_item_id && body.image_prompt) {
      await ensureBucketExists(supabaseAdmin);
      const result = await generateImage(body.image_prompt, LOVABLE_API_KEY);
      if (result.rateLimited) {
        return fail("AI rate limit reached. Please try again in a minute.", 429, "regenerate_image_rate_limit");
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

    const { business_id } = body;
    if (!business_id) {
      return fail("business_id is required", 400, "validation", { field: "business_id" });
    }

    // Fetch business details (including creative_direction)
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

    // Fetch previous week topics to avoid repetition
    let previousTopicsSummary = "";
    const { data: recentItems } = await supabaseAdmin
      .from("content_items")
      .select("topic, content_theme, hook")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(21);

    if (recentItems && recentItems.length > 0) {
      const topicList = recentItems.map((i: any) => `"${i.topic}"`).join(", ");
      previousTopicsSummary = `\n\nPREVIOUSLY USED TOPICS (DO NOT REPEAT THESE — create completely new angles):\n${topicList}`;
    }

    // Build deeply personalized system prompt
    const systemPrompt = `You are a senior AI Content Strategist specialized in ${business.industry || "business"} marketing.
You create hyper-personalized, niche-specific social media content plans that feel like they were written by an expert marketer who deeply understands the client's business.

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

CONTENT RULES:
1. Every post MUST be specifically about "${business.name}" and its ${business.industry || "business"} niche — NO generic motivational quotes or filler content.
2. Captions must mention the business name, products, services, or location naturally.
3. Hooks must be scroll-stopping, specific to the industry, and address real pain points of "${business.target_audience || "the target audience"}".
4. CTAs must drive specific actions: calls, DMs, website visits, store visits, bookings — not vague "like and share".
5. Hashtags must include brand-specific, location-specific (if applicable), and niche-specific tags.
6. Image prompts must be detailed, brand-aligned, and describe professional social media visuals — NOT generic stock photos.
7. Each day must target a DIFFERENT content goal: awareness, engagement, trust, sales, education, local visibility, conversion.
8. ${business.location ? `Include Google Business Profile as a platform option since this is a local business in ${business.location}.` : ""}
9. When brand colors are provided, ALWAYS incorporate them into image prompts.
10. Content must feel like it was written by someone who works at "${business.name}", not a generic AI.

Return ONLY a valid JSON object with this exact structure:
{
  "strategy_summary": "Specific strategy for Week ${weekNumber} of ${business.name}'s content plan, mentioning key themes and goals",
  "days": [
    {
      "day_number": 1,
      "content_theme": "Theme specific to ${business.industry}",
      "content_goal": "Specific goal (awareness/engagement/trust/sales/education/local/conversion)",
      "primary_platform": "Platform name",
      "secondary_platforms": ["Platform2"],
      "content_type": "Carousel|Reel|Image|Text|Story|Video",
      "topic": "Specific topic about ${business.name}'s niche",
      "hook": "Industry-specific scroll-stopping hook",
      "pain_point": "Real pain point of ${business.target_audience || "audience"}",
      "core_message": "Key message tied to business value proposition",
      "cta": "Specific action-driving CTA",
      "posting_time": "10:00 AM",
      "why_it_matters": "Why this post drives ${(business.posting_goals || ["growth"]).join("/")}",
      "caption": "Full ready-to-post caption (200-400 words), personalized to ${business.name}",
      "hashtags": ["brandTag", "nicheTag", "locationTag", "industryTag"],
      "image_prompt": "Detailed AI image prompt with brand colors, style, composition, and industry context",
      "visual_style": "Visual direction matching brand identity",
      "repurposing_suggestion": "Platform-specific repurposing tip"
    }
  ]
}
Generate exactly 7 days with diverse, non-repetitive content.${previousTopicsSummary}`;

    const userPrompt = `Generate Week ${weekNumber} content plan for "${business.name}".

Platforms to use: ${(business.platforms || ["Instagram", "Facebook"]).join(", ")}
Content Types preferred: ${(business.content_types || ["Image", "Carousel", "Reel"]).join(", ")}

This is week ${weekNumber} — make sure the content is COMPLETELY FRESH and different from any previous weeks. 
Focus this week on: ${weekNumber % 4 === 1 ? "brand awareness and reach" : weekNumber % 4 === 2 ? "engagement and community building" : weekNumber % 4 === 3 ? "trust building and social proof" : "sales conversion and lead generation"}.

Every caption must be ready to copy-paste with emojis, line breaks, and a clear CTA.
Every image prompt must describe a professional, brand-aligned visual that would look great on social media.`;

    // Call Lovable AI for content plan
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        return fail(
          "AI rate limit reached. Please try again in a moment.",
          429,
          "content_plan_ai_rate_limit",
          { ai_status: aiResponse.status },
        );
      }
      if (aiResponse.status === 402) {
        return fail(
          "AI credits exhausted. Please add funds in Settings > Workspace > Usage.",
          402,
          "content_plan_ai_credits",
          { ai_status: aiResponse.status },
        );
      }
      return fail(`AI error: ${aiResponse.status}`, aiResponse.status, "content_plan_ai_gateway", {
        ai_status: aiResponse.status,
        ai_error: errText.slice(0, 500),
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("AI response had no tool call:", JSON.stringify(aiData).slice(0, 500));
      return fail("No structured response from AI. Please try again.", 502, "missing_tool_call");
    }

    let plan;
    try {
      plan = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", toolCall.function.arguments?.slice(0, 500));
      return fail("AI returned invalid content. Please try again.", 502, "invalid_ai_response");
    }

    if (!plan.days || !Array.isArray(plan.days) || plan.days.length === 0) {
      return fail("AI returned an empty content plan. Please try again.", 502, "empty_content_plan");
    }

    // Calculate the actual week_start date for proper sequencing
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() + (weekNumber - 1) * 7);
    const weekStart = weekStartDate.toISOString().split("T")[0];

    // Create the content plan using admin client to bypass any RLS issues
    const { data: newPlan, error: planError } = await supabaseAdmin
      .from("content_plans")
      .insert({
        business_id,
        user_id: user.id,
        week_start: weekStart,
        week_number: weekNumber,
        strategy_summary: plan.strategy_summary,
        status: "draft",
      })
      .select()
      .single();

    if (planError) {
      console.error("Plan insert error:", planError);
      return fail(`Failed to save content plan: ${planError.message}`, 500, "plan_insert");
    }

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

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("content_items")
      .insert(items)
      .select("id, image_prompt, day_number");

    if (itemsError) {
      console.error("Items insert error:", itemsError);
      return fail(`Failed to save content items: ${itemsError.message}`, 500, "items_insert");
    }

    // Generate images in the background (non-blocking)
    console.log("Starting background image generation for", insertedItems.length, "items...");
    EdgeRuntime.waitUntil(
      generateImagesInBackground(
        insertedItems,
        newPlan.id,
        supabaseUrl,
        supabaseKey,
        LOVABLE_API_KEY,
      )
    );

    // Return immediately with the plan
    return succeed({ success: true, plan_id: newPlan.id, week_number: weekNumber });
  } catch (error) {
    console.error("generate-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail(message, 500, "unhandled_exception");
  }
});
