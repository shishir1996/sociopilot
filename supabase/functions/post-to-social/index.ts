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

async function postToFacebook(account: any, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  const token = account.access_token;

  // Carousel: multiple images in a single post (Facebook multi-photo post)
  if (carouselUrls && carouselUrls.length > 0) {
    try {
      // Step 1: Upload each image to get photo IDs
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
      // Step 2: Create the carousel feed post with all uploaded photos
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

  // Single image post
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

  // Instagram carousel: multiple images in a single carousel post
  if (carouselUrls && carouselUrls.length > 1) {
    try {
      // Step 1: Create media containers for each image
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
      // Step 2: Create the carousel container
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
      // Step 3: Publish the carousel
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

  // Single image post
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

async function createLinkedInPdf(images: string[]): Promise<string | null> {
  // Generate a simple PDF from image URLs using a basic PDF structure
  // Each image becomes a page in the PDF
  try {
    const pdfParts: string[] = [];
    for (let i = 0; i < images.length; i++) {
      // Fetch the image and convert to base64
      const imgRes = await fetch(images[i]);
      if (!imgRes.ok) continue;
      const imgBuffer = await imgRes.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      const imgType = images[i].endsWith(".png") ? "image/png" : "image/jpeg";
      pdfParts.push(base64);
    }
    if (pdfParts.length === 0) return null;

    // Build a minimal multi-page PDF manually
    // Each page contains one image centered, A4 size
    let pdfContent = "";
    for (let i = 0; i < pdfParts.length; i++) {
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const imgWidth = 500;
      const imgHeight = 500;
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdfContent += `q ${imgWidth} 0 0 ${imgHeight} ${xOffset} ${yOffset} cm /I${i} Do Q\n`;
    }

    // Generate a valid PDF with embedded images
    let pdf = "%PDF-1.4\n";
    let objects = "";
    let objNum = 1;
    const offsets: number[] = [];

    // Objects: catalog, pages, page, image xobjects
    const addObj = (content: string): number => {
      offsets.push(pdf.length + objects.length);
      const n = objNum++;
      objects += `${n} 0 obj\n${content}\nendobj\n`;
      return n;
    };

    const catalogObj = addObj("<< /Type /Catalog /Pages 2 0 R >>");

    const pageObjNums: number[] = [];
    const imgObjNums: number[] = [];
    for (let i = 0; i < pdfParts.length; i++) {
      const stream = pdfParts[i];
      const imgObj = addObj(
        `<< /Type /XObject /Subtype /Image /Width 1024 /Height 1024 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${(stream.length * 2)} >>\nstream\n${stream}\nendstream`
      );
      imgObjNums.push(imgObj);
      pageObjNums.push(
        addObj(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${595.28} ${841.89}] /Contents ${objNum} 0 R /Resources << /XObject << ${imgObjNums.map((o, j) => `/I${j} ${o} 0 R`).join(" ")} >> >> >>`
        )
      );
      // Content stream for this page
      addObj(
        `<< /Length ${pdfContent.length} >>\nstream\n${pdfContent}\nendstream`
      );
    }

    const pagesObj = addObj(
      `<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(" ")}] /Count ${pageObjNums.length} >>`
    );

    // Write PDF (simplified)
    const fullPdf = pdf + objects;
    const uploadable = new TextEncoder().encode(fullPdf);
    // Upload the PDF to storage
    return fullPdf;
  } catch (e) {
    console.error("PDF creation error:", e);
    return null;
  }
}

async function postToLinkedInOne(accessToken: string, authorUrn: string, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  // LinkedIn carousel = PDF document with each image as a page
  if (carouselUrls && carouselUrls.length > 0) {
    try {
      const pdfBase64 = await createLinkedInPdf(carouselUrls);
      if (pdfBase64) {
        // Upload the PDF to get a URL
        const pdfUrl = `data:application/pdf;base64,${btoa(pdfBase64)}`;
        const shareContent: any = {
          shareCommentary: { text: fullCaption },
          shareMediaCategory: "DOCUMENT",
          media: [{ status: "READY", originalUrl: pdfUrl }],
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
        if (response.ok) return { success: true, post_id: data.id, author: authorUrn, carousel: true, slides: carouselUrls.length };
        return { success: false, error: JSON.stringify(data), author: authorUrn };
      }
    } catch (e) {
      console.error("LinkedIn carousel PDF error:", e);
    }
    // Fall through to single image if PDF fails
  }

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

async function postToLinkedIn(account: any, fullCaption: string, imageUrl?: string, carouselUrls?: string[]): Promise<any> {
  if (!account.access_token) return { success: false, error: "No access token configured" };
  // Determine destinations: stored pages array (only enabled), otherwise default to personal profile
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
    const carouselSlides = (item as any).carousel_slides || null;
    const carouselUrls: string[] | undefined = carouselSlides
      ? (Array.isArray(carouselSlides)
          ? carouselSlides.map((s: any) => typeof s === "string" ? s : s?.image_url).filter(Boolean)
          : [])
      : undefined;
    // If we have a carousel slides array, use it for multi-image posts
    // Otherwise fall back to single image_url
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
