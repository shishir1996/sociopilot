import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Loader2, Eye, EyeOff, Save, Facebook, Instagram, Linkedin } from "lucide-react";

interface PlatformConfig {
  platform: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  fields: { key: string; label: string; placeholder: string }[];
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: "facebook",
    label: "Facebook / Instagram",
    icon: <Facebook className="h-5 w-5" />,
    color: "text-blue-600",
    fields: [
      { key: "app_id", label: "Meta App ID", placeholder: "Enter Facebook/Meta App ID" },
      { key: "app_secret", label: "Meta App Secret", placeholder: "Enter App Secret" },
    ],
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-5 w-5" />,
    color: "text-sky-600",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Enter LinkedIn Client ID" },
      { key: "client_secret", label: "Client Secret", placeholder: "Enter Client Secret" },
    ],
  },
  {
    platform: "x_twitter",
    label: "X (Twitter)",
    icon: <span className="text-lg">𝕏</span>,
    color: "text-foreground",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Enter Twitter API Key" },
      { key: "api_secret", label: "API Secret", placeholder: "Enter API Secret" },
    ],
  },
  {
    platform: "google_business",
    label: "Google Business",
    icon: <span className="text-lg">📍</span>,
    color: "text-green-600",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Enter Google Client ID" },
      { key: "client_secret", label: "Client Secret", placeholder: "Enter Client Secret" },
    ],
  },
];

interface PlatformState {
  enabled: boolean;
  values: Record<string, string>;
  showSecrets: Record<string, boolean>;
}

export default function AdminSocialIntegrations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>(() => {
    const init: Record<string, PlatformState> = {};
    PLATFORM_CONFIGS.forEach((p) => {
      init[p.platform] = {
        enabled: false,
        values: {},
        showSecrets: {},
      };
    });
    return init;
  });

  useEffect(() => {
    if (user) checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin") as any;

    if (data && data.length > 0) {
      setIsAdmin(true);
      await loadSettings();
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const { data } = await supabase.functions.invoke("social-oauth", {
        body: { action: "get_admin_settings" },
      });
      if (data?.settings) {
        setPlatforms((prev) => {
          const next = { ...prev };
          Object.entries(data.settings as Record<string, any>).forEach(([key, val]: [string, any]) => {
            if (next[key]) {
              next[key] = {
                ...next[key],
                enabled: val.enabled || false,
                values: val.values || {},
              };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const updateField = (platform: string, field: string, value: string) => {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        values: { ...prev[platform].values, [field]: value },
      },
    }));
  };

  const toggleEnabled = (platform: string) => {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], enabled: !prev[platform].enabled },
    }));
  };

  const toggleSecret = (platform: string, field: string) => {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        showSecrets: {
          ...prev[platform].showSecrets,
          [field]: !prev[platform].showSecrets[field],
        },
      },
    }));
  };

  const savePlatform = async (platform: string) => {
    setSaving(platform);
    try {
      const state = platforms[platform];
      const { data, error } = await supabase.functions.invoke("social-oauth", {
        body: {
          action: "save_admin_settings",
          platform,
          enabled: state.enabled,
          credentials: state.values,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Saved!", description: `${platform} credentials updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(null);
  };

  const maskValue = (val: string) => {
    if (!val || val.length < 8) return "••••••••";
    return val.slice(0, 4) + "••••" + val.slice(-4);
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
            <h2 className="text-xl font-heading font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">Admin access required.</p>
            <Button onClick={() => navigate("/")} variant="outline">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">Social App Integrations</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-foreground">
              <strong>🔐 Admin Only:</strong> Configure OAuth app credentials here. Users will see simple "Connect" buttons — they never see these credentials.
            </p>
          </CardContent>
        </Card>

        {PLATFORM_CONFIGS.map((config) => {
          const state = platforms[config.platform];
          const hasCredentials = config.fields.every(f => (state.values[f.key] || "").trim().length > 0);
          return (
            <Card key={config.platform} className="shadow-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={config.color}>{config.icon}</span>
                    <div>
                      <CardTitle className="text-base font-heading">{config.label}</CardTitle>
                      <CardDescription className="text-xs">OAuth app credentials</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCredentials && <Badge variant="outline" className="text-[10px]">Configured</Badge>}
                    <Badge variant={state.enabled ? "default" : "secondary"}>
                      {state.enabled ? "Active" : "Inactive"}
                    </Badge>
                    <Switch checked={state.enabled} onCheckedChange={() => toggleEnabled(config.platform)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium">{field.label}</Label>
                    <div className="relative">
                      <Input
                        type={state.showSecrets[field.key] ? "text" : "password"}
                        value={state.values[field.key] || ""}
                        onChange={(e) => updateField(config.platform, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="pr-10 h-9 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret(config.platform, field.key)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {state.showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => savePlatform(config.platform)}
                    disabled={saving === config.platform}
                    className="gap-2"
                  >
                    {saving === config.platform ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
