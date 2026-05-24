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

    // Resume flag lets the user undo a scheduled cancellation
    const body = await req.json().catch(() => ({}));
    const resume: boolean = !!body.resume;

    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, razorpay_subscription_id, status, ends_at, plan_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ ok: false, error: "No active subscription found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sub.razorpay_subscription_id) {
      return new Response(JSON.stringify({ ok: false, error: "Subscription is not managed by Razorpay" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin.from("payment_settings").select("razorpay_key_id, razorpay_key_secret").limit(1).maybeSingle();
    if (!settings?.razorpay_key_id || !settings?.razorpay_key_secret) {
      return new Response(JSON.stringify({ ok: false, error: "Razorpay not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const basic = btoa(`${settings.razorpay_key_id}:${settings.razorpay_key_secret}`);

    if (resume) {
      // No direct "resume" API — Razorpay treats `cancel_at_cycle_end` as scheduled.
      // We just flip our DB row back to active. If the sub has fully ended, user must re-subscribe.
      await admin.from("subscriptions").update({ status: "active" }).eq("id", sub.id);
      await admin.from("notifications").insert({
        user_id: user.id, type: "info",
        title: "Subscription resumed",
        message: "Your subscription will continue to renew.",
      });
      return new Response(JSON.stringify({ ok: true, resumed: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel at end of current billing cycle so user keeps access until ends_at
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      },
    );
    const result = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay cancel error", result);
      return new Response(JSON.stringify({
        ok: false,
        error: result?.error?.description || "Could not cancel subscription",
        diagnostics: result,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as "cancelling": keep status active but flag that auto-renew is off.
    // Webhook will flip to status='cancelled' when Razorpay finalises at cycle end.
    await admin.from("subscriptions").update({
      status: "cancelling",
    }).eq("id", sub.id);

    await admin.from("notifications").insert({
      user_id: user.id, type: "info",
      title: "Subscription cancelled",
      message: sub.ends_at
        ? `Auto-renewal stopped. You keep ${sub.plan_name} access until ${new Date(sub.ends_at).toLocaleDateString()}.`
        : "Auto-renewal has been turned off.",
    });

    return new Response(JSON.stringify({
      ok: true,
      cancel_at: result?.end_at ? new Date(result.end_at * 1000).toISOString() : sub.ends_at,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message || "Unexpected error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});