import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, User, Crown, CreditCard, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useGeoPricing } from "@/hooks/useGeoPricing";
import { CreditPacks } from "@/components/account/CreditPacks";

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const { currencySymbol, basicPrice, proPrice, region } = useGeoPricing();

  const upgradePlan = searchParams.get("plan");
  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (user) fetchSubscription();
  }, [user]);

  useEffect(() => {
    if (paymentStatus === "success" && upgradePlan && user) {
      verifyAndRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, upgradePlan, user]);

  const fetchSubscription = async () => {
    if (!user) return;
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).limit(1).maybeSingle();
    setSubscription(data);
  };

  const verifyAndRefresh = async () => {
    toast({ title: "Verifying payment…", description: "Please wait a moment." });
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (data?.status === "active" && data?.plan_name === upgradePlan) {
        setSubscription(data);
        toast({ title: "🎉 Plan Upgraded!", description: `Welcome to the ${upgradePlan} plan!` });
        return;
      }
    }
    toast({
      title: "Still processing",
      description: "If your plan doesn't update shortly, contact support.",
      variant: "destructive",
    });
    fetchSubscription();
  };

  const handleUpgrade = async (plan: string) => {
    setUpgrading(true);
    try {
      // India → Razorpay subscriptions (trial + billing on the 8th).
      if (region === "india") {
        const ok = await loadRazorpay();
        if (!ok) throw new Error("Could not load Razorpay checkout. Please refresh and retry.");
        const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
          body: { plan, billing_period: "monthly", region: "india" },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Subscription could not be created");
        const rzp = new window.Razorpay({
          key: data.key_id,
          subscription_id: data.subscription_id,
          name: "Growvix",
          description: `${plan.toUpperCase()} plan — trial then auto-billed on the 8th`,
          handler: () => {
            toast({
              title: "Subscription set up",
              description: `Free trial active until ${new Date(data.trial_ends_at).toLocaleDateString()}. First charge on ${new Date(data.first_billing_date).toLocaleDateString()}.`,
            });
            fetchSubscription();
          },
          modal: { ondismiss: () => setUpgrading(false) },
          prefill: { email: user?.email },
          theme: { color: "#2563EB" },
        });
        rzp.open();
        setUpgrading(false);
        return;
      }
      // Global → existing Cashfree checkout.
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, region },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const sessionId = data?.payment_session_id;
      if (!sessionId) throw new Error("No payment session returned");

      // @ts-ignore - Cashfree SDK loaded via index.html script tag
      const Cashfree = (window as any).Cashfree;
      if (!Cashfree) throw new Error("Payment SDK failed to load. Please refresh and retry.");

      const cashfree = Cashfree({ mode: data?.mode === "sandbox" ? "sandbox" : "production" });
      await cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self",
      });
    } catch (err: any) {
      toast({ title: "Upgrade failed", description: err.message, variant: "destructive" });
    }
    setUpgrading(false);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
      toast({ title: "Account Deleted", description: "Your account and all data have been removed." });
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const currentPlan = subscription?.plan_name || "free_trial";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-heading font-bold text-foreground">Account Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Account</CardTitle>
            </div>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Email: <span className="text-foreground font-medium">{user?.email}</span></p>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Plan</CardTitle>
            </div>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground capitalize">{currentPlan.replace("_", " ")} Plan</p>
                <p className="text-xs text-muted-foreground">
                  {subscription?.is_trial && "Trial period"}
                  {!subscription?.is_trial && subscription?.ends_at && `Renews ${new Date(subscription.ends_at).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{subscription?.status || "inactive"}</Badge>
            </div>

            {currentPlan !== "pro" && (
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {currentPlan !== "basic" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpgrade("basic")}
                    disabled={upgrading}
                    className="w-full"
                  >
                    {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                    Basic — {currencySymbol}{basicPrice}/mo
                  </Button>
                )}
                <Button
                  onClick={() => handleUpgrade("pro")}
                  disabled={upgrading}
                  className="w-full gradient-primary border-0"
                >
                  {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Crown className="h-4 w-4 mr-1" />}
                  Pro — {currencySymbol}{proPrice}/mo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <CreditPacks />

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>Permanently delete your account and all associated data.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete My Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your data will be permanently deleted.
                    <br /><br />
                    Type <span className="font-bold text-foreground">DELETE</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input placeholder="Type DELETE to confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} className="mt-2" />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={confirmText !== "DELETE" || deleting} className="bg-destructive text-destructive-foreground">
                    {deleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
