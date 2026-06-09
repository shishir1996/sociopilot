import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

// Admin email whitelist - add your email(s) here
const ADMIN_EMAILS = ["shishir.mandal@outlook.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    let user: any = null;

    // Check admin key for hardcoded admin
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = Deno.env.get("ADMIN_SECRET_KEY") || "growvix-admin-2024";
    if (adminKey === expectedKey) {
      user = { id: "hardcoded-admin", email: "admin@growvix.com" };
    } else {
      const supabase = createClient(supabaseUrl, serviceKey, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { action } = body;

    if (action === "list_users") {
      // Fetch all users from auth
      const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      // Fetch all businesses
      const { data: businesses } = await supabaseAdmin.from("businesses").select("*");
      const bizMap = new Map((businesses || []).map((b: any) => [b.user_id, b]));

      // Fetch all subscriptions
      const { data: subs } = await supabaseAdmin.from("subscriptions").select("*");
      const subMap = new Map((subs || []).map((s: any) => [s.user_id, s]));

      const users = (authUsers || [])
        .filter((u: any) => u.id !== user.id) // Exclude self
        .map((u: any) => {
          const biz = bizMap.get(u.id);
          const sub = subMap.get(u.id);
          return {
            user_id: u.id,
            email: u.email || "",
            business_name: biz?.name || null,
            industry: biz?.industry || null,
            platforms: biz?.platforms || null,
            timezone: biz?.timezone || null,
            subscription_status: sub?.status || "inactive",
            created_at: u.created_at,
          };
        });

      return new Response(JSON.stringify({ users }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_access") {
      const { target_user_id, status } = body;
      if (!target_user_id || !status) throw new Error("target_user_id and status required");

      // Upsert subscription
      const { error } = await supabaseAdmin.from("subscriptions").upsert({
        user_id: target_user_id,
        status,
        starts_at: status === "active" ? new Date().toISOString() : null,
      }, { onConflict: "user_id" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "make_admin") {
      const { target_user_id, email } = body;
      if (!target_user_id && !email) throw new Error("target_user_id or email required");
      let targetId = target_user_id;
      if (!targetId && email) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const found = (userList?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (!found) throw new Error(`User with email ${email} not found`);
        targetId = found.id;
      }
      // Insert admin role (ignore if already exists)
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: targetId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;
      await supabaseAdmin.from("admin_logs").insert({
        admin_id: user.id,
        target_user_id: targetId,
        action: "make_admin",
        details: { email },
      }).then(() => {}).catch(() => {});
      return new Response(JSON.stringify({ success: true, user_id: targetId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_user") {
      const { target_user_id } = body;
      if (!target_user_id) throw new Error("target_user_id required");

      // Delete all user data
      await supabaseAdmin.from("content_items").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("content_plans").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("social_accounts").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("businesses").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("subscriptions").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);

      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(target_user_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-users error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
