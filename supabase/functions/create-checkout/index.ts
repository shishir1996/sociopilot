import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CASHFREE_BASE = "https://api.cashfree.com/pg"; // Production
const API_VERSION = "2023-08-01";

// Approx USD→INR conversion for merchants without USD enabled.
// Cashfree India merchants accept INR only by default; we convert global pricing to INR
// so payments succeed for everyone. Adjust rate as needed (or fetch live).
const USD_TO_INR = 84;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let paymentRecordId: string | null = null;
  let adminClient: any = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    adminClient = createClient(supabaseUrl, serviceKey);

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
      return new Response(JSON.stringify({ error: "Payment gateway not configured. Please contact support." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pricing
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

    // Resolve charge currency. Cashfree India merchants accept INR by default.
    // If pricing is USD, convert to INR for the actual charge so all customers can pay.
    let chargeCurrency = pricing.currency as string;
    let chargeAmount = Number(pricing.monthly_price);
    if (chargeCurrency === "USD") {
      chargeAmount = Math.round(chargeAmount * USD_TO_INR);
      chargeCurrency = "INR";
    }

    const origin = req.headers.get("origin") || "https://growvix.offdx.in";
    const orderId = `sp_${user.id.slice(0, 8)}_${plan}_${Date.now()}`;
    const customerPhone = (user.user_metadata as any)?.phone || user.phone || "9999999999";
    const customerName = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Customer";

    // Insert pending payment FIRST so we can mark it failed if anything goes wrong
    const { data: paymentRecord } = await adminClient.from("payments").insert({
      user_id: user.id,
      plan_name: plan,
      amount: chargeAmount,
      currency: chargeCurrency,
      region,
      payment_provider: "cashfree",
      provider_payment_id: orderId,
      status: "pending",
    }).select("id").single();
    paymentRecordId = paymentRecord?.id || null;

    const orderPayload = {
      order_id: orderId,
      order_amount: chargeAmount,
      order_currency: chargeCurrency,
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
      order_note: `Growvix ${plan} plan (${region})`,
      order_tags: {
        user_id: user.id,
        plan,
        region,
        original_currency: pricing.currency,
        original_amount: String(pricing.monthly_price),
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
    console.log("Cashfree order response:", JSON.stringify(order));
    if (!cfRes.ok) {
      console.error("Cashfree order error:", order);
      // Mark pending payment as failed immediately to allow retry
      if (paymentRecordId) {
        await adminClient.from("payments").update({ status: "failed" }).eq("id", paymentRecordId);
      }
      const friendly =
        order?.message?.includes("Currency not enabled")
          ? "This currency isn't enabled on the payment gateway yet. Please contact support."
          : order?.message || "Could not create payment order. Please try again.";
      return new Response(JSON.stringify({
        error: friendly,
        details: order,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cashfree Orders API returns payment_session_id; build hosted checkout URL ourselves.
    // (payment_link is only present on the separate Payment Links API.)
    const sessionId = order.payment_session_id;
    if (!sessionId) {
      if (paymentRecordId) {
        await adminClient.from("payments").update({ status: "failed" }).eq("id", paymentRecordId);
      }
      return new Response(JSON.stringify({
        error: "Payment gateway did not return a session. Please try again or contact support.",
        details: order,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hostedCheckoutUrl = `https://payments.cashfree.com/pay/${sessionId}`;

    return new Response(JSON.stringify({
      gateway: "cashfree",
      payment_session_id: sessionId,
      order_id: order.order_id,
      payment_link: hostedCheckoutUrl,
      mode: "production",
      currency: chargeCurrency,
      amount: chargeAmount,
      original_currency: pricing.currency,
      original_amount: pricing.monthly_price,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-checkout error:", err);
    if (paymentRecordId && adminClient) {
      try {
        await adminClient.from("payments").update({ status: "failed" }).eq("id", paymentRecordId);
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
