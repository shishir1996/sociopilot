import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = Deno.env.get("APP_URL") || "";

function buildCaption(item: any): string {
  const caption = item.caption || `${item.hook}\n\n${item.core_message}\n\n${item.cta}`;
  const hashtags = (item.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
  return `${caption}\n\n${hashtags}`;
}

async function postToFacebook(account: any, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  const token = account.access_token;

  if (carouselUrls && carouselUrls.length > 0) {
    try {
      const photoIds: string[] = [];
      for (const url of carouselUrls) {
        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, published: false, access_token: token }),
        });
        const pubData = await pubRes.json();
        if (pubData.id) photoIds.push(pubData.id);
        if (pubData.error) console.error("FB carousel upload error:", pubData.error);
      }
      if (photoIds.length === 0) {
        return { success: false, error: "Failed to upload any carousel images" };
      }
      const feedRes = await fetch(`https://graph.facebook.com/v19.0/${account.account_id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullCaption,
          attached_media: photoIds.map(id => ({ media_fbid: id })),
          access_token: token,
        }),
      });
      const feedData = await feedRes.json();
      if (feedData.error) return { success: false, error: feedData.error.message };
      return { success: true, post_id: feedData.id, carousel: true, slides: photoIds.length };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  const body: any = { message: fullCaption, access_token: token };
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

async function postToInstagram(account: any, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };

  if (carouselUrls && carouselUrls.length > 1) {
    try {
      const childrenIds: string[] = [];
      for (const url of carouselUrls) {
        const childRes = await fetch(
          `https://graph.facebook.com/v19.0/${account.account_id}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: account.access_token,
            }),
          }
        );
        const childData = await childRes.json();
        if (childData.id) childrenIds.push(childData.id);
        if (childData.error) console.error("IG carousel child error:", childData.error);
      }
      if (childrenIds.length < 2) {
        return { success: false, error: "Failed to create enough carousel items for Instagram" };
      }
      const carouselRes = await fetch(
        `https://graph.facebook.com/v19.0/${account.account_id}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "CAROUSEL",
            children: childrenIds,
            caption: fullCaption,
            access_token: account.access_token,
          }),
        }
      );
      const carouselData = await carouselRes.json();
      if (carouselData.error) return { success: false, error: carouselData.error.message };
      const pubRes = await fetch(
        `https://graph.facebook.com/v19.0/${account.account_id}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: carouselData.id, access_token: account.access_token }),
        }
      );
      const pubData = await pubRes.json();
      if (pubData.error) return { success: false, error: pubData.error.message };
      return { success: true, post_id: pubData.id, carousel: true, slides: childrenIds.length };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  if (!imageUrl) return { success: false, error: "Instagram requires an image. Generate images first." };

  const createResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: fullCaption, access_token: account.access_token }),
    }
  );
  const createData = await createResponse.json();
  if (createData.error) return { success: false, error: createData.error.message };

  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: createData.id, access_token: account.access_token }),
    }
  );
  const publishData = await publishResponse.json();
  if (publishData.error) return { success: false, error: publishData.error.message };
  return { success: true, post_id: publishData.id };
}

// LinkedIn: register an upload (image/document) and get back the asset URN + upload URL
async function linkedinRegisterUpload(accessToken: string, ownerUrn: string, mediaType: "IMAGE" | "DOCUMENT"): Promise<{ assetUrn: string; uploadUrl: string } | null> {
  const recipe = mediaType === "DOCUMENT"
    ? "urn:li:digitalmediaRecipe:feedshare-document"
    : "urn:li:digitalmediaRecipe:feedshare-image";

  try {
    const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [recipe],
          owner: ownerUrn,
          serviceRelationships: [{
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          }],
        },
      }),
    });

    const regData = await regRes.json();
    if (!regRes.ok) {
      console.error("LinkedIn registerUpload error:", JSON.stringify(regData));
      return null;
    }

    const uploadUrl = regData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const assetUrn = regData?.value?.asset;

    if (!uploadUrl || !assetUrn) {
      console.error("LinkedIn registerUpload missing uploadUrl or asset:", JSON.stringify(regData));
      return null;
    }

    return { assetUrn, uploadUrl };
  } catch (e) {
    console.error("LinkedIn registerUpload exception:", e);
    return null;
  }
}

// LinkedIn: upload binary to the registered upload URL
async function linkedinUploadFile(uploadUrl: string, fileBuffer: Uint8Array): Promise<boolean> {
  try {
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: fileBuffer,
    });
    return uploadRes.ok || uploadRes.status === 201;
  } catch (e) {
    console.error("LinkedIn file upload exception:", e);
    return false;
  }
}

