import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CASHFREE_BASE = "https://api.cashfree.com/pg"; // Production
const API_VERSION = "2023-08-01";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, region } = await req.json();
    if (!plan || !region) {
      return new Response(JSON.stringify({ error: "Missing plan or region" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: "Cashfree not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pricing
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: pricing } = await adminClient
      .from("geo_pricing")
      .select("*")
      .eq("plan_name", plan)
      .eq("region", region)
      .single();

    if (!pricing) {
      return new Response(JSON.stringify({ error: "Invalid plan/region" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://sociopilot.lovable.app";
    const orderId = `sp_${user.id.slice(0, 8)}_${plan}_${Date.now()}`;
    const customerPhone = (user.user_metadata as any)?.phone || user.phone || "9999999999";
    const customerName = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Customer";

    const orderPayload = {
      order_id: orderId,
      order_amount: Number(pricing.monthly_price),
      order_currency: pricing.currency, // INR or USD
      customer_details: {
        customer_id: user.id,
        customer_email: user.email,
        customer_phone: customerPhone,
        customer_name: customerName,
      },
      order_meta: {
        return_url: `${origin}/account?payment=success&plan=${plan}&order_id={order_id}`,
        notify_url: `${supabaseUrl}/functions/v1/cashfree-webhook`,
      },
      order_note: `SocioPilot ${plan} plan (${region})`,
      order_tags: {
        user_id: user.id,
        plan,
        region,
      },
    };

    const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": API_VERSION,
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const order = await cfRes.json();
    if (!cfRes.ok) {
      console.error("Cashfree order error:", order);
      return new Response(JSON.stringify({
        error: order.message || "Cashfree order failed",
        details: order,
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending payment
    await adminClient.from("payments").insert({
      user_id: user.id,
      plan_name: plan,
      amount: pricing.monthly_price,
      currency: pricing.currency,
      region,
      payment_provider: "cashfree",
      provider_payment_id: orderId,
      status: "pending",
    });

    return new Response(JSON.stringify({
      gateway: "cashfree",
      payment_session_id: order.payment_session_id,
      order_id: order.order_id,
      payment_link: order.payment_link, // hosted page (for redirect)
      currency: pricing.currency,
      amount: pricing.monthly_price,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
