import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildCaption(item: any): string {
  const caption = item.caption || `${item.hook}\n\n${item.core_message}\n\n${item.cta}`;
  const hashtags = (item.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
  return `${caption}\n\n${hashtags}`;
}

async function postToFacebook(account: any, fullCaption: string, imageUrl?: string): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };

  const body: any = {
    message: fullCaption,
    access_token: account.access_token,
  };

  // If we have an image, post as a photo
  let endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/feed`;
  if (imageUrl) {
    endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/photos`;
    body.url = imageUrl;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.error) return { success: false, error: data.error.message };
  return { success: true, post_id: data.id };
}

async function postToInstagram(account: any, fullCaption: string, imageUrl?: string): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  if (!imageUrl) return { success: false, error: "Instagram requires an image. Generate images first." };

  // Step 1: Create media container
  const createResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: fullCaption,
        access_token: account.access_token,
      }),
    }
  );
  const createData = await createResponse.json();
  if (createData.error) return { success: false, error: createData.error.message };

  // Step 2: Publish the container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: account.access_token,
      }),
    }
  );
  const publishData = await publishResponse.json();
  if (publishData.error) return { success: false, error: publishData.error.message };
  return { success: true, post_id: publishData.id };
}

async function postToLinkedInOne(accessToken: string, authorUrn: string, fullCaption: string, imageUrl?: string): Promise<any> {
  const shareContent: any = {
    shareCommentary: { text: fullCaption },
    shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
  };
  if (imageUrl) {
    shareContent.media = [{ status: "READY", originalUrl: imageUrl }];
  }
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await response.json();
  if (response.ok) return { success: true, post_id: data.id, author: authorUrn };
  return { success: false, error: JSON.stringify(data), author: authorUrn };
}

async function postToLinkedIn(account: any, fullCaption: string, imageUrl?: string): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  // Determine destinations: stored pages array, otherwise default to personal profile
  const pages: any[] = Array.isArray(account.pages) && account.pages.length > 0
    ? account.pages
    : [{ urn: `urn:li:person:${account.account_id}`, type: "person", name: "Personal" }];
  const settled = await Promise.allSettled(
    pages.map((p) => postToLinkedInOne(account.access_token, p.urn, fullCaption, imageUrl))
  );
  const results = settled.map((s, i) => ({
    destination: pages[i].name || pages[i].urn,
    urn: pages[i].urn,
    ...(s.status === "fulfilled" ? s.value : { success: false, error: String((s as any).reason) }),
  }));
  const allOk = results.every((r) => r.success);
  const anyOk = results.some((r) => r.success);
  console.log("LinkedIn fan-out results:", JSON.stringify(results));
  return {
    success: anyOk,
    partial: !allOk && anyOk,
    destinations: results,
    error: allOk ? undefined : results.filter((r) => !r.success).map((r) => `${r.destination}: ${r.error}`).join("; "),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content_item_id, action, scheduled_at } = await req.json();
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
        needs_setup: true,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schedule" && scheduled_at) {
      await supabase
        .from("content_items")
        .update({ scheduled_at, status: "scheduled" })
        .eq("id", content_item_id);

      return new Response(JSON.stringify({ success: true, message: "Post scheduled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post now
    const fullCaption = buildCaption(item);
    const imageUrl = (item as any).image_url || null;
    const results: Record<string, any> = {};
    let hasError = false;

    const targetPlatforms = [
      (item.primary_platform || "").toLowerCase(),
      ...((item.secondary_platforms || []).map((p: string) => p.toLowerCase())),
    ];

    for (const account of accounts) {
      const platform = account.platform.toLowerCase();
      if (!targetPlatforms.some((tp: string) => platform.includes(tp) || tp.includes(platform))) continue;

      try {
        if (platform.includes("facebook")) {
          results[account.platform] = await postToFacebook(account, fullCaption, imageUrl);
        } else if (platform.includes("instagram")) {
          results[account.platform] = await postToInstagram(account, fullCaption, imageUrl);
        } else if (platform.includes("linkedin")) {
          results[account.platform] = await postToLinkedIn(account, fullCaption, imageUrl);
        } else if (platform.includes("twitter") || platform.includes("x")) {
          results[account.platform] = {
            success: false,
            error: "X/Twitter posting requires OAuth 1.0a signing. Please configure your API credentials.",
          };
        }

        if (results[account.platform] && !results[account.platform].success) {
          hasError = true;
        }
      } catch (err) {
        results[account.platform] = { success: false, error: String(err) };
        hasError = true;
      }
    }

    // Update status
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