async function postToLinkedInOne(accessToken: string, authorUrn: string, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  // Carousel = generate proper PDF via Express endpoint, then upload as document
  if (carouselUrls && carouselUrls.length > 0) {
    try {
      let pdfUrl: string | null = null;

      // Try to generate PDF via the Express server's /api/pdf/merge endpoint
      if (APP_URL) {
        try {
          const pdfResp = await fetch(`${APP_URL}/api/pdf/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: carouselUrls, job_id: `linkedin-${Date.now()}` }),
          });
          if (pdfResp.ok) {
            const pdfData = await pdfResp.json();
            if (pdfData.ok && pdfData.pdf_url) {
              pdfUrl = pdfData.pdf_url;
            }
          }
        } catch (e) {
          console.error("PDF merge endpoint error:", e);
        }
      }

      if (!pdfUrl) {
        // Fallback: post as a single image post with first carousel image
        console.log("PDF generation unavailable, posting first carousel image as IMAGE");
        return await postToLinkedInOne(accessToken, authorUrn, fullCaption, carouselUrls[0], undefined);
      }

      // Download the PDF and register it with LinkedIn
      const pdfResp = await fetch(pdfUrl);
      if (!pdfResp.ok) throw new Error(`Failed to download PDF: ${pdfResp.status}`);

      const pdfBuffer = new Uint8Array(await pdfResp.arrayBuffer());

      const registration = await linkedinRegisterUpload(accessToken, authorUrn, "DOCUMENT");
      if (!registration) {
        return { success: false, error: "LinkedIn document registration failed", author: authorUrn };
      }

      const uploaded = await linkedinUploadFile(registration.uploadUrl, pdfBuffer);
      if (!uploaded) {
        return { success: false, error: "LinkedIn document upload failed", author: authorUrn };
      }

      // Create the post with the document
      const shareContent = {
        shareCommentary: { text: fullCaption },
        shareMediaCategory: "DOCUMENT",
        media: [{ status: "READY", media: registration.assetUrn }],
      };

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
      if (response.ok) {
        return { success: true, post_id: data.id, author: authorUrn, carousel: true, slides: carouselUrls.length };
      }
      return { success: false, error: JSON.stringify(data), author: authorUrn };
    } catch (e) {
      console.error("LinkedIn carousel PDF error:", e);
      // Fallback to single image
      if (carouselUrls[0]) {
        return await postToLinkedInOne(accessToken, authorUrn, fullCaption, carouselUrls[0], undefined);
      }
      return { success: false, error: String(e), author: authorUrn };
    }
  }

  // Single image: register upload + post
  if (imageUrl) {
    try {
      const registration = await linkedinRegisterUpload(accessToken, authorUrn, "IMAGE");
      if (!registration) {
        // Fallback: try originalUrl approach
        const shareContent: any = {
          shareCommentary: { text: fullCaption },
          shareMediaCategory: "IMAGE",
          media: [{ status: "READY", originalUrl: imageUrl }],
        };
        const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
          body: JSON.stringify({
            author: authorUrn, lifecycleState: "PUBLISHED",
            specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        const data = await response.json();
        if (response.ok) return { success: true, post_id: data.id, author: authorUrn };
        return { success: false, error: JSON.stringify(data), author: authorUrn };
      }

      // Download image and upload to LinkedIn
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`);
      const imgBuffer = new Uint8Array(await imgResp.arrayBuffer());

      const uploaded = await linkedinUploadFile(registration.uploadUrl, imgBuffer);
      if (!uploaded) {
        return { success: false, error: "LinkedIn image upload failed", author: authorUrn };
      }

      const shareContent = {
        shareCommentary: { text: fullCaption },
        shareMediaCategory: "IMAGE",
        media: [{ status: "READY", media: registration.assetUrn }],
      };

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({
          author: authorUrn, lifecycleState: "PUBLISHED",
          specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const data = await response.json();
      if (response.ok) return { success: true, post_id: data.id, author: authorUrn };
      return { success: false, error: JSON.stringify(data), author: authorUrn };
    } catch (e) {
      console.error("LinkedIn image post error:", e);
      return { success: false, error: String(e), author: authorUrn };
    }
  }

  // Text-only post
  const shareContent: any = {
    shareCommentary: { text: fullCaption },
    shareMediaCategory: "NONE",
  };
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

async function postToLinkedIn(account: any, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  const pages: any[] = Array.isArray(account.pages) && account.pages.length > 0
    ? account.pages.filter((p: any) => p.enabled !== false)
    : [{ urn: `urn:li:person:${account.account_id}`, type: "person", name: "Personal" }];
  const settled = await Promise.allSettled(
    pages.map((p) => postToLinkedInOne(account.access_token, p.urn, fullCaption, imageUrl, carouselUrls))
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

    const fullCaption = buildCaption(item);
    const imageUrl = (item as any).image_url || null;
    const carouselSlides = (item as any).carousel_slides || null;
    const carouselUrls: string[] | undefined = carouselSlides
      ? (Array.isArray(carouselSlides)
          ? carouselSlides.map((s: any) => typeof s === "string" ? s : s?.image_url).filter(Boolean)
          : [])
      : undefined;
    const useCarousel = carouselUrls && carouselUrls.length > 1;
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
          results[account.platform] = await postToFacebook(account, fullCaption, imageUrl, useCarousel ? carouselUrls : undefined);
        } else if (platform.includes("instagram")) {
          results[account.platform] = await postToInstagram(account, fullCaption, imageUrl, useCarousel ? carouselUrls : undefined);
        } else if (platform.includes("linkedin")) {
          results[account.platform] = await postToLinkedIn(account, fullCaption, imageUrl, useCarousel ? carouselUrls : undefined);
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
