import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENDPOINTS: Record<string, { url: string; auth: (k: string) => Record<string, string> }> = {
  openrouter: { url: "https://openrouter.ai/api/v1/models", auth: (k) => ({ Authorization: `Bearer ${k}` }) },
  openai: { url: "https://api.openai.com/v1/models", auth: (k) => ({ Authorization: `Bearer ${k}` }) },
  groq: { url: "https://api.groq.com/openai/v1/models", auth: (k) => ({ Authorization: `Bearer ${k}` }) },
  anthropic: { url: "https://api.anthropic.com/v1/models", auth: (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }) },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models", auth: (k) => ({ "x-goog-api-key": k }) },
  lovable: { url: "https://ai.gateway.lovable.dev/v1/models", auth: (k) => ({ Authorization: `Bearer ${k}` }) },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { provider, api_key } = await req.json();
    const cfg = ENDPOINTS[provider];
    if (!cfg) {
      return new Response(JSON.stringify({ ok: false, error: `Unsupported provider: ${provider}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let key = (api_key || "").trim();
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "API key is empty" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // If a secret name was passed, resolve it
    if (!/^(sk-|pk-|key-)/i.test(key) && key.length < 40) {
      const resolved = Deno.env.get(key);
      if (resolved) key = resolved;
    }

    const res = await fetch(cfg.url, { headers: cfg.auth(key) });
    if (res.ok) {
      let modelCount: number | undefined;
      try {
        const j = await res.json();
        modelCount = (j.data || j.models || []).length;
      } catch {}
      return new Response(JSON.stringify({ ok: true, message: `API key is valid${modelCount ? ` — ${modelCount} models accessible` : ""}.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const text = await res.text();
    let friendly = `Provider returned ${res.status}.`;
    if (res.status === 401) friendly = "API key is invalid or expired (401 Unauthorized).";
    else if (res.status === 403) friendly = "API key lacks required permissions (403 Forbidden).";
    else if (res.status === 429) friendly = "Provider rate-limited the validation request. Try again shortly.";
    return new Response(JSON.stringify({ ok: false, error: friendly, diagnostics: text.slice(0, 500) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});