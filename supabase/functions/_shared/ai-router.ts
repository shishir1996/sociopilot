export type AiProvider = {
  id?: string;
  provider_type?: string;
  provider_name: string;
  model_name?: string;
  api_key_secret_name?: string | null;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  is_fallback?: boolean;
  priority?: number;
  health_status?: string;
  failure_count?: number;
};

export function buildProviderChain(providers: AiProvider[], providerType: string, builtInFallback?: AiProvider): AiProvider[] {
  const configured = (providers || [])
    .filter((p) => p.provider_type === providerType && p.health_status !== "down")
    .sort((a, b) => {
      const pa = Number(a.priority ?? 100);
      const pb = Number(b.priority ?? 100);
      if (pa !== pb) return pa - pb;
      if (!!a.is_fallback !== !!b.is_fallback) return a.is_fallback ? 1 : -1;
      return String(a.provider_name).localeCompare(String(b.provider_name));
    });

  if (!builtInFallback) return configured;
  const hasBuiltIn = configured.some((p) => p.provider_name === builtInFallback.provider_name);
  return hasBuiltIn ? configured : [...configured, builtInFallback];
}

export function providerEndpoint(name: string): string {
  if (name === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (name === "openai") return "https://api.openai.com/v1/chat/completions";
  if (name === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (name === "together") return "https://api.together.xyz/v1/chat/completions";
  if (name === "anthropic") return "https://api.anthropic.com/v1/messages";
  if (name === "deepseek") return "https://api.deepseek.com/chat/completions";
  return "https://ai.gateway.lovable.dev/v1/chat/completions";
}

export function resolveApiKey(provider: AiProvider): string {
  const raw = (provider?.api_key_secret_name || "").trim();
  if (raw) {
    const looksLikeRawKey = /^(sk-|pk-|key-|Bearer\s)/i.test(raw) || raw.length > 40;
    if (looksLikeRawKey) return raw.replace(/^Bearer\s+/i, "");
    const key = Deno.env.get(raw);
    if (key) return key;
  }
  if (provider?.provider_name === "lovable") return Deno.env.get("LOVABLE_API_KEY") || "";
  return "";
}
