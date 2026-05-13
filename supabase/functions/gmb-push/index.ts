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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { profile_id, fields } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return ok({ ok: false, error: "Unauthorized" });

    const { data: profile } = await supabaseAdmin
      .from("gmb_profiles")
      .select("*")
      .eq("id", profile_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return ok({ ok: false, error: "Profile not found" });

    const { data: account } = await supabaseAdmin
      .from("social_accounts")
      .select("access_token")
      .eq("id", profile.social_account_id)
      .maybeSingle();
    if (!account?.access_token) return ok({ ok: false, error: "Google Business not connected" });

    // Map app fields → Google Business fields
    const updateMask: string[] = [];
    const body: any = {};
    if (fields?.title !== undefined) { body.title = fields.title; updateMask.push("title"); }
    if (fields?.phone !== undefined) {
      body.phoneNumbers = { primaryPhone: fields.phone };
      updateMask.push("phoneNumbers");
    }
    if (fields?.website !== undefined) { body.websiteUri = fields.website; updateMask.push("websiteUri"); }
    if (fields?.description !== undefined) { body.profile = { description: fields.description }; updateMask.push("profile"); }

    if (updateMask.length === 0) return ok({ ok: false, error: "No fields to update" });

    try {
      const res = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${profile.gmb_location_id}?updateMask=${updateMask.join(",")}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        return ok({ ok: false, error: `Google API rejected the update`, diagnostics: { status: res.status, body: txt } });
      }
    } catch (e: any) {
      return ok({ ok: false, error: "Could not push to Google", diagnostics: { message: e.message } });
    }

    // Update local profile
    const localUpdate: any = {};
    if (fields?.title !== undefined) localUpdate.name = fields.title;
    if (fields?.phone !== undefined) localUpdate.phone = fields.phone;
    if (fields?.website !== undefined) localUpdate.website = fields.website;
    if (fields?.description !== undefined) localUpdate.ai_description = fields.description;
    await supabaseAdmin.from("gmb_profiles").update(localUpdate).eq("id", profile_id);

    return ok({ ok: true });
  } catch (e: any) {
    return ok({ ok: false, error: e.message });
  }
});