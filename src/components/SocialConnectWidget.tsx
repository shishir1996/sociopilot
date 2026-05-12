import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Trash2, ChevronDown, ChevronUp, Loader2, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

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

interface SocialConnectWidgetProps {
  businessId: string;
}

export function SocialConnectWidget({ businessId }: SocialConnectWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState<ConnectedAccount[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  useEffect(() => {
    if (businessId) {
      fetchConnected();
      fetchEnabledPlatforms();
    }
  }, [businessId]);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "social_oauth_callback") {
        const { platform, code, state } = event.data;
        await exchangeToken(platform, code, state);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [businessId]);

  // Also check URL params for OAuth callback (redirect flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.platform) {
          exchangeToken(stateData.platform, code, state);
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {}
    }
  }, []);

  const fetchConnected = async () => {
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, account_name, account_id, expires_at")
      .eq("business_id", businessId) as any;
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
    setLoadingPlatforms(false);
  };

  const connectedPlatforms = connected.map((c) => c.platform);

  const handleConnect = async (platform: string) => {
    if (!user) return;
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
        // Open OAuth in same window (redirect flow)
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message, variant: "destructive" });
      setConnecting(null);
    }
  };

  const exchangeToken = async (platform: string, code: string, state: string) => {
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
          business_id: businessId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "✅ Connected!",
        description: `${PLATFORMS.find(p => p.value === platform)?.label} account connected as ${data?.account_name || ""}`,
      });
      fetchConnected();
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id) as any;
    toast({ title: "Disconnected", description: "Account removed." });
    fetchConnected();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              🔗 Connected Platforms
              {connected.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {connected.length} connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Connect your social media accounts for direct posting
            </CardDescription>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Connected accounts */}
          {connected.map((acc) => {
            const p = PLATFORMS.find(pl => pl.value === acc.platform);
            const expired = isExpired(acc.expires_at);
            return (
              <div key={acc.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${expired ? "bg-destructive/5 border-destructive/20" : p?.color || "bg-muted"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p?.icon}</span>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {p?.label}
                      {expired && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    </p>
                    <p className="text-xs opacity-70">{acc.account_name || acc.account_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expired ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(acc.platform)}
                      disabled={connecting === acc.platform}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Reconnect
                    </Button>
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(acc.id)} className="h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Available platforms to connect */}
          {loadingPlatforms ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            PLATFORMS.filter(p => !connectedPlatforms.includes(p.value)).map((platform) => {
              const isEnabled = enabledPlatforms.includes(platform.value);
              // Instagram shares Meta OAuth with Facebook
              const isMeta = platform.value === "instagram" && enabledPlatforms.includes("facebook");
              const available = isEnabled || isMeta;

              return (
                <button
                  key={platform.value}
                  onClick={() => available ? handleConnect(platform.value) : null}
                  disabled={!available || connecting === platform.value}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                    available
                      ? "border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                      : "border-dashed border-border/50 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  <span className="text-sm text-muted-foreground">
                    {connecting === platform.value ? "Connecting..." : `Connect ${platform.label}`}
                  </span>
                  {connecting === platform.value ? (
                    <Loader2 className="h-3.5 w-3.5 ml-auto animate-spin text-primary" />
                  ) : available ? (
                    <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  ) : (
                    <span className="ml-auto text-[10px] text-muted-foreground">Not configured</span>
                  )}
                </button>
              );
            })
          )}

          <p className="text-xs text-center text-muted-foreground pt-1">
            🔒 We use secure OAuth — your credentials are never stored
          </p>
        </CardContent>
      )}
    </Card>
  );
}
