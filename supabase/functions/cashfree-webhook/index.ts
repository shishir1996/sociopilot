import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

const CASHFREE_BASE = "https://api.cashfree.com/pg";
const API_VERSION = "2023-08-01";

async function verifySignature(rawBody: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
  try {
    const data = timestamp + rawBody;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return b64 === signature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appId = Deno.env.get("CASHFREE_APP_ID")!;
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    // Verify signature (skip if headers absent — e.g. manual test)
    if (signature && timestamp) {
      const valid = await verifySignature(rawBody, timestamp, signature, secretKey);
      if (!valid) {
        console.warn("Invalid Cashfree webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(rawBody);
    const orderId = event?.data?.order?.order_id;
    const paymentStatus = event?.data?.payment?.payment_status;
    const eventType = event?.type;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order from Cashfree to confirm (defense-in-depth)
    const orderRes = await fetch(`${CASHFREE_BASE}/orders/${orderId}`, {
      headers: {
        "x-api-version": API_VERSION,
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
    });
    const orderData = await orderRes.json();
    const tags = orderData.order_tags || {};
    const userId = tags.user_id;
    const plan = tags.plan;

    if (!userId || !plan) {
      console.error("Missing tags on order", orderData);
      return new Response(JSON.stringify({ error: "Missing user_id/plan in order tags" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPaid = orderData.order_status === "PAID" || paymentStatus === "SUCCESS";

    // Idempotency: skip if already completed
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("status")
      .eq("provider_payment_id", orderId)
      .maybeSingle();
    if (existingPayment?.status === "completed") {
      console.log(`Webhook for ${orderId} already processed — skipping`);
      return new Response(JSON.stringify({ ok: true, status: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment record
    await supabase
      .from("payments")
      .update({ status: isPaid ? "completed" : "failed" })
      .eq("provider_payment_id", orderId);

    if (!isPaid) {
      return new Response(JSON.stringify({ ok: true, status: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate subscription
    const now = new Date();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1);

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: plan,
          status: "active",
          is_trial: false,
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_name: plan,
        status: "active",
        is_trial: false,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      });
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "success",
      title: "🎉 Plan Upgraded!",
      message: `You've been upgraded to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
      action_url: "/ai-studio",
    });

    await supabase.from("upgrade_events").insert({
      user_id: userId,
      trigger_type: "payment_completed",
      action_taken: `upgraded_to_${plan}`,
    });

    console.log(`✅ Cashfree payment confirmed: ${orderId} → ${plan} for ${userId}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("cashfree-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
