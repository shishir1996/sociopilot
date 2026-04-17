import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Check, RefreshCw, Trash2, ExternalLink, AlertCircle } from "lucide-react";

const PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: "📘", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "instagram", label: "Instagram", icon: "📸", color: "bg-pink-500/10 text-pink-600 border-pink-200" },
  { value: "linkedin", label: "LinkedIn", icon: "💼", color: "bg-sky-500/10 text-sky-600 border-sky-200" },
  { value: "x_twitter", label: "X (Twitter)", icon: "🐦", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  { value: "google_business", label: "Google Business", icon: "📍", color: "bg-green-500/10 text-green-600 border-green-200" },
];

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  expires_at: string | null;
}

export default function SocialSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string>("");
  const [connected, setConnected] = useState<ConnectedAccount[]>([]);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>("free_trial");

  const isPro = planName === "pro";
  const platformLimit = isPro ? Infinity : 1;
  const reachedLimit = connected.length >= platformLimit;

  useEffect(() => {
    if (user) init();
  }, [user]);

  // Handle OAuth callback from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.platform) {
          exchangeToken(stateData.platform, code, state, stateData.business_id);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {}
    }
  }, []);

  const init = async () => {
    const [bizRes, subRes] = await Promise.all([
      supabase.from("businesses").select("id").eq("user_id", user!.id).limit(1),
      supabase.from("subscriptions").select("plan_name").eq("user_id", user!.id).maybeSingle(),
    ]);
    const businesses = (bizRes as any).data;
    setPlanName((subRes as any).data?.plan_name || "free_trial");

    if (businesses && businesses.length > 0) {
      const bid = businesses[0].id;
      setBusinessId(bid);
      await Promise.all([fetchConnected(bid), fetchEnabledPlatforms()]);
    }
    setLoading(false);
  };

  const fetchConnected = async (bid: string) => {
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, account_name, account_id, expires_at")
      .eq("business_id", bid) as any;
    setConnected(data || []);
  };

  const fetchEnabledPlatforms = async () => {
    try {
      const { data } = await supabase.functions.invoke("social-oauth", {
        body: { action: "check_platforms" },
      });
      setEnabledPlatforms(data?.platforms || []);
    } catch {
      setEnabledPlatforms([]);
    }
  };

  const handleConnect = async (platform: string) => {
    if (!user || !businessId) return;
    // Plan-based platform cap (Trial/Basic = 1)
    const alreadyConnected = connected.some(c => c.platform === platform);
    if (!isPro && reachedLimit && !alreadyConnected) {
      toast({
        title: "Upgrade to Pro",
        description: "You can connect only 1 platform on your current plan. Upgrade to Pro for multi-platform posting.",
        variant: "destructive",
      });
      return;
    }
    setConnecting(platform);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      const { data, error } = await supabase.functions.invoke("social-oauth", {
        body: {
          action: "get_oauth_url",
          platform,
          redirect_uri: redirectUri,
          business_id: businessId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConnecting(null);
    }
  };

  const exchangeToken = async (platform: string, code: string, state: string, bid?: string) => {
    setConnecting(platform);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      const { data, error } = await supabase.functions.invoke("social-oauth", {
        body: {
          action: "exchange_token",
          platform,
          code,
          state,
          redirect_uri: redirectUri,
          business_id: bid || businessId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Connected!", description: `${platform} connected as ${data?.account_name}` });
      if (bid || businessId) await fetchConnected(bid || businessId);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id) as any;
    toast({ title: "Disconnected" });
    if (businessId) fetchConnected(businessId);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const connectedPlatforms = connected.map((c) => c.platform);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-heading font-bold text-foreground">Connected Accounts</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Connected Accounts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Your Social Platforms</CardTitle>
            <CardDescription>
              Connect your accounts to publish content directly. Just click and authorize — no technical setup needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Connected */}
            {connected.map((acc) => {
              const p = PLATFORMS.find(pl => pl.value === acc.platform);
              const expired = isExpired(acc.expires_at);
              return (
                <div key={acc.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${expired ? "bg-destructive/5 border-destructive/20" : p?.color || "bg-muted"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p?.icon}</span>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        {p?.label}
                        {expired && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{acc.account_name || acc.account_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expired ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(acc.platform)}
                        disabled={connecting === acc.platform}
                        className="text-xs gap-1"
                      >
                        {connecting === acc.platform ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Reconnect
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Check className="h-3.5 w-3.5" /> Connected
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDisconnect(acc.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Available to connect */}
            {PLATFORMS.filter(p => !connectedPlatforms.includes(p.value)).map((platform) => {
              const isEnabled = enabledPlatforms.includes(platform.value);
              const isMeta = platform.value === "instagram" && enabledPlatforms.includes("facebook");
              const available = isEnabled || isMeta;

              return (
                <button
                  key={platform.value}
                  onClick={() => available ? handleConnect(platform.value === "instagram" ? "facebook" : platform.value) : undefined}
                  disabled={!available || connecting === platform.value}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    available
                      ? "border-dashed border-border hover:border-primary/40 hover:bg-primary/5"
                      : "border-dashed border-border/50 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className="text-xl opacity-60">{platform.icon}</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {connecting === platform.value ? "Redirecting..." : `Connect ${platform.label}`}
                  </span>
                  {connecting === platform.value ? (
                    <Loader2 className="h-4 w-4 ml-auto animate-spin text-primary" />
                  ) : available ? (
                    <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                  ) : (
                    <span className="ml-auto text-[10px] text-muted-foreground">Not available</span>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          🔒 We use secure OAuth authentication — your passwords and credentials are never stored on our servers.
        </p>
      </main>
    </div>
  );
}
