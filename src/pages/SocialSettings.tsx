import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

const PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook", fields: ["access_token", "account_id"] },
  { value: "instagram", label: "Instagram", fields: ["access_token", "account_id"] },
  { value: "linkedin", label: "LinkedIn", fields: ["access_token", "account_id"] },
  { value: "x_twitter", label: "X (Twitter)", fields: ["access_token", "account_id"] },
  { value: "google_business", label: "Google Business Profile", fields: ["access_token", "account_id"] },
];

interface SocialAccount {
  id?: string;
  platform: string;
  access_token: string;
  account_id: string;
  account_name: string;
}

export default function SocialSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userIdRef = user?.id;
  useEffect(() => {
    if (userIdRef) fetchBusinesses();
  }, [userIdRef]);

  const fetchBusinesses = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", user!.id) as any;
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0].id);
      fetchAccounts(data[0].id);
    }
    setLoading(false);
  };

  const fetchAccounts = async (businessId: string) => {
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("business_id", businessId) as any;
    setAccounts(
      (data || []).map((a: any) => ({
        id: a.id,
        platform: a.platform,
        access_token: a.access_token || "",
        account_id: a.account_id || "",
        account_name: a.account_name || "",
      }))
    );
  };

  const addAccount = () => {
    setAccounts((prev) => [
      ...prev,
      { platform: "facebook", access_token: "", account_id: "", account_name: "" },
    ]);
  };

  const removeAccount = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAccount = (index: number, field: string, value: string) => {
    setAccounts((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const handleSave = async () => {
    if (!selectedBusiness || !user) return;
    setSaving(true);
    try {
      // Delete existing accounts for this business
      await supabase
        .from("social_accounts")
        .delete()
        .eq("business_id", selectedBusiness) as any;

      // Insert new accounts
      if (accounts.length > 0) {
        const inserts = accounts.map((a) => ({
          business_id: selectedBusiness,
          user_id: user.id,
          platform: a.platform,
          access_token: a.access_token,
          account_id: a.account_id,
          account_name: a.account_name,
        }));
        const { error } = await supabase.from("social_accounts").insert(inserts as any);
        if (error) throw error;
      }

      toast({ title: "Saved!", description: "Social accounts updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          <h1 className="text-xl font-heading font-bold text-foreground">Social Media Accounts</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Connect Your Platforms</CardTitle>
            <CardDescription>
              Add your social media API credentials to enable direct posting. You'll need access tokens from each platform's developer portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {businesses.length > 1 && (
              <div className="space-y-2">
                <Label>Business</Label>
                <select
                  value={selectedBusiness}
                  onChange={(e) => {
                    setSelectedBusiness(e.target.value);
                    fetchAccounts(e.target.value);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {accounts.map((account, index) => (
              <Card key={index} className="border border-border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Platform</Label>
                    <Button variant="ghost" size="sm" onClick={() => removeAccount(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <select
                    value={account.platform}
                    onChange={(e) => updateAccount(index, "platform", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={account.account_name}
                      onChange={(e) => updateAccount(index, "account_name", e.target.value)}
                      placeholder="My Business Page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <Input
                      type="password"
                      value={account.access_token}
                      onChange={(e) => updateAccount(index, "access_token", e.target.value)}
                      placeholder="Your platform access token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Page / Account ID</Label>
                    <Input
                      value={account.account_id}
                      onChange={(e) => updateAccount(index, "account_id", e.target.value)}
                      placeholder="Page or account ID"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addAccount} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Platform
            </Button>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Accounts"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">How to Get API Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Facebook & Instagram</p>
              <p>1. Go to developers.facebook.com → Create App → Business type</p>
              <p>2. Add "Pages API" and "Instagram Graph API" products</p>
              <p>3. Generate a Page Access Token in the API Explorer</p>
              <p>4. Use your Page ID as the Account ID</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">LinkedIn</p>
              <p>1. Go to linkedin.com/developers → Create App</p>
              <p>2. Request "Share on LinkedIn" and "Sign In with LinkedIn" products</p>
              <p>3. Generate an OAuth access token</p>
              <p>4. Use your Person URN ID as the Account ID</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">X (Twitter)</p>
              <p>1. Go to developer.twitter.com → Create Project & App</p>
              <p>2. Enable Read & Write permissions</p>
              <p>3. Generate Access Token & Secret</p>
              <p>4. Use your User ID as the Account ID</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Google Business Profile</p>
              <p>1. Go to console.cloud.google.com → Create Project</p>
              <p>2. Enable "Google My Business API" and "Business Profile API"</p>
              <p>3. Create OAuth 2.0 credentials and generate an access token</p>
              <p>4. Use your Location ID (accounts/*/locations/*) as the Account ID</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
