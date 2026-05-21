import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, CreditCard, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Settings {
  id?: string;
  razorpay_key_id: string | null;
  razorpay_key_secret: string | null;
  razorpay_webhook_secret: string | null;
  cashfree_app_id: string | null;
  cashfree_secret: string | null;
  active_gateway_india: string;
  active_gateway_global: string;
  default_currency_india: string;
  default_currency_global: string;
  tax_percent: number;
  credit_pack_price_inr: number;
  credit_pack_price_usd: number;
  credit_pack_posts: number;
  credit_pack_credits: number;
  monthly_post_limit: number;
  monthly_post_hard_cap: number;
  trial_days: number;
}

interface RzpPlan {
  id?: string;
  plan_name: string;
  billing_period: string;
  region: string;
  razorpay_plan_id: string;
  amount: number;
  currency: string;
  is_active: boolean;
}

export default function AdminPayments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [plans, setPlans] = useState<RzpPlan[]>([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [newPlan, setNewPlan] = useState<RzpPlan>({
    plan_name: "basic", billing_period: "monthly", region: "india",
    razorpay_plan_id: "", amount: 0, currency: "INR", is_active: true,
  });

  useEffect(() => { void check(); }, [user]);

  async function check() {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role","admin");
    if (!data || data.length === 0) {
      toast({ title: "Access denied", variant: "destructive" });
      navigate("/");
      return;
    }
    setIsAdmin(true);
    await load();
  }

  async function load() {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("payment_settings").select("*").limit(1).maybeSingle(),
      supabase.from("razorpay_plans").select("*").order("plan_name").order("billing_period"),
    ]);
    if (s.data) setSettings(s.data as any);
    if (p.data) setPlans(p.data as any);
    setLoading(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase.from("payment_settings").update(rest).eq("id", id!);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved" });
  }

  async function addPlan() {
    if (!newPlan.razorpay_plan_id || !newPlan.amount) {
      toast({ title: "Plan id and amount required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("razorpay_plans").insert(newPlan as any);
    if (error) {
      toast({ title: "Could not add plan", description: error.message, variant: "destructive" });
      return;
    }
    setNewPlan({ ...newPlan, razorpay_plan_id: "", amount: 0 });
    await load();
  }

  async function deletePlan(id: string) {
    await supabase.from("razorpay_plans").delete().eq("id", id);
    await load();
  }

  async function togglePlan(id: string, is_active: boolean) {
    await supabase.from("razorpay_plans").update({ is_active }).eq("id", id);
    await load();
  }

  if (loading || !isAdmin || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const upd = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Payment Configuration</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Gateway Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Gateway Selection</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>India gateway</Label>
              <Select value={settings.active_gateway_india} onValueChange={(v) => upd({ active_gateway_india: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="cashfree">Cashfree</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Global gateway</Label>
              <Select value={settings.active_gateway_global} onValueChange={(v) => upd({ active_gateway_global: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashfree">Cashfree</SelectItem>
                  <SelectItem value="razorpay">Razorpay (intl)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency (India)</Label>
              <Input value={settings.default_currency_india} onChange={(e) => upd({ default_currency_india: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>Currency (Global)</Label>
              <Input value={settings.default_currency_global} onChange={(e) => upd({ default_currency_global: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>Tax % (applied at checkout)</Label>
              <Input type="number" step="0.01" value={settings.tax_percent}
                onChange={(e) => upd({ tax_percent: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Trial Period (days)</Label>
              <Input type="number" min={0} value={settings.trial_days ?? 14}
                onChange={(e) => upd({ trial_days: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        {/* Razorpay Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Razorpay Credentials</span>
              <Button variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)}>
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Key ID</Label>
              <Input value={settings.razorpay_key_id || ""} onChange={(e) => upd({ razorpay_key_id: e.target.value })} placeholder="rzp_live_..." />
            </div>
            <div>
              <Label>Key Secret</Label>
              <Input type={showSecrets ? "text" : "password"} value={settings.razorpay_key_secret || ""}
                onChange={(e) => upd({ razorpay_key_secret: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <Label>Webhook Secret</Label>
              <Input type={showSecrets ? "text" : "password"} value={settings.razorpay_webhook_secret || ""}
                onChange={(e) => upd({ razorpay_webhook_secret: e.target.value })} placeholder="••••••••" />
            </div>
            <p className="text-xs text-muted-foreground">
              Webhook URL: <code className="bg-muted px-1.5 py-0.5 rounded">https://{import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/razorpay-webhook</code>
            </p>
          </CardContent>
        </Card>

        {/* Cashfree Credentials */}
        <Card>
          <CardHeader><CardTitle>Cashfree Credentials</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>App ID</Label>
              <Input value={settings.cashfree_app_id || ""} onChange={(e) => upd({ cashfree_app_id: e.target.value })} />
            </div>
            <div>
              <Label>Secret</Label>
              <Input type={showSecrets ? "text" : "password"} value={settings.cashfree_secret || ""}
                onChange={(e) => upd({ cashfree_secret: e.target.value })} placeholder="••••••••" />
            </div>
          </CardContent>
        </Card>

        {/* Credit Pack Pricing */}
        <Card>
          <CardHeader><CardTitle>One-Time Credit Pack</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Posts added per pack</Label>
              <Input type="number" value={settings.credit_pack_posts} onChange={(e) => upd({ credit_pack_posts: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Credits added per pack</Label>
              <Input type="number" value={settings.credit_pack_credits} onChange={(e) => upd({ credit_pack_credits: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Price (INR)</Label>
              <Input type="number" value={settings.credit_pack_price_inr} onChange={(e) => upd({ credit_pack_price_inr: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input type="number" value={settings.credit_pack_price_usd} onChange={(e) => upd({ credit_pack_price_usd: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Default monthly post limit</Label>
              <Input type="number" value={settings.monthly_post_limit} onChange={(e) => upd({ monthly_post_limit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Hard cap (max posts/month)</Label>
              <Input type="number" value={settings.monthly_post_hard_cap} onChange={(e) => upd({ monthly_post_hard_cap: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gradient-primary border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save All Settings
          </Button>
        </div>

        {/* Razorpay Subscription Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Razorpay Subscription Plans</CardTitle>
            <p className="text-xs text-muted-foreground">Create the plan in Razorpay Dashboard → Subscriptions → Plans, then paste the plan id (plan_XXXX) here.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Razorpay Plan ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="capitalize">{p.plan_name}</TableCell>
                    <TableCell className="capitalize">{p.billing_period}</TableCell>
                    <TableCell className="capitalize">{p.region}</TableCell>
                    <TableCell className="font-mono text-xs">{p.razorpay_plan_id}</TableCell>
                    <TableCell>{p.currency} {p.amount}</TableCell>
                    <TableCell>
                      <input type="checkbox" checked={p.is_active}
                        onChange={(e) => togglePlan(p.id!, e.target.checked)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deletePlan(p.id!)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Select value={newPlan.plan_name} onValueChange={(v) => setNewPlan({ ...newPlan, plan_name: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={newPlan.billing_period} onValueChange={(v) => setNewPlan({ ...newPlan, billing_period: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={newPlan.region} onValueChange={(v) => setNewPlan({ ...newPlan, region: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-xs" placeholder="plan_XXXX" value={newPlan.razorpay_plan_id}
                      onChange={(e) => setNewPlan({ ...newPlan, razorpay_plan_id: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-xs w-24" type="number" placeholder="999" value={newPlan.amount || ""}
                      onChange={(e) => setNewPlan({ ...newPlan, amount: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={addPlan}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
