import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const admin = createClient(url, svc);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, billing_period, region = "india", total_count = 12 } = await req.json();
    if (!plan || !billing_period) {
      return new Response(JSON.stringify({ ok: false, error: "Missing plan/billing_period" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin.from("payment_settings").select("*").limit(1).maybeSingle();
    if (!settings?.razorpay_key_id || !settings?.razorpay_key_secret) {
      return new Response(JSON.stringify({ ok: false, error: "Razorpay not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: planRow } = await admin.from("razorpay_plans").select("*")
      .eq("plan_name", plan).eq("billing_period", billing_period)
      .eq("region", region).eq("is_active", true).maybeSingle();

    if (!planRow?.razorpay_plan_id) {
      return new Response(JSON.stringify({ ok: false, error: "Plan not configured. Contact support." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basic = btoa(`${settings.razorpay_key_id}:${settings.razorpay_key_secret}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify({
        plan_id: planRow.razorpay_plan_id,
        total_count,
        customer_notify: 1,
        notes: { user_id: user.id, plan, billing_period, region },
      }),
    });
    const sub = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("razorpay subscription error", sub);
      return new Response(JSON.stringify({ ok: false, error: sub?.error?.description || "Could not create subscription", diagnostics: sub }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("payments").insert({
      user_id: user.id, plan_name: plan, amount: planRow.amount,
      currency: planRow.currency, region, payment_provider: "razorpay",
      provider_payment_id: sub.id, status: "pending",
    });

    return new Response(JSON.stringify({
      ok: true,
      subscription_id: sub.id,
      short_url: sub.short_url,
      key_id: settings.razorpay_key_id,
      amount: planRow.amount,
      currency: planRow.currency,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "Unexpected error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});