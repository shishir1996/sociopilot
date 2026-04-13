import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import {
  ArrowLeft, Shield, Loader2, UserCog, Calendar, BarChart3,
  Crown, LogIn, RotateCcw, Ban, Pencil, Save
} from "lucide-react";

export default function AdminUserDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("id");
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [contentCount, setContentCount] = useState(0);
  const [regenCount, setRegenCount] = useState(0);
  const [weeklyGens, setWeeklyGens] = useState(0);
  const [editPlan, setEditPlan] = useState(false);
  const [newPlan, setNewPlan] = useState("");

  useEffect(() => {
    if (user && targetUserId) checkAdminAndFetch();
  }, [user, targetUserId]);

  const checkAdminAndFetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (data && data.length > 0) {
      setIsAdmin(true);
      await fetchUserDetails();
    }
    setLoading(false);
  };

  const fetchUserDetails = async () => {
    if (!targetUserId) return;
    // Fetch via edge function
    const { data } = await supabase.functions.invoke("admin-users", {
      body: { action: "list_users" },
    });
    const found = data?.users?.find((u: any) => u.user_id === targetUserId);
    setTargetUser(found || { user_id: targetUserId, email: "Unknown" });

    // Fetch subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .limit(1);
    const sub = subData?.[0] || null;
    setSubscription(sub);
    setNewPlan(sub?.plan_name || "free_trial");

    // Fetch business
    const { data: bizResp } = await supabase.functions.invoke("admin-users", {
      body: { action: "list_users" },
    });

    // Content count
    const { count } = await supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);
    setContentCount(count || 0);

    // Regen count
    const { count: rc } = await supabase
      .from("regeneration_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);
    setRegenCount(rc || 0);

    // Weekly gen count
    const { count: wc } = await supabase
      .from("weekly_generation_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);
    setWeeklyGens(wc || 0);
  };

  const handleChangePlan = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "toggle_access",
          target_user_id: targetUserId,
          status: "active",
        },
      });
      // Update plan name via direct subscription update (admin has RLS access)
      await supabase
        .from("subscriptions")
        .update({ plan_name: newPlan, is_trial: newPlan === "free_trial", status: "active" })
        .eq("user_id", targetUserId);

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user!.id,
        target_user_id: targetUserId,
        action: "change_plan",
        details: { new_plan: newPlan },
      });

      toast({ title: "Plan Updated", description: `User plan changed to ${newPlan}` });
      setEditPlan(false);
      await fetchUserDetails();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleExtendTrial = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 7);
      await supabase
        .from("subscriptions")
        .update({ trial_ends_at: newEnd.toISOString(), is_trial: true, status: "active" })
        .eq("user_id", targetUserId);
      await supabase.from("admin_logs").insert({
        admin_id: user!.id,
        target_user_id: targetUserId,
        action: "extend_trial",
        details: { new_end: newEnd.toISOString() },
      });
      toast({ title: "Trial Extended", description: "Trial extended by 7 days" });
      await fetchUserDetails();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleDisableUser = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_access", target_user_id: targetUserId, status: "inactive" },
      });
      await supabase.from("admin_logs").insert({
        admin_id: user!.id,
        target_user_id: targetUserId,
        action: "disable_user",
      });
      toast({ title: "User Disabled" });
      await fetchUserDetails();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleLoginAsUser = async () => {
    if (!targetUserId) return;
    // Store admin session info for return
    localStorage.setItem("admin_impersonation", JSON.stringify({
      admin_id: user!.id,
      target_user_id: targetUserId,
      target_email: targetUser?.email,
      started_at: new Date().toISOString(),
    }));
    await supabase.from("admin_logs").insert({
      admin_id: user!.id,
      target_user_id: targetUserId,
      action: "login_as_user",
    });
    toast({
      title: "Impersonation Mode",
      description: `Viewing as ${targetUser?.email}. A banner will show at the top. Click 'Exit' to return.`,
    });
    navigate(`/?impersonate=${targetUserId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <Button onClick={() => navigate("/admin")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <UserCog className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-heading font-bold text-foreground">User Detail</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoginAsUser}
            className="text-xs"
          >
            <LogIn className="h-3.5 w-3.5 mr-1" /> Login as User
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              User Info
              {subscription && (
                <PlanBadge planName={subscription.plan_name || "free_trial"} isTrial={subscription.is_trial} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium text-foreground">{targetUser?.email || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Business</Label>
              <p className="text-sm font-medium text-foreground">{targetUser?.business_name || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Industry</Label>
              <p className="text-sm font-medium text-foreground">{targetUser?.industry || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Joined</Label>
              <p className="text-sm font-medium text-foreground">
                {targetUser?.created_at ? new Date(targetUser.created_at).toLocaleDateString() : "—"}
              </p>
            </div>
            {subscription && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Trial Start</Label>
                  <p className="text-sm font-medium text-foreground">
                    {subscription.trial_started_at ? new Date(subscription.trial_started_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Trial End</Label>
                  <p className="text-sm font-medium text-foreground">
                    {subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{contentCount}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{weeklyGens}</p>
              <p className="text-xs text-muted-foreground">Weekly Generations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{regenCount}</p>
              <p className="text-xs text-muted-foreground">Regenerations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {subscription?.status || "inactive"}
              </p>
              <p className="text-xs text-muted-foreground">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Plan */}
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-sm min-w-[100px]">Change Plan:</Label>
              {editPlan ? (
                <div className="flex items-center gap-2">
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger className="w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_trial">Free Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleChangePlan} disabled={actionLoading}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditPlan(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditPlan(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Plan
                </Button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleExtendTrial} disabled={actionLoading}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> Extend Trial (+7 days)
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDisableUser} disabled={actionLoading}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Disable User
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
