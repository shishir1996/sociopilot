import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ ok: false, error: "unauthorized" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const { job_id } = body as { job_id?: string };
    if (!job_id) return ok({ ok: false, error: "job_id required" });

    const { data: job, error: jobErr } = await admin
      .from("video_generation_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (jobErr || !job) return ok({ ok: false, error: "job not found" });

    // Load business + brand context
    const { data: biz } = await admin
      .from("businesses")
      .select("*")
      .eq("id", job.business_id)
      .maybeSingle();
    const { data: brand } = await admin
      .from("business_brand_profiles")
      .select("*")
      .eq("business_id", job.business_id)
      .maybeSingle();

    await admin
      .from("video_generation_jobs")
      .update({ render_status: "planning", render_progress: 10 })
      .eq("id", job_id);

    const contextBlock = `
Business: ${biz?.name ?? ""}
Industry: ${biz?.industry ?? ""}
Target audience: ${biz?.target_audience ?? brand?.target_audience ?? ""}
Tone: ${brand?.tone_of_voice ?? biz?.brand_tone ?? "confident, friendly"}
Brand colors: ${(brand?.brand_colors ?? biz?.brand_colors ?? []).join(", ")}
CTA: ${brand?.cta_text ?? "Learn more"}
Products/Services: ${brand?.product_services ?? biz?.products_services ?? ""}
Keywords: ${(brand?.custom_keywords ?? []).join(", ")}
Video style: ${job.video_style}
Target ratio: ${job.video_ratio}
Target platform: ${job.platform_target ?? "instagram"}
Generation mode: ${job.generation_mode}
Duration target (sec): ${Math.min(60, Math.max(15, (job.video_duration ?? 30)))}
Script seed: ${job.script ?? job.title ?? ""}
`.trim();

    const system = `You are a senior social-video director. Produce a tight, scene-by-scene video blueprint.
Return ONLY valid minified JSON matching this shape:
{"title":"","hook":"","cta":"","duration":30,"music_mood":"","voice_style":"","video_style":"","scenes":[{"scene_number":1,"script":"","emotion":"","visual_query":"","visual_type":"stock|ai_image|premium_ai_video","animation":"","transition":"","duration":5,"caption_style":""}]}
Rules:
- 4 to 8 scenes, each 3-6s, summing to roughly the target duration.
- visual_query: 3-6 word search phrase for stock footage.
- visual_type: prefer "stock" unless the scene needs a stylized abstract shot.
- Use the brand tone, keywords, audience throughout.`;

    let blueprint: any = null;
    if (LOVABLE_API_KEY) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: contextBlock },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (aiResp.ok) {
        const data = await aiResp.json();
        const text = data?.choices?.[0]?.message?.content ?? "{}";
        try { blueprint = JSON.parse(text); } catch { blueprint = null; }
      } else {
        const errText = await aiResp.text();
        await admin.from("video_generation_jobs").update({
          render_status: "failed",
          render_error: `AI blueprint failed: ${aiResp.status} ${errText.slice(0,200)}`,
        }).eq("id", job_id);
        return ok({ ok: false, error: "ai_failed", diagnostics: errText.slice(0, 500) });
      }
    }

    if (!blueprint || !Array.isArray(blueprint.scenes)) {
      // Deterministic fallback
      const dur = Math.min(60, Math.max(15, job.video_duration ?? 30));
      const sceneCount = Math.max(4, Math.round(dur / 5));
      const each = Math.round(dur / sceneCount);
      blueprint = {
        title: job.title ?? biz?.name ?? "Untitled",
        hook: `Discover ${biz?.name ?? "us"}`,
        cta: brand?.cta_text ?? "Learn more",
        duration: dur,
        music_mood: job.music_type ?? "upbeat",
        voice_style: job.voice_type ?? "female_warm",
        video_style: job.video_style ?? "cinematic",
        scenes: Array.from({ length: sceneCount }).map((_, i) => ({
          scene_number: i + 1,
          script: i === 0 ? `Hook: ${biz?.name ?? "Brand"}` : `Scene ${i + 1}`,
          emotion: "confident",
          visual_query: `${biz?.industry ?? "business"} lifestyle`,
          visual_type: "stock",
          animation: "slow_zoom",
          transition: "fade",
          duration: each,
          caption_style: job.subtitle_style ?? "hormozi",
        })),
      };
    }

    await admin
      .from("video_generation_jobs")
      .update({
        blueprint_json: blueprint,
        render_status: "pending",
        render_progress: 25,
      })
      .eq("id", job_id);

    return ok({ ok: true, blueprint });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message ?? "unknown" });
  }
});