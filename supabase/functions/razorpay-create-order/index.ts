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
    if (!user) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { pack_id, currency = "INR" } = await req.json();
    if (!pack_id) return new Response(JSON.stringify({ ok: false, error: "Missing pack_id" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: pack } = await admin.from("credit_packs").select("*").eq("id", pack_id).eq("is_active", true).maybeSingle();
    if (!pack) return new Response(JSON.stringify({ ok: false, error: "Pack not found" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: settings } = await admin.from("payment_settings").select("*").limit(1).maybeSingle();
    if (!settings?.razorpay_key_id || !settings?.razorpay_key_secret) {
      return new Response(JSON.stringify({ ok: false, error: "Razorpay not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountUnits = currency === "USD" ? Number(pack.price_usd) : Number(pack.price_inr);
    const amountSubunits = Math.round(amountUnits * 100);

    const basic = btoa(`${settings.razorpay_key_id}:${settings.razorpay_key_secret}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify({
        amount: amountSubunits,
        currency,
        receipt: `pack_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, pack_id, type: "credit_pack" },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: order?.error?.description || "Order failed", diagnostics: order }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("extra_pack_purchases").insert({
      user_id: user.id, pack_id, posts_added: pack.posts_added,
      credits_added: pack.credits_added, amount: amountUnits, currency,
      payment_provider: "razorpay", provider_payment_id: order.id, status: "pending",
    });

    return new Response(JSON.stringify({
      ok: true,
      order_id: order.id,
      amount: amountSubunits,
      currency,
      key_id: settings.razorpay_key_id,
      pack_name: pack.name,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});