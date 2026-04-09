import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roleData || roleData.length === 0) throw new Error("Admin access required");

    const body = await req.json();
    const { action, table, data, id } = body;

    const allowedTables = [
      "ai_provider_settings", "ai_prompt_templates", "ai_plan_limits",
      "ai_feature_flags",
    ];
    if (!allowedTables.includes(table)) throw new Error("Invalid table");

    let result: any;

    switch (action) {
      case "list": {
        const { data: rows, error } = await supabaseAdmin.from(table).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        result = rows;
        break;
      }
      case "get": {
        const { data: row, error } = await supabaseAdmin.from(table).select("*").eq("id", id).single();
        if (error) throw error;
        result = row;
        break;
      }
      case "create": {
        const { data: row, error } = await supabaseAdmin.from(table).insert(data).select().single();
        if (error) throw error;
        result = row;
        break;
      }
      case "update": {
        const { data: row, error } = await supabaseAdmin.from(table).update(data).eq("id", id).select().single();
        if (error) throw error;
        result = row;
        break;
      }
      case "delete": {
        const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
        if (error) throw error;
        result = { deleted: true };
        break;
      }
      case "usage_stats": {
        // Get usage statistics for admin dashboard
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [totalRes, monthRes, weekRes, errRes, textRes, imageRes] = await Promise.all([
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }).gte("created_at", monthStart).eq("status", "success"),
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }).gte("created_at", weekStart).eq("status", "success"),
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("status", "error"),
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("generation_type", "text").eq("status", "success"),
          supabaseAdmin.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("generation_type", "image").eq("status", "success"),
        ]);

        // Recent logs
        const { data: recentLogs } = await supabaseAdmin
          .from("ai_usage_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        result = {
          total_generations: totalRes.count || 0,
          month_generations: monthRes.count || 0,
          week_generations: weekRes.count || 0,
          total_errors: errRes.count || 0,
          text_generations: textRes.count || 0,
          image_generations: imageRes.count || 0,
          recent_logs: recentLogs || [],
        };
        break;
      }
      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ai-admin-settings error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Admin access required" ? 403 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
