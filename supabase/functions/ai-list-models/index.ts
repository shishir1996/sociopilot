import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchOpenAI(key: string) {
  const r = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  const j = await r.json();
  return (j.data || []).map((m: any) => ({ id: m.id, name: m.id, kind: guessKind(m.id) }));
}

async function fetchOpenRouter(key: string) {
  const r = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const j = await r.json();
  return (j.data || []).map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
    context_length: m.context_length,
    pricing: m.pricing,
    kind: guessKind(m.id),
  }));
}

async function fetchGemini(key: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const j = await r.json();
  return (j.models || []).map((m: any) => ({
    id: m.name?.replace(/^models\//, "") || m.name,
    name: m.displayName || m.name,
    kind: guessKind(m.name || ""),
  }));
}

async function fetchLovableGateway(key: string) {
  // Lovable AI gateway — fall back to curated list
  return [
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", kind: "text" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", kind: "text" },
    { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", kind: "text" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", kind: "text" },
    { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", kind: "image" },
    { id: "google/gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image", kind: "image" },
    { id: "openai/gpt-5", name: "GPT-5", kind: "text" },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini", kind: "text" },
    { id: "openai/gpt-5-nano", name: "GPT-5 Nano", kind: "text" },
  ];
}

function fetchAnthropicCurated() {
  return [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", kind: "text" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", kind: "text" },
    { id: "claude-3-opus-latest", name: "Claude 3 Opus", kind: "text" },
  ];
}

function guessKind(id: string): "text" | "image" | "video" {
  const s = id.toLowerCase();
  if (s.includes("image") || s.includes("dall-e") || s.includes("imagen") || s.includes("flux") || s.includes("sd")) return "image";
  if (s.includes("video") || s.includes("veo") || s.includes("sora")) return "video";
  return "text";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { provider_id } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth + admin check
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return ok({ ok: false, error: "Unauthorized" });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) return ok({ ok: false, error: "Admin only" });

    const { data: provider } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("*")
      .eq("id", provider_id)
      .maybeSingle();
    if (!provider) return ok({ ok: false, error: "Provider not found" });

    const apiKey = provider.api_key_secret_name ? Deno.env.get(provider.api_key_secret_name) || "" : "";
    const ptype = (provider.provider_type || "").toLowerCase();
    const pname = (provider.provider_name || "").toLowerCase();

    let models: any[] = [];
    try {
      if (pname.includes("openrouter")) models = await fetchOpenRouter(apiKey);
      else if (pname.includes("openai")) models = await fetchOpenAI(apiKey);
      else if (pname.includes("gemini") || pname.includes("google")) models = await fetchGemini(apiKey);
      else if (pname.includes("anthropic") || pname.includes("claude")) models = fetchAnthropicCurated();
      else if (pname.includes("lovable")) models = await fetchLovableGateway(apiKey);
      else models = await fetchLovableGateway(apiKey);
    } catch (err: any) {
      return ok({ ok: false, error: `Failed to list models: ${err.message}`, diagnostics: { provider: pname } });
    }

    await supabaseAdmin
      .from("ai_provider_settings")
      .update({ available_models: models, models_synced_at: new Date().toISOString() })
      .eq("id", provider_id);

    return ok({ ok: true, models, count: models.length });
  } catch (e: any) {
    return ok({ ok: false, error: e.message });
  }
});