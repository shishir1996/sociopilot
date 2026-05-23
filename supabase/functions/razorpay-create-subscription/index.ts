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

    const { plan, billing_period, region = "india", total_count = 120 } = await req.json();
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

    // ---- Trial eligibility (lifetime, per-plan) ----
    // A user is only eligible for a free trial on a given plan if:
    //  - they have never subscribed before (has_ever_subscribed = false)
    //  - they have not already consumed the trial for this specific plan
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id, has_used_basic_trial, has_used_pro_trial, has_ever_subscribed")
      .eq("user_id", user.id)
      .maybeSingle();

    const usedThisPlanTrial =
      plan === "pro" ? !!existingSub?.has_used_pro_trial : !!existingSub?.has_used_basic_trial;
    const eligibleForTrial = !existingSub?.has_ever_subscribed && !usedThisPlanTrial;

    const trialDays = Number(settings.trial_days || 14);
    const now = new Date();
    let trialEnd: Date | null = null;
    let firstBilling: Date;
    if (eligibleForTrial) {
      trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);
      firstBilling = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), 8, 9, 0, 0);
      if (firstBilling <= trialEnd) firstBilling.setMonth(firstBilling.getMonth() + 1);
    } else {
      // No trial — charge immediately (advance 1-month payment for upgrades / returning users)
      firstBilling = new Date(now.getTime() + 60 * 1000); // ~1 minute from now
    }
    const startAt = Math.floor(firstBilling.getTime() / 1000);

    const basic = btoa(`${settings.razorpay_key_id}:${settings.razorpay_key_secret}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify({
        plan_id: planRow.razorpay_plan_id,
        total_count,
        quantity: 1,
        start_at: startAt,
        customer_notify: 1,
        notify_info: { notify_email: user.email },
        notes: {
          user_id: user.id,
          plan,
          billing_period,
          region,
          trial_end: trialEnd ? trialEnd.toISOString() : null,
          eligible_for_trial: eligibleForTrial,
        },
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

    // Only mark the subscription record. If eligible for trial, flag the trial
    // and immediately set has_used_*_trial so it can never be reused. If NOT
    // eligible, DO NOT change current plan/status — webhook will activate on
    // verified `subscription.charged` event.
    if (eligibleForTrial) {
      const subPayload: any = {
        user_id: user.id,
        plan_name: plan,
        status: "trial",
        is_trial: true,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd!.toISOString(),
        first_billing_date: firstBilling.toISOString(),
        razorpay_subscription_id: sub.id,
        starts_at: now.toISOString(),
        ends_at: firstBilling.toISOString(),
        trial_consumed_at: now.toISOString(),
        ...(plan === "pro"
          ? { has_used_pro_trial: true }
          : { has_used_basic_trial: true }),
      };
      if (existingSub) await admin.from("subscriptions").update(subPayload).eq("id", existingSub.id);
      else await admin.from("subscriptions").insert(subPayload);
    } else {
      // Record pending razorpay sub id only — preserve current plan/status until webhook.
      if (existingSub) {
        await admin
          .from("subscriptions")
          .update({ razorpay_subscription_id: sub.id })
          .eq("id", existingSub.id);
      }
      // No insert for brand-new user without trial — webhook will create on charge.
    }

    return new Response(JSON.stringify({
      ok: true,
      subscription_id: sub.id,
      short_url: sub.short_url,
      key_id: settings.razorpay_key_id,
      amount: planRow.amount,
      currency: planRow.currency,
      trial_ends_at: trialEnd ? trialEnd.toISOString() : null,
      first_billing_date: firstBilling.toISOString(),
      eligible_for_trial: eligibleForTrial,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "Unexpected error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});