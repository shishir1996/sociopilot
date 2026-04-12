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

    if (region === "india") {
      // Razorpay flow
      const razorpayKey = Deno.env.get("RAZORPAY_KEY_ID");
      const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
      
      if (!razorpayKey || !razorpaySecret) {
        return new Response(JSON.stringify({
          error: "Razorpay not configured",
          fallback: "stripe",
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Razorpay order
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${razorpayKey}:${razorpaySecret}`)}`,
        },
        body: JSON.stringify({
          amount: pricing.monthly_price * 100, // paise
          currency: "INR",
          receipt: `${user.id}_${plan}`,
          notes: { user_id: user.id, plan, email: user.email },
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(order.error?.description || "Razorpay order failed");
      }

      return new Response(JSON.stringify({
        gateway: "razorpay",
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: razorpayKey,
        user_email: user.email,
        plan,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Stripe flow
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return new Response(JSON.stringify({ error: "Stripe not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Stripe Checkout session
      const origin = req.headers.get("origin") || "https://sociopilot.lovable.app";
      const params = new URLSearchParams();
      params.append("mode", "subscription");
      params.append("success_url", `${origin}/account?payment=success&plan=${plan}`);
      params.append("cancel_url", `${origin}/pricing`);
      params.append("customer_email", user.email || "");
      params.append("line_items[0][price_data][currency]", "usd");
      params.append("line_items[0][price_data][product_data][name]", `Socio Pilot ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`);
      params.append("line_items[0][price_data][unit_amount]", String(pricing.monthly_price * 100));
      params.append("line_items[0][price_data][recurring][interval]", "month");
      params.append("line_items[0][quantity]", "1");
      params.append("metadata[user_id]", user.id);
      params.append("metadata[plan]", plan);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const session = await stripeRes.json();
      if (!stripeRes.ok) {
        throw new Error(session.error?.message || "Stripe session failed");
      }

      return new Response(JSON.stringify({
        gateway: "stripe",
        url: session.url,
        session_id: session.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
