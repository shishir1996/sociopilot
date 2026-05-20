import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, svc);

    const { data: settings } = await admin.from("payment_settings").select("razorpay_webhook_secret").limit(1).maybeSingle();
    const secret = settings?.razorpay_webhook_secret;
    if (!secret) {
      console.error("No webhook secret configured");
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    if (expected !== signature) {
      console.error("Invalid signature");
      return new Response("invalid signature", { status: 400, headers: corsHeaders });
    }

    const evt = JSON.parse(raw);
    const type = evt.event as string;
    console.log("razorpay webhook event:", type);

    // One-time payment captured (credit pack)
    if (type === "payment.captured" || type === "order.paid") {
      const payment = evt.payload?.payment?.entity;
      const orderId = payment?.order_id || evt.payload?.order?.entity?.id;
      if (orderId) {
        const { data: purchase } = await admin.from("extra_pack_purchases").select("*").eq("provider_payment_id", orderId).maybeSingle();
        if (purchase && purchase.status !== "completed") {
          await admin.from("extra_pack_purchases").update({ status: "completed" }).eq("id", purchase.id);
          // Add to user_credits for current month
          const monthYear = new Date().toISOString().slice(0, 7);
          const { data: existing } = await admin.from("user_credits").select("*")
            .eq("user_id", purchase.user_id).eq("month_year", monthYear).maybeSingle();
          if (existing) {
            await admin.from("user_credits").update({
              posts_limit: existing.posts_limit + purchase.posts_added,
              credits_total: existing.credits_total + purchase.credits_added,
            }).eq("id", existing.id);
          } else {
            await admin.from("user_credits").insert({
              user_id: purchase.user_id,
              month_year: monthYear,
              posts_limit: purchase.posts_added,
              credits_total: purchase.credits_added,
            });
          }
          await admin.from("notifications").insert({
            user_id: purchase.user_id, type: "success",
            title: "Credit pack added",
            message: `${purchase.posts_added} extra posts and ${purchase.credits_added} credits added to your account.`,
          });
        }
      }
    }

    // Subscription activated / charged
    if (type === "subscription.activated" || type === "subscription.charged") {
      const sub = evt.payload?.subscription?.entity;
      const subId = sub?.id;
      const notes = sub?.notes || {};
      const userId = notes.user_id;
      const plan = notes.plan || "basic";
      const billingPeriod = notes.billing_period || "monthly";
      if (userId) {
        const endsAt = new Date();
        if (billingPeriod === "yearly") endsAt.setFullYear(endsAt.getFullYear() + 1);
        else endsAt.setMonth(endsAt.getMonth() + 1);

        const { data: existingSub } = await admin.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
        const payload: any = {
          user_id: userId, plan_name: plan, status: "active",
          starts_at: new Date().toISOString(), ends_at: endsAt.toISOString(),
          razorpay_payment_id: subId, is_trial: false,
        };
        if (existingSub) {
          await admin.from("subscriptions").update(payload).eq("id", existingSub.id);
        } else {
          await admin.from("subscriptions").insert(payload);
        }
        await admin.from("payments").update({ status: "completed" }).eq("provider_payment_id", subId);
        await admin.from("notifications").insert({
          user_id: userId, type: "success",
          title: "Subscription active",
          message: `Your ${plan} plan is now active.`,
        });
      }
    }

    if (type === "subscription.cancelled" || type === "subscription.halted") {
      const sub = evt.payload?.subscription?.entity;
      const userId = sub?.notes?.user_id;
      if (userId) {
        await admin.from("subscriptions").update({ status: "cancelled" }).eq("user_id", userId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});