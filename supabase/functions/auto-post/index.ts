import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "";

function buildCaption(item: any): string {
  const caption = item.caption || `${item.hook}\n\n${item.core_message}\n\n${item.cta}`;
  const hashtags = (item.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
  return `${caption}\n\n${hashtags}`;
}

async function postToFacebook(account: any, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  if (!account.access_token) return { success: false, error: "No access token" };

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

// LinkedIn upload helpers
async function linkedinRegisterUpload(accessToken: string, ownerUrn: string, mediaType: "IMAGE" | "DOCUMENT"): Promise<{ assetUrn: string; uploadUrl: string } | null> {
  const recipe = mediaType === "DOCUMENT"
    ? "urn:li:digitalmediaRecipe:feedshare-document"
    : "urn:li:digitalmediaRecipe:feedshare-image";
  try {
    const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [recipe],
          owner: ownerUrn,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) { console.error("LinkedIn registerUpload error:", JSON.stringify(regData)); return null; }
    const uploadUrl = regData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const assetUrn = regData?.value?.asset;
    return uploadUrl && assetUrn ? { assetUrn, uploadUrl } : null;
  } catch (e) { console.error("LinkedIn registerUpload exception:", e); return null; }
}

async function linkedinUploadFile(uploadUrl: string, fileBuffer: Uint8Array): Promise<boolean> {
  try {
    const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: fileBuffer });
    return uploadRes.ok || uploadRes.status === 201;
  } catch { return false; }
}

async function postToLinkedInOne(accessToken: string, authorUrn: string, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  // Carousel = proper PDF via Express endpoint
  if (carouselUrls && carouselUrls.length > 0) {
    try {
      let pdfUrl: string | null = null;
      if (APP_URL) {
        try {
          const pdfResp = await fetch(`${APP_URL}/api/pdf/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: carouselUrls, job_id: `linkedin-${Date.now()}` }),
          });
          if (pdfResp.ok) {
            const pdfData = await pdfResp.json();
            if (pdfData.ok && pdfData.pdf_url) pdfUrl = pdfData.pdf_url;
          }
        } catch {}
      }

      if (!pdfUrl) {
        return await postToLinkedInOne(accessToken, authorUrn, caption, carouselUrls[0], undefined);
      }

      const pdfResp = await fetch(pdfUrl);
      if (!pdfResp.ok) throw new Error(`PDF download failed: ${pdfResp.status}`);
      const pdfBuffer = new Uint8Array(await pdfResp.arrayBuffer());

      const registration = await linkedinRegisterUpload(accessToken, authorUrn, "DOCUMENT");
      if (!registration) return { success: false, error: "Document registration failed", author: authorUrn };

      const uploaded = await linkedinUploadFile(registration.uploadUrl, pdfBuffer);
      if (!uploaded) return { success: false, error: "Document upload failed", author: authorUrn };

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({
          author: authorUrn, lifecycleState: "PUBLISHED",
          specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption }, shareMediaCategory: "DOCUMENT", media: [{ status: "READY", media: registration.assetUrn }] } },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const data = await response.json();
      if (response.ok) return { success: true, post_id: data.id, author: authorUrn, carousel: true, slides: carouselUrls.length };
      return { success: false, error: JSON.stringify(data), author: authorUrn };
    } catch (e) {
      console.error("LinkedIn carousel error:", e);
      if (carouselUrls[0]) return await postToLinkedInOne(accessToken, authorUrn, caption, carouselUrls[0], undefined);
      return { success: false, error: String(e), author: authorUrn };
    }
  }

  // Single image: register upload
  if (imageUrl) {
    try {
      const registration = await linkedinRegisterUpload(accessToken, authorUrn, "IMAGE");
      if (registration) {
        const imgResp = await fetch(imageUrl);
        if (imgResp.ok) {
          const imgBuffer = new Uint8Array(await imgResp.arrayBuffer());
          const uploaded = await linkedinUploadFile(registration.uploadUrl, imgBuffer);
          if (uploaded) {
            const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
              body: JSON.stringify({
                author: authorUrn, lifecycleState: "PUBLISHED",
                specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption }, shareMediaCategory: "IMAGE", media: [{ status: "READY", media: registration.assetUrn }] } },
                visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
              }),
            });
            const data = await response.json();
            if (response.ok) return { success: true, post_id: data.id, author: authorUrn };
          }
        }
      }
      // Fallback: originalUrl
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({
          author: authorUrn, lifecycleState: "PUBLISHED",
          specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption }, shareMediaCategory: "IMAGE", media: [{ status: "READY", originalUrl: imageUrl }] } },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const data = await response.json();
      if (response.ok) return { success: true, post_id: data.id, author: authorUrn };
      return { success: false, error: JSON.stringify(data), author: authorUrn };
    } catch (e) {
      return { success: false, error: String(e), author: authorUrn };
    }
  }

  // Text only
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author: authorUrn, lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption }, shareMediaCategory: "NONE" } },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await response.json();
  return response.ok ? { success: true, post_id: data.id, author: authorUrn } : { success: false, error: JSON.stringify(data), author: authorUrn };
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

    const now = new Date().toISOString();
    const { data: dueItems, error } = await supabase
      .from("content_items")
      .select("*, content_plans!inner(business_id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .limit(20);

    if (error) {
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

      // Fetch carousel slides
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
          else if (platform.includes("linkedin")) {
            // For LinkedIn we need to pass carousel URLs if available
            results[account.platform] = await postToLinkedIn(account, fullCaption, imageUrl || (carouselUrls?.[0]));
          }

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
