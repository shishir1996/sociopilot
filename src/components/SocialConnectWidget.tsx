import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

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
}

interface SocialConnectWidgetProps {
  businessId: string;
}

export function SocialConnectWidget({ businessId }: SocialConnectWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState<ConnectedAccount[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [addingPlatform, setAddingPlatform] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ account_name: "", access_token: "", account_id: "" });

  useEffect(() => {
    if (businessId) fetchConnected();
  }, [businessId]);

  const fetchConnected = async () => {
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, account_name, account_id")
      .eq("business_id", businessId) as any;
    setConnected(data || []);
  };

  const connectedPlatforms = connected.map((c) => c.platform);

  const handleSave = async () => {
    if (!addingPlatform || !user) return;
    if (!form.access_token.trim() || !form.account_id.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("social_accounts").insert({
        business_id: businessId,
        user_id: user.id,
        platform: addingPlatform,
        account_name: form.account_name || PLATFORMS.find(p => p.value === addingPlatform)?.label || "",
        access_token: form.access_token,
        account_id: form.account_id,
      } as any);
      if (error) throw error;
      toast({ title: "Connected!", description: `${PLATFORMS.find(p => p.value === addingPlatform)?.label} account connected.` });
      setAddingPlatform(null);
      setForm({ account_name: "", access_token: "", account_id: "" });
      fetchConnected();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDisconnect = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id) as any;
    toast({ title: "Disconnected", description: "Account removed." });
    fetchConnected();
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
            return (
              <div key={acc.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${p?.color || "bg-muted"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p?.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{p?.label}</p>
                    <p className="text-xs opacity-70">{acc.account_name || acc.account_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(acc.id)} className="h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Available platforms to connect */}
          {PLATFORMS.filter(p => !connectedPlatforms.includes(p.value)).map((platform) => (
            <div key={platform.value}>
              {addingPlatform === platform.value ? (
                <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{platform.icon}</span>
                    <p className="text-sm font-semibold">{platform.label}</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Account Name</Label>
                      <Input
                        placeholder="My Business Page"
                        value={form.account_name}
                        onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Access Token *</Label>
                      <Input
                        type="password"
                        placeholder="Paste your access token"
                        value={form.access_token}
                        onChange={(e) => setForm(f => ({ ...f, access_token: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Page / Account ID *</Label>
                      <Input
                        placeholder="Page or account ID"
                        value={form.account_id}
                        onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-8 text-xs">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      {saving ? "Saving..." : "Connect"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingPlatform(null); setForm({ account_name: "", access_token: "", account_id: "" }); }} className="h-8 text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingPlatform(platform.value); setForm({ account_name: "", access_token: "", account_id: "" }); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-lg opacity-50">{platform.icon}</span>
                  <span className="text-sm text-muted-foreground">{platform.label}</span>
                  <Plus className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
