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

async function postToFacebook(account: any, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  if (!account.access_token) return { success: false, error: "No access token" };

  // Carousel: multi-image post
  if (carouselUrls && carouselUrls.length > 1) {
    try {
      const photoIds: string[] = [];
      for (const url of carouselUrls) {
        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/photos`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, published: false, access_token: account.access_token }),
        });
        const pubData = await pubRes.json();
        if (pubData.id) photoIds.push(pubData.id);
      }
      if (photoIds.length < 2) return { success: false, error: "Not enough carousel images" };
      const feedRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/feed`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: caption, attached_media: photoIds.map(id => ({ media_fbid: id })), access_token: account.access_token }),
      });
      const feedData = await feedRes.json();
      return feedData.error ? { success: false, error: feedData.error.message } : { success: true, post_id: feedData.id, carousel: true };
    } catch (err) { return { success: false, error: String(err) }; }
  }

  const body: any = { message: caption, access_token: account.access_token };
  let endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/feed`;
  if (imageUrl) { endpoint = `https://graph.facebook.com/v19.0/${account.account_id}/photos`; body.url = imageUrl; }
  const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  return data.error ? { success: false, error: data.error.message } : { success: true, post_id: data.id };
}

async function postToInstagram(account: any, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  if (!account.access_token) return { success: false, error: "No access token" };

  // Instagram carousel: multi-image carousel post
  if (carouselUrls && carouselUrls.length > 1) {
    try {
      const childrenIds: string[] = [];
      for (const url of carouselUrls) {
        const childRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/media`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: account.access_token }),
        });
        const childData = await childRes.json();
        if (childData.id) childrenIds.push(childData.id);
      }
      if (childrenIds.length < 2) return { success: false, error: "Not enough carousel items" };
      const carouselRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/media`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: "CAROUSEL", children: childrenIds, caption, access_token: account.access_token }),
      });
      const carouselData = await carouselRes.json();
      if (carouselData.error) return { success: false, error: carouselData.error.message };
      const pubRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/media_publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: carouselData.id, access_token: account.access_token }),
      });
      const pubData = await pubRes.json();
      return pubData.error ? { success: false, error: pubData.error.message } : { success: true, post_id: pubData.id, carousel: true };
    } catch (err) { return { success: false, error: String(err) }; }
  }

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

async function postToLinkedInOne(accessToken: string, authorUrn: string, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  // LinkedIn carousel = PDF with each image as a page
  if (carouselUrls && carouselUrls.length > 1) {
    try {
      const pdfParts: string[] = [];
      for (const url of carouselUrls) {
        const imgRes = await fetch(url);
        if (!imgRes.ok) continue;
        const buf = await imgRes.arrayBuffer();
        pdfParts.push(btoa(String.fromCharCode(...new Uint8Array(buf))));
      }
      if (pdfParts.length > 1) {
        const pdfDataUrl = `data:application/pdf;base64,${pdfParts.join(",")}`;
        const shareContent: any = { shareCommentary: { text: caption }, shareMediaCategory: "DOCUMENT", media: [{ status: "READY", originalUrl: pdfDataUrl }] };
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
          body: JSON.stringify({ author: authorUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": shareContent }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
        });
        const data = await res.json();
        if (res.ok) return { success: true, post_id: data.id, author: authorUrn, carousel: true, slides: carouselUrls.length };
        return { success: false, error: JSON.stringify(data), author: authorUrn };
      }
    } catch (e) { console.error("LinkedIn carousel error:", e); }
  }

  const shareContent: any = { shareCommentary: { text: caption }, shareMediaCategory: imageUrl ? "IMAGE" : "NONE" };
  if (imageUrl) shareContent.media = [{ status: "READY", originalUrl: imageUrl }];
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author: authorUrn, lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await res.json();
  return res.ok ? { success: true, post_id: data.id, author: authorUrn } : { success: false, error: JSON.stringify(data), author: authorUrn };
}

async function postToLinkedIn(account: any, caption: string, imageUrl?: string) {
  if (!account.access_token) return { success: false, error: "No access token" };
  const pages: any[] = Array.isArray(account.pages) && account.pages.length > 0
    ? account.pages.filter((p: any) => p.enabled !== false)
    : [{ urn: `urn:li:person:${account.account_id}`, type: "person", name: "Personal" }];
  const carouselUrls = account.carousel_slides
    ? (Array.isArray(account.carousel_slides) ? account.carousel_slides.map((s: any) => typeof s === "string" ? s : s?.image_url).filter(Boolean) : undefined)
    : undefined;
  const results = await Promise.allSettled(
    pages.map((p) => postToLinkedInOne(account.access_token, p.urn, caption, imageUrl, carouselUrls))
  );
  const mapped = results.map((s, i) => ({
    destination: pages[i].name || pages[i].urn,
    urn: pages[i].urn,
    ...(s.status === "fulfilled" ? s.value : { success: false, error: String((s as any).reason) }),
  }));
  const allOk = mapped.every((r) => r.success);
  const anyOk = mapped.some((r) => r.success);
  return {
    success: anyOk,
    partial: !allOk && anyOk,
    destinations: mapped,
    error: allOk ? undefined : mapped.filter((r) => !r.success).map((r) => `${r.destination}: ${r.error}`).join("; "),
  };
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

      // Fetch carousel slides if this is a carousel item
      let carouselUrls: string[] | undefined;
      if (item.content_type === "Carousel" || (item as any).carousel_slides) {
        const { data: fullItem } = await supabase
          .from("content_items")
          .select("carousel_slides")
          .eq("id", item.id)
          .maybeSingle();
        if (fullItem?.carousel_slides) {
          const slides = Array.isArray(fullItem.carousel_slides)
            ? fullItem.carousel_slides
            : typeof fullItem.carousel_slides === "string" ? JSON.parse(fullItem.carousel_slides) : [];
          carouselUrls = slides.map((s: any) => typeof s === "string" ? s : s?.image_url).filter(Boolean);
        }
      }
      const useCarousel = carouselUrls && carouselUrls.length > 1;

      for (const account of accounts) {
        const platform = account.platform.toLowerCase();
        if (!targetPlatforms.some((tp: string) => platform.includes(tp) || tp.includes(platform))) continue;

        try {
          if (platform.includes("facebook")) results[account.platform] = await postToFacebook(account, fullCaption, imageUrl || (carouselUrls?.[0]), useCarousel ? carouselUrls : undefined);
          else if (platform.includes("instagram")) results[account.platform] = await postToInstagram(account, fullCaption, imageUrl || (carouselUrls?.[0]), useCarousel ? carouselUrls : undefined);
          else if (platform.includes("linkedin")) results[account.platform] = await postToLinkedIn(account, fullCaption, imageUrl || (carouselUrls?.[0]), useCarousel ? carouselUrls : undefined);

          if (results[account.platform] && !results[account.platform].success) hasError = true;
          if (results[account.platform]?.partial) hasError = true;
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
