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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ ok: false, error: "unauthorized" });
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const input = await req.json().catch(() => ({}));

    // Resolve plan + feature controls
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan_name, status")
      .eq("user_id", user.id)
      .maybeSingle();
    const planName = (sub?.plan_name as string) || "free_trial";
    const { data: ctrl } = await admin
      .from("subscription_feature_controls")
      .select("*")
      .eq("subscription_plan", planName)
      .maybeSingle();
    const { data: settings } = await admin
      .from("admin_ai_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    // Gate: premium generation
    const wantsPremium = input.generation_mode === "premium_ai_video" || input.generation_mode === "avatar";
    if (wantsPremium) {
      const allowedByPlan = input.generation_mode === "avatar" ? ctrl?.allow_avatar_generation : ctrl?.allow_premium_generation;
      const allowedByAdmin = input.generation_mode === "avatar" ? settings?.enable_ai_avatar_generation : settings?.enable_premium_video_generation;
      if (!allowedByPlan || !allowedByAdmin) {
        return ok({ ok: false, error: "premium_generation_disabled" });
      }
    }

    // Cap duration by plan
    const maxSec = Math.floor((ctrl?.max_video_minutes ?? 1) * 60);
    const reqDur = Math.min(maxSec, Math.max(10, Number(input.video_duration) || 30));

    // Resolve business
    let businessId: string | null = input.business_id ?? null;
    if (!businessId) {
      const { data: biz } = await admin.from("businesses").select("id").eq("user_id", user.id).limit(1);
      businessId = biz?.[0]?.id ?? null;
    }
    if (!businessId) return ok({ ok: false, error: "no_business" });

    const insertPayload = {
      user_id: user.id,
      business_id: businessId,
      title: input.title ?? "Untitled video",
      script: input.script ?? null,
      voice_type: input.voice_type ?? "female_warm",
      subtitle_style: input.subtitle_style ?? "hormozi",
      music_type: input.music_type ?? "upbeat",
      video_style: input.video_style ?? "cinematic",
      generation_mode: input.generation_mode ?? "stock",
      video_ratio: input.video_ratio ?? "9:16",
      video_duration: reqDur,
      platform_target: input.platform_target ?? "instagram",
      is_premium_generation: !!wantsPremium,
      render_status: "pending",
      render_progress: 0,
    };

    const { data: job, error } = await admin
      .from("video_generation_jobs")
      .insert(insertPayload)
      .select()
      .single();
    if (error) return ok({ ok: false, error: error.message });

    // Kick off blueprint generation in background
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil((async () => {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/video-blueprint-generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ job_id: job.id }),
        });
      } catch (_) { /* ignore */ }
    })());

    return ok({ ok: true, job });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message ?? "unknown" });
  }
});