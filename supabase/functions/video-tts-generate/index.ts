import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const VOICE_MAP: Record<string, string> = {
  female_warm: "21m00Tcm4TlvDq8ikWAM",   // Rachel
  male_deep: "TxGEqnHWrfWFTfGW9XjX",     // Josh
  female_pro: "EXAVITQu4vrVxn15Jh2k",    // Bella
  male_friendly: "VR6AewLTigWG4x5kXRv",  // Arnold
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ ok: false, error: "unauthorized" });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const { text, voice_type, job_id }: { text: string; voice_type?: string; job_id?: string } = body;
    if (!text?.trim()) return ok({ ok: false, error: "text required" });

    // Get API key from the provider keys table
    const { data: keys } = await admin
      .from("provider_api_keys" as any)
      .select("*")
      .eq("key_name", "ELEVENLABS_API_KEY")
      .maybeSingle();

    const apiKey = keys?.key_value || Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return ok({ ok: false, error: "elevenlabs_not_configured" });

    const voiceId = VOICE_MAP[voice_type || "female_warm"] || VOICE_MAP.female_warm;

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.3, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return ok({ ok: false, error: `tts_failed: ${ttsRes.status} ${errText.slice(0, 200)}` });
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const fileName = `video-tts/${job_id || user.id}_${Date.now()}.mp3`;

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b: any) => b.id === "content-images")) {
      await admin.storage.createBucket("content-images", { public: true });
    }

    const { error: uploadErr } = await admin.storage
      .from("content-images")
      .upload(fileName, new Uint8Array(audioBuffer), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadErr) return ok({ ok: false, error: `upload_failed: ${uploadErr.message}` });

    const { data: urlData } = admin.storage.from("content-images").getPublicUrl(fileName);

    return ok({ ok: true, audio_url: urlData.publicUrl, duration_sec: estimateDuration(text) });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message ?? "unknown" });
  }
});

function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(5, Math.ceil(words / 150 * 60));
}
