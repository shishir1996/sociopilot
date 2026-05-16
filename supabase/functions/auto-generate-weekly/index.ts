import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all businesses with auto_generate_enabled = true
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("id, user_id")
      .eq("auto_generate_enabled", true);

    if (bizError || !businesses || businesses.length === 0) {
      console.log("No businesses with auto-generate enabled");
      return new Response(JSON.stringify({ message: "No businesses to process", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    let skipped = 0;

    for (const biz of businesses) {
      // Check if the business has connected social accounts
      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("business_id", biz.id)
        .limit(1);

      if (!accounts || accounts.length === 0) {
        console.log(`Skipping business ${biz.id}: no social accounts connected`);
        skipped++;
        continue;
      }

      // Check if there's a posting schedule configured
      const { data: schedules } = await supabase
        .from("posting_schedules")
        .select("id")
        .eq("business_id", biz.id)
        .limit(1);

      if (!schedules || schedules.length === 0) {
        console.log(`Skipping business ${biz.id}: no posting schedule configured`);
        skipped++;
        continue;
      }

      // Call generate-content function for this business
      const generateUrl = `${supabaseUrl}/functions/v1/generate-content`;

      // Create a service-role authenticated call impersonating the user
      const { data: { session }, error: sessionError } = await supabase.auth.admin.getUserById(biz.user_id);
      
      // Use service role key directly with user context
      const response = await fetch(generateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ business_id: biz.id, auto_generated: true }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          console.log(`Auto-generated week for business ${biz.id}, plan: ${result.plan_id}`);
          
          // Now schedule the content items based on posting_schedules
          await scheduleContentItems(supabase, biz.id, result.plan_id);
          generated++;
        } else {
          console.error(`Generation failed for ${biz.id}:`, result.error);
          skipped++;
        }
      } else {
        console.error(`HTTP error for ${biz.id}:`, response.status);
        skipped++;
      }
    }

    console.log(`Auto-generate complete: ${generated} generated, ${skipped} skipped`);
    return new Response(JSON.stringify({ generated, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-generate-weekly error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function scheduleContentItems(supabase: any, businessId: string, planId: string) {
  // Fetch posting schedules for this business
  const { data: schedules } = await supabase
    .from("posting_schedules")
    .select("*")
    .eq("business_id", businessId)
    .eq("enabled", true)
    .order("day_of_week", { ascending: true });

  if (!schedules || schedules.length === 0) return;

  // Fetch the content items for this plan
  const { data: items } = await supabase
    .from("content_items")
    .select("id, day_number")
    .eq("plan_id", planId)
    .order("day_number", { ascending: true });

  if (!items || items.length === 0) return;

  // Map day_number → next occurrence starting today (today-first).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDow = today.getDay();
  // Build ordered upcoming slots (next 7 days that have a schedule)
  const slots: Array<{ date: Date; platforms: string[] }> = [];
  for (let i = 0; i < 14 && slots.length < 7; i++) {
    const dow = (todayDow + i) % 7;
    const sched = schedules.find((s: any) => s.day_of_week === dow);
    if (!sched) continue;
    const [hh, mm] = String(sched.posting_time || "10:00").split(":").map(Number);
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(hh || 10, mm || 0, 0, 0);
    slots.push({ date: d, platforms: sched.platforms || [] });
  }
  for (let idx = 0; idx < items.length && idx < slots.length; idx++) {
    const item = items[idx];
    const slot = slots[idx];
    await supabase.from("content_items").update({
      scheduled_at: slot.date.toISOString(),
      status: "scheduled",
      primary_platform: slot.platforms[0] || "",
      secondary_platforms: slot.platforms.slice(1) || [],
    }).eq("id", item.id);
  }
}
