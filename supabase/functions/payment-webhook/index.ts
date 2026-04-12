import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { gateway, user_id, plan, payment_id, order_id } = body;

    if (!user_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing user_id or plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update or create subscription
    const now = new Date().toISOString();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1);

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: plan,
          status: "active",
          is_trial: false,
          starts_at: now,
          ends_at: endsAt.toISOString(),
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        user_id,
        plan_name: plan,
        status: "active",
        is_trial: false,
        starts_at: now,
        ends_at: endsAt.toISOString(),
      });
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id,
      type: "success",
      title: "🎉 Plan Upgraded!",
      message: `You've been upgraded to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Enjoy your new features!`,
      action_url: "/ai-studio",
    });

    // Log upgrade event
    await supabase.from("upgrade_events").insert({
      user_id,
      trigger_type: "payment_completed",
      action_taken: `upgraded_to_${plan}`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
