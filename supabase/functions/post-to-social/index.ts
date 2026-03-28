import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content_item_id, action, scheduled_at } = await req.json();
    // action: "post_now" | "schedule"

    if (!content_item_id || !action) {
      return new Response(JSON.stringify({ error: "content_item_id and action are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the content item
    const { data: item, error: itemError } = await supabase
      .from("content_items")
      .select("*, content_plans!inner(business_id)")
      .eq("id", content_item_id)
      .eq("user_id", user.id)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Content item not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessId = (item as any).content_plans.business_id;

    // Check for social accounts
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("business_id", businessId);

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No social media accounts connected. Please connect your accounts in settings.",
        needs_setup: true 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schedule" && scheduled_at) {
      // Schedule the post
      await supabase
        .from("content_items")
        .update({ scheduled_at, status: "scheduled" })
        .eq("id", content_item_id);

      return new Response(JSON.stringify({ success: true, message: "Post scheduled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post now - attempt to post to each connected platform
    const platform = item.primary_platform?.toLowerCase() || "";
    const results: Record<string, any> = {};
    let hasError = false;

    for (const account of accounts) {
      const accountPlatform = account.platform.toLowerCase();
      
      // Only post to the primary platform and secondary platforms
      const targetPlatforms = [
        (item.primary_platform || "").toLowerCase(),
        ...((item.secondary_platforms || []).map((p: string) => p.toLowerCase())),
      ];

      if (!targetPlatforms.some(tp => accountPlatform.includes(tp) || tp.includes(accountPlatform))) {
        continue;
      }

      try {
        const caption = item.caption || `${item.hook}\n\n${item.core_message}\n\n${item.cta}`;
        const hashtags = (item.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
        const fullCaption = `${caption}\n\n${hashtags}`;

        if (accountPlatform.includes("facebook") || accountPlatform.includes("instagram")) {
          // Meta Graph API
          if (!account.access_token) {
            results[account.platform] = { success: false, error: "No access token configured" };
            hasError = true;
            continue;
          }

          if (accountPlatform.includes("facebook")) {
            const fbResponse = await fetch(
              `https://graph.facebook.com/v19.0/${account.account_id}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: fullCaption,
                  access_token: account.access_token,
                }),
              }
            );
            const fbData = await fbResponse.json();
            if (fbData.error) {
              results[account.platform] = { success: false, error: fbData.error.message };
              hasError = true;
            } else {
              results[account.platform] = { success: true, post_id: fbData.id };
            }
          }

          if (accountPlatform.includes("instagram")) {
            // Instagram requires image_url for posts
            results[account.platform] = { 
              success: false, 
              error: "Instagram posting requires a media URL. Use the Meta Business Suite for image uploads." 
            };
            hasError = true;
          }
        }

        if (accountPlatform.includes("linkedin")) {
          if (!account.access_token) {
            results[account.platform] = { success: false, error: "No access token configured" };
            hasError = true;
            continue;
          }

          const linkedinResponse = await fetch(
            "https://api.linkedin.com/v2/ugcPosts",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
              },
              body: JSON.stringify({
                author: `urn:li:person:${account.account_id}`,
                lifecycleState: "PUBLISHED",
                specificContent: {
                  "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: fullCaption },
                    shareMediaCategory: "NONE",
                  },
                },
                visibility: {
                  "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
              }),
            }
          );
          const liData = await linkedinResponse.json();
          if (linkedinResponse.ok) {
            results[account.platform] = { success: true, post_id: liData.id };
          } else {
            results[account.platform] = { success: false, error: JSON.stringify(liData) };
            hasError = true;
          }
        }

        if (accountPlatform.includes("twitter") || accountPlatform.includes("x")) {
          // X/Twitter API v2 - requires OAuth 1.0a which needs server-side signing
          results[account.platform] = { 
            success: false, 
            error: "X/Twitter posting requires OAuth 1.0a signing. Please configure your API credentials." 
          };
          hasError = true;
        }
      } catch (err) {
        results[account.platform] = { success: false, error: String(err) };
        hasError = true;
      }
    }

    // Update content item status
    const newStatus = hasError ? "partially_posted" : "posted";
    await supabase
      .from("content_items")
      .update({ 
        status: newStatus, 
        posted_at: new Date().toISOString(),
        post_error: hasError ? JSON.stringify(results) : null,
      })
      .eq("id", content_item_id);

    return new Response(JSON.stringify({ success: !hasError, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("post-to-social error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
