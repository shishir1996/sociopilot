import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Platform OAuth URLs
const OAUTH_CONFIGS: Record<string, { authUrl: string; tokenUrl: string; scopes: string }> = {
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "openid,profile,w_member_social",
  },
  x_twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    scopes: "tweet.read,tweet.write,users.read,offline.access",
  },
  google_business: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/business.manage",
  },
};

// Settings stored in Vault-like pattern using a simple KV in a DB table
// For now we use a dedicated table or env-based approach
// We'll use a simple approach: store in ai_provider_settings with provider_type='social_oauth'

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin for admin actions
    const isAdminAction = ["get_admin_settings", "save_admin_settings"].includes(action);
    if (isAdminAction) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    switch (action) {
      case "get_admin_settings": {
        // Fetch social OAuth settings stored in ai_provider_settings with provider_type='social_oauth'
        const { data: settings } = await supabaseAdmin
          .from("ai_provider_settings")
          .select("*")
          .eq("provider_type", "social_oauth");

        const result: Record<string, any> = {};
        (settings || []).forEach((s: any) => {
          result[s.provider_name] = {
            enabled: s.is_active,
            values: s.config_json || {},
          };
        });

        return new Response(JSON.stringify({ settings: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "save_admin_settings": {
        const { platform, enabled, credentials } = body;

        if (!platform || typeof credentials !== "object") {
          return new Response(JSON.stringify({ error: "Missing platform or credentials" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert into ai_provider_settings
        const { data: existing, error: selErr } = await supabaseAdmin
          .from("ai_provider_settings")
          .select("id")
          .eq("provider_type", "social_oauth")
          .eq("provider_name", platform)
          .maybeSingle();

        if (selErr) {
          console.error("Select error:", selErr);
          return new Response(JSON.stringify({ error: `DB read failed: ${selErr.message}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let writeErr: any = null;
        if (existing) {
          const { error } = await supabaseAdmin
            .from("ai_provider_settings")
            .update({
              is_active: enabled,
              config_json: credentials,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select()
            .single();
          writeErr = error;
        } else {
          const { error } = await supabaseAdmin
            .from("ai_provider_settings")
            .insert({
              provider_type: "social_oauth",
              provider_name: platform,
              model_name: platform,
              is_active: enabled,
              config_json: credentials,
            })
            .select()
            .single();
          writeErr = error;
        }

        if (writeErr) {
          console.error("Write error:", writeErr);
          return new Response(JSON.stringify({ error: `Save failed: ${writeErr.message}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log admin action (non-blocking)
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: user.id,
          action: `social_oauth_${enabled ? "enabled" : "disabled"}_${platform}`,
          details: { platform },
        });

        return new Response(JSON.stringify({ ok: true, saved: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_oauth_url": {
        const { platform, redirect_uri, business_id } = body;

        // Get admin credentials for this platform
        const { data: config } = await supabaseAdmin
          .from("ai_provider_settings")
          .select("config_json, is_active")
          .eq("provider_type", "social_oauth")
          .eq("provider_name", platform)
          .maybeSingle();

        if (!config || !config.is_active) {
          return new Response(
            JSON.stringify({ error: `${platform} integration is not configured by admin.` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const creds = config.config_json as Record<string, string>;
        const oauthConfig = OAUTH_CONFIGS[platform];
        if (!oauthConfig) {
          return new Response(
            JSON.stringify({ error: "Unsupported platform" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clientId = creds.app_id || creds.client_id || creds.api_key || "";
        const state = btoa(JSON.stringify({ user_id: user.id, platform, business_id, redirect_uri }));

        let authUrl: string;
        if (platform === "x_twitter") {
          // Twitter uses PKCE
          const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
          const encoder = new TextEncoder();
          const data = encoder.encode(codeVerifier);
          const digest = await crypto.subtle.digest("SHA-256", data);
          const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

          // Store code_verifier temporarily (use state to pass it)
          const twitterState = btoa(JSON.stringify({
            user_id: user.id, platform, business_id, redirect_uri, code_verifier: codeVerifier,
          }));

          authUrl = `${oauthConfig.authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(oauthConfig.scopes)}&state=${twitterState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        } else {
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirect_uri,
            scope: oauthConfig.scopes,
            response_type: "code",
            state: state,
          });
          if (platform === "google_business") {
            params.set("access_type", "offline");
            params.set("prompt", "consent");
          }
          authUrl = `${oauthConfig.authUrl}?${params.toString()}`;
        }

        return new Response(JSON.stringify({ url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange_token": {
        const { platform, code, redirect_uri, state: stateStr, business_id } = body;

        // Get admin credentials
        const { data: config } = await supabaseAdmin
          .from("ai_provider_settings")
          .select("config_json")
          .eq("provider_type", "social_oauth")
          .eq("provider_name", platform)
          .maybeSingle();

        if (!config) {
          return new Response(
            JSON.stringify({ error: "Platform not configured" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const creds = config.config_json as Record<string, string>;
        const oauthConfig = OAUTH_CONFIGS[platform];
        const clientId = creds.app_id || creds.client_id || creds.api_key || "";
        const clientSecret = creds.app_secret || creds.client_secret || creds.api_secret || "";

        let tokenBody: Record<string, string>;
        const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };

        if (platform === "x_twitter") {
          // Parse state for code_verifier
          let codeVerifier = "";
          try {
            const stateData = JSON.parse(atob(stateStr));
            codeVerifier = stateData.code_verifier || "";
          } catch {}

          tokenBody = {
            grant_type: "authorization_code",
            code,
            redirect_uri,
            code_verifier: codeVerifier,
            client_id: clientId,
          };
          headers["Authorization"] = "Basic " + btoa(`${clientId}:${clientSecret}`);
        } else {
          tokenBody = {
            grant_type: "authorization_code",
            code,
            redirect_uri,
            client_id: clientId,
            client_secret: clientSecret,
          };
        }

        const tokenRes = await fetch(oauthConfig.tokenUrl, {
          method: "POST",
          headers,
          body: new URLSearchParams(tokenBody).toString(),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          return new Response(
            JSON.stringify({ error: tokenData.error_description || tokenData.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token || null;
        const expiresIn = tokenData.expires_in;
        const expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null;

        // Fetch account info
        let accountName = platform;
        let accountId = "";

        try {
          if (platform === "facebook") {
            const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
            const me = await meRes.json();
            accountName = me.name || "Facebook User";
            accountId = me.id || "";
          } else if (platform === "linkedin") {
            const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const me = await meRes.json();
            accountName = me.name || "LinkedIn User";
            accountId = me.sub || "";
          } else if (platform === "x_twitter") {
            const meRes = await fetch("https://api.x.com/2/users/me", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const me = await meRes.json();
            accountName = me.data?.name || "X User";
            accountId = me.data?.id || "";
          } else if (platform === "google_business") {
            const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const me = await meRes.json();
            accountName = me.name || "Google User";
            accountId = me.id || "";
          }
        } catch (err) {
          console.error("Error fetching account info:", err);
        }

        // Use the business_id from body or try state
        const finalBusinessId = business_id || (() => {
          try { return JSON.parse(atob(stateStr)).business_id; } catch { return null; }
        })();

        if (!finalBusinessId) {
          return new Response(
            JSON.stringify({ error: "No business_id provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Upsert social account
        const { data: existing } = await supabaseAdmin
          .from("social_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("business_id", finalBusinessId)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from("social_accounts")
            .update({
              access_token: accessToken,
              refresh_token: refreshToken,
              account_name: accountName,
              account_id: accountId,
              expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin
            .from("social_accounts")
            .insert({
              user_id: user.id,
              business_id: finalBusinessId,
              platform,
              access_token: accessToken,
              refresh_token: refreshToken,
              account_name: accountName,
              account_id: accountId,
              expires_at: expiresAt,
            });
        }

        return new Response(
          JSON.stringify({ ok: true, account_name: accountName, account_id: accountId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_platforms": {
        // Return which platforms are enabled by admin
        const { data: settings } = await supabaseAdmin
          .from("ai_provider_settings")
          .select("provider_name, is_active")
          .eq("provider_type", "social_oauth")
          .eq("is_active", true);

        const enabledPlatforms = (settings || []).map((s: any) => s.provider_name);
        return new Response(JSON.stringify({ platforms: enabledPlatforms }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
