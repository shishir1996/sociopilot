import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(b: unknown) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function computeCompleteness(loc: any): number {
  const fields = ["name", "address", "phone", "website", "category"];
  let score = 0;
  for (const f of fields) if (loc[f]) score += 15;
  if (loc.photo_count > 0) score += 10;
  if (loc.review_count > 5) score += 10;
  if (loc.verified) score += 5;
  return Math.min(100, score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { business_id } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return ok({ ok: false, error: "Unauthorized" });

    const { data: account } = await supabaseAdmin
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("business_id", business_id)
      .eq("platform", "google_business")
      .maybeSingle();

    if (!account?.access_token) {
      return ok({ ok: false, error: "Google Business not connected. Please connect it from Settings." });
    }

    // Fetch accounts → locations from Google Business Profile API
    let locations: any[] = [];
    try {
      const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${account.access_token}` },
      });
      const accJson = await accRes.json();
      const firstAccount = accJson.accounts?.[0];
      if (firstAccount) {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${firstAccount.name}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories,metadata`,
          { headers: { Authorization: `Bearer ${account.access_token}` } }
        );
        const locJson = await locRes.json();
        locations = locJson.locations || [];
      }
    } catch (e: any) {
      return ok({
        ok: false,
        error: "Could not reach Google Business Profile API. Your Google project may not yet be approved for business.manage scope.",
        diagnostics: { message: e.message },
      });
    }

    const loc = locations[0];
    if (!loc) {
      return ok({ ok: false, error: "No business locations found on this Google account." });
    }

    const profilePayload = {
      user_id: user.id,
      business_id,
      social_account_id: account.id,
      gmb_location_id: loc.name,
      name: loc.title || null,
      address: loc.storefrontAddress?.addressLines?.join(", ") || null,
      phone: loc.phoneNumbers?.primaryPhone || null,
      website: loc.websiteUri || null,
      category: loc.categories?.primaryCategory?.displayName || null,
      verified: !!loc.metadata?.hasGoogleUpdated,
      published: !!loc.metadata?.hasVoiceOfMerchant,
      last_synced_at: new Date().toISOString(),
    };
    const completeness = computeCompleteness(profilePayload);

    const { data: existing } = await supabaseAdmin
      .from("gmb_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("business_id", business_id)
      .maybeSingle();

    let profileId: string;
    if (existing) {
      profileId = existing.id;
      await supabaseAdmin
        .from("gmb_profiles")
        .update({ ...profilePayload, completeness_score: completeness })
        .eq("id", existing.id);
    } else {
      const { data: ins } = await supabaseAdmin
        .from("gmb_profiles")
        .insert({ ...profilePayload, completeness_score: completeness })
        .select("id")
        .single();
      profileId = ins!.id;
    }

    return ok({ ok: true, profile_id: profileId, completeness });
  } catch (e: any) {
    return ok({ ok: false, error: e.message });
  }
});