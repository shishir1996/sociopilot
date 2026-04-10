import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildCaption(item: any): string {
  const caption = item.caption || `${item.hook}\n\n${item.core_message}\n\n${item.cta}`;
  const hashtags = (item.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
  return `${caption}\n\n${hashtags}`;
}

async function postToFacebook(account: any, caption: string, imageUrl?: string) {
  if (!account.access_token) return { success: false, error: "No access token" };
  const body: any = { message: caption, access_token: account.access_token };
  let endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/feed`;
  if (imageUrl) { endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/photos`; body.url = imageUrl; }
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  return data.error ? { success: false, error: data.error.message } : { success: true, post_id: data.id };
}

async function postToInstagram(account: any, caption: string, imageUrl?: string) {
  if (!account.access_token) return { success: false, error: "No access token" };
  if (!imageUrl) return { success: false, error: "Instagram requires an image" };
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/media`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: account.access_token }),
  });
  const createData = await createRes.json();
  if (createData.error) return { success: false, error: createData.error.message };
  const pubRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/media_publish`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id, access_token: account.access_token }),
  });
  const pubData = await pubRes.json();
  return pubData.error ? { success: false, error: pubData.error.message } : { success: true, post_id: pubData.id };
}

async function postToLinkedIn(account: any, caption: string, imageUrl?: string) {
  if (!account.access_token) return { success: false, error: "No access token" };
  const shareContent: any = { shareCommentary: { text: caption }, shareMediaCategory: imageUrl ? "IMAGE" : "NONE" };
  if (imageUrl) shareContent.media = [{ status: "READY", originalUrl: imageUrl }];
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${account.access_token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author: `urn:li:person:${account.account_id}`, lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await res.json();
  return res.ok ? { success: true, post_id: data.id } : { success: false, error: JSON.stringify(data) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find scheduled content items that are due
    const now = new Date().toISOString();
    const { data: dueItems, error } = await supabase
      .from("content_items")
      .select("*, content_plans!inner(business_id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .limit(20);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueItems || dueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No posts due", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let posted = 0;
    let failed = 0;

    for (const item of dueItems) {
      const businessId = (item as any).content_plans.business_id;
      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("business_id", businessId);

      if (!accounts || accounts.length === 0) {
        await supabase.from("content_items").update({ post_error: "No social accounts connected" }).eq("id", item.id);
        failed++;
        continue;
      }

      const fullCaption = buildCaption(item);
      const imageUrl = item.image_url || null;
      const targetPlatforms = [
        (item.primary_platform || "").toLowerCase(),
        ...((item.secondary_platforms || []).map((p: string) => p.toLowerCase())),
      ];

      let hasError = false;
      const results: Record<string, any> = {};

      for (const account of accounts) {
        const platform = account.platform.toLowerCase();
        if (!targetPlatforms.some((tp: string) => platform.includes(tp) || tp.includes(platform))) continue;

        try {
          if (platform.includes("facebook")) results[account.platform] = await postToFacebook(account, fullCaption, imageUrl);
          else if (platform.includes("instagram")) results[account.platform] = await postToInstagram(account, fullCaption, imageUrl);
          else if (platform.includes("linkedin")) results[account.platform] = await postToLinkedIn(account, fullCaption, imageUrl);

          if (results[account.platform] && !results[account.platform].success) hasError = true;
        } catch (err) {
          results[account.platform] = { success: false, error: String(err) };
          hasError = true;
        }
      }

      await supabase.from("content_items").update({
        status: hasError ? "partially_posted" : "posted",
        posted_at: new Date().toISOString(),
        post_error: hasError ? JSON.stringify(results) : null,
      }).eq("id", item.id);

      hasError ? failed++ : posted++;
    }

    console.log(`Auto-post complete: ${posted} posted, ${failed} failed`);
    return new Response(JSON.stringify({ posted, failed, total: dueItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-post error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
