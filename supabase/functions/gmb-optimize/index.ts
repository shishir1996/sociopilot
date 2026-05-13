import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function ok(b: unknown) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { profile_id } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return ok({ ok: false, error: "Unauthorized" });

    const { data: profile } = await supabaseAdmin
      .from("gmb_profiles")
      .select("*")
      .eq("id", profile_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return ok({ ok: false, error: "Profile not found" });

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("name, industry, target_audience, location, products_services")
      .eq("id", profile.business_id)
      .maybeSingle();

    const prompt = `You are a Google My Business / local SEO expert. Generate optimized content for this business:

Business Name: ${profile.name || business?.name || "Unknown"}
Category: ${profile.category || business?.industry || "Unknown"}
Location: ${profile.address || business?.location || "Unknown"}
Products/Services: ${business?.products_services || "Not specified"}
Target Audience: ${business?.target_audience || "Not specified"}

Return STRICT JSON with these keys:
{
  "description": "<a compelling ~700-character GMB business description that includes top local SEO keywords naturally>",
  "keywords": ["<10 high-intent local SEO keywords>"],
  "tips": ["<5 short, actionable tips to improve local visibility>"]
}`;

    let aiResult: any = { description: "", keywords: [], tips: [] };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      const j = await res.json();
      const content = j.choices?.[0]?.message?.content || "{}";
      aiResult = JSON.parse(content);
    } catch (e: any) {
      return ok({ ok: false, error: "AI optimization failed", diagnostics: { message: e.message } });
    }

    const before = profile.completeness_score || 0;
    const fields = ["name", "address", "phone", "website", "category"];
    let after = 0;
    for (const f of fields) if ((profile as any)[f]) after += 15;
    if (aiResult.description) after += 15;
    if ((aiResult.keywords || []).length >= 5) after += 10;
    after = Math.min(100, after);

    await supabaseAdmin
      .from("gmb_profiles")
      .update({
        ai_description: aiResult.description,
        keywords: aiResult.keywords || [],
        completeness_score: after,
        last_optimized_at: new Date().toISOString(),
      })
      .eq("id", profile_id);

    await supabaseAdmin.from("gmb_optimizations").insert({
      gmb_profile_id: profile_id,
      user_id: user.id,
      before_score: before,
      after_score: after,
      ai_description: aiResult.description,
      keywords: aiResult.keywords || [],
      changes_applied: { tips: aiResult.tips || [] },
    });

    return ok({ ok: true, before_score: before, after_score: after, ...aiResult });
  } catch (e: any) {
    return ok({ ok: false, error: e.message });
  }
});