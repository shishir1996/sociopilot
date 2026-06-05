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
    const { queries }: { queries: string[] } = body as any;
    if (!queries?.length) return ok({ ok: false, error: "queries required" });

    // Get API keys from provider_api_keys table
    const { data: keys } = await admin
      .from("provider_api_keys" as any)
      .select("*")
      .in("key_name", ["PEXELS_API_KEY", "PIXABAY_API_KEY"]);

    const pexelsKey = keys?.find((k: any) => k.key_name === "PEXELS_API_KEY")?.key_value;
    const pixabayKey = keys?.find((k: any) => k.key_name === "PIXABAY_API_KEY")?.key_value;

    const results: { query: string; video_url?: string; image_url?: string; provider: string; error?: string }[] = [];

    for (const query of queries) {
      try {
        // Try Pexels first (HD quality)
        if (pexelsKey) {
          const pexelsRes = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`, {
            headers: { Authorization: pexelsKey },
          });
          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();
            const video = pexelsData?.videos?.[0];
            if (video?.video_files?.length) {
              const hd = video.video_files.find((f: any) => f.quality === "hd") || video.video_files[0];
              results.push({ query, video_url: hd.link, provider: "pexels" });
              continue;
            }
          }
        }

        // Fallback to Pixabay
        if (pixabayKey) {
          const pixRes = await fetch(`https://pixabay.com/api/videos?key=${pixabayKey}&q=${encodeURIComponent(query)}&per_page=3&orientation=vertical`);
          if (pixRes.ok) {
            const pixData = await pixRes.json();
            const hit = pixData?.hits?.[0];
            if (hit?.videos?.medium?.url) {
              results.push({ query, video_url: hit.videos.medium.url, provider: "pixabay" });
              continue;
            }
            if (hit?.videos?.tiny?.url) {
              results.push({ query, video_url: hit.videos.tiny.url, provider: "pixabay_tiny" });
              continue;
            }
          }
        }

        // Fallback to Pexels still photo
        if (pexelsKey) {
          const photoRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`, {
            headers: { Authorization: pexelsKey },
          });
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            const photo = photoData?.photos?.[0];
            if (photo?.src?.portrait) {
              results.push({ query, image_url: photo.src.portrait, provider: "pexels_photo" });
              continue;
            }
          }
        }

        results.push({ query, error: "no_stock_found", provider: "none" });
      } catch (err: any) {
        results.push({ query, error: err?.message || "unknown", provider: "none" });
      }
    }

    return ok({ ok: true, results });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message ?? "unknown" });
  }
});
