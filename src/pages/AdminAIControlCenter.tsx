import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Settings, Cpu, Image, FileText, Shield, BarChart3, Loader2,
  Plus, Trash2, Save, ToggleLeft, Activity,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function useAdminAPI() {
  const call = async (action: string, table: string, data?: any, id?: string) => {
    const { data: result, error } = await supabase.functions.invoke("ai-admin-settings", {
      body: { action, table, data, id },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };
  return { call };
}

// ---- Text Models Tab ----
function TextModelsTab() {
  const { call } = useAdminAPI();
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await call("list", "ai_provider_settings");
      setProviders((data || []).filter((p: any) => p.provider_type === "text"));
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await call("update", "ai_provider_settings", editing, editing.id);
      } else {
        await call("create", "ai_provider_settings", { ...editing, provider_type: "text" });
      }
      toast({ title: "Saved" });
      setEditing(null);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    await call("delete", "ai_provider_settings", undefined, id);
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Text AI Providers</h3>
        <Button size="sm" onClick={() => setEditing({ provider_name: "", model_name: "google/gemini-3-flash-preview", temperature: 0.7, max_tokens: 2048, top_p: 1, is_active: false, is_fallback: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Provider Name</Label><Input value={editing.provider_name} onChange={e => setEditing({ ...editing, provider_name: e.target.value })} placeholder="e.g. Lovable AI" /></div>
              <div><Label>Model Name</Label><Input value={editing.model_name} onChange={e => setEditing({ ...editing, model_name: e.target.value })} placeholder="google/gemini-3-flash-preview" /></div>
              <div><Label>Temperature</Label><Input type="number" step="0.1" min="0" max="2" value={editing.temperature} onChange={e => setEditing({ ...editing, temperature: parseFloat(e.target.value) })} /></div>
              <div><Label>Max Tokens</Label><Input type="number" value={editing.max_tokens} onChange={e => setEditing({ ...editing, max_tokens: parseInt(e.target.value) })} /></div>
              <div><Label>Top P</Label><Input type="number" step="0.1" min="0" max="1" value={editing.top_p} onChange={e => setEditing({ ...editing, top_p: parseFloat(e.target.value) })} /></div>
              <div><Label>API Key Secret Name</Label><Input value={editing.api_key_secret_name || ""} onChange={e => setEditing({ ...editing, api_key_secret_name: e.target.value })} placeholder="Leave empty for Lovable AI" /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_fallback} onCheckedChange={v => setEditing({ ...editing, is_fallback: v })} /><Label>Fallback</Label></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader><TableRow>
          <TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>Temp</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {providers.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.provider_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.model_name}</TableCell>
              <TableCell>{p.temperature}</TableCell>
              <TableCell>
                {p.is_active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                {p.is_fallback && <Badge variant="outline" className="ml-1">Fallback</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {providers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No text providers configured. Add one to get started.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- Image Models Tab ----
function ImageModelsTab() {
  const { call } = useAdminAPI();
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const data = await call("list", "ai_provider_settings");
    setProviders((data || []).filter((p: any) => p.provider_type === "image"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await call("update", "ai_provider_settings", editing, editing.id);
      else await call("create", "ai_provider_settings", { ...editing, provider_type: "image" });
      toast({ title: "Saved" });
      setEditing(null);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Image AI Providers</h3>
        <Button size="sm" onClick={() => setEditing({ provider_name: "", model_name: "google/gemini-3.1-flash-image-preview", is_active: false, is_fallback: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Provider Name</Label><Input value={editing.provider_name} onChange={e => setEditing({ ...editing, provider_name: e.target.value })} /></div>
            <div><Label>Model Name</Label><Input value={editing.model_name} onChange={e => setEditing({ ...editing, model_name: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_fallback} onCheckedChange={v => setEditing({ ...editing, is_fallback: v })} /><Label>Fallback</Label></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {providers.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.provider_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.model_name}</TableCell>
              <TableCell>{p.is_active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { call("delete", "ai_provider_settings", undefined, p.id); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- Prompt Templates Tab ----
function PromptTemplatesTab() {
  const { call } = useAdminAPI();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const templateTypes = ["caption", "ad_copy", "hook", "cta", "carousel", "linkedin", "reel_script", "image_prompt", "hashtag_generation"];

  const load = async () => {
    setLoading(true);
    const data = await call("list", "ai_prompt_templates");
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await call("update", "ai_prompt_templates", editing, editing.id);
      else await call("create", "ai_prompt_templates", editing);
      toast({ title: "Saved" });
      setEditing(null);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Prompt Templates</h3>
        <Button size="sm" onClick={() => setEditing({ template_type: "caption", name: "", system_prompt: "", hidden_instructions: "", is_active: true })}>
          <Plus className="h-4 w-4 mr-1" /> Add Template
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={editing.template_type} onValueChange={v => setEditing({ ...editing, template_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{templateTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>System Prompt</Label><Textarea rows={4} value={editing.system_prompt} onChange={e => setEditing({ ...editing, system_prompt: e.target.value })} placeholder="Main instruction prompt..." /></div>
          <div><Label>Hidden Instructions</Label><Textarea rows={3} value={editing.hidden_instructions} onChange={e => setEditing({ ...editing, hidden_instructions: e.target.value })} placeholder="Additional hidden instructions injected into the prompt..." /></div>
          <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="grid gap-3">
        {templates.map(t => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setEditing(t)}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.template_type.replace(/_/g, " ")} • {t.system_prompt?.substring(0, 80)}...</p>
              </div>
              <div className="flex items-center gap-2">
                {t.is_active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); call("delete", "ai_prompt_templates", undefined, t.id); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Plan Limits Tab ----
function PlanLimitsTab() {
  const { call } = useAdminAPI();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const data = await call("list", "ai_plan_limits");
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await call("update", "ai_plan_limits", editing, editing.id);
      else await call("create", "ai_plan_limits", editing);
      toast({ title: "Saved" });
      setEditing(null);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Plan Limits</h3>
        <Button size="sm" onClick={() => setEditing({ plan_name: "", text_generations_limit: 5, image_generations_limit: 2, regeneration_limit: 3, brand_preset_limit: 1, can_edit_prompts: false, can_select_model: false, premium_model_access: false, premium_image_styles: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Plan
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Plan Name</Label><Input value={editing.plan_name} onChange={e => setEditing({ ...editing, plan_name: e.target.value })} /></div>
            <div><Label>Text Limit /mo</Label><Input type="number" value={editing.text_generations_limit} onChange={e => setEditing({ ...editing, text_generations_limit: parseInt(e.target.value) })} /></div>
            <div><Label>Image Limit /mo</Label><Input type="number" value={editing.image_generations_limit} onChange={e => setEditing({ ...editing, image_generations_limit: parseInt(e.target.value) })} /></div>
            <div><Label>Regen Limit</Label><Input type="number" value={editing.regeneration_limit} onChange={e => setEditing({ ...editing, regeneration_limit: parseInt(e.target.value) })} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><Switch checked={editing.can_edit_prompts} onCheckedChange={v => setEditing({ ...editing, can_edit_prompts: v })} /><Label>Can Edit Prompts</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.can_select_model} onCheckedChange={v => setEditing({ ...editing, can_select_model: v })} /><Label>Can Select Model</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.premium_model_access} onCheckedChange={v => setEditing({ ...editing, premium_model_access: v })} /><Label>Premium Models</Label></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <Table>
        <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Text</TableHead><TableHead>Image</TableHead><TableHead>Regen</TableHead><TableHead>Prompts</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {plans.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.plan_name}</TableCell>
              <TableCell>{p.text_generations_limit}/mo</TableCell>
              <TableCell>{p.image_generations_limit}/mo</TableCell>
              <TableCell>{p.regeneration_limit}</TableCell>
              <TableCell>{p.can_edit_prompts ? "✓" : "✗"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { call("delete", "ai_plan_limits", undefined, p.id); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- Feature Flags Tab ----
function FeatureFlagsTab() {
  const { call } = useAdminAPI();
  const { toast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await call("list", "ai_feature_flags");
    setFlags(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag: any) => {
    await call("update", "ai_feature_flags", { enabled: !flag.enabled }, flag.id);
    load();
  };

  const defaultFlags = [
    { feature_key: "ai_studio_enabled", label: "AI Studio (Global)" },
    { feature_key: "text_gen_enabled", label: "Text Generation" },
    { feature_key: "image_gen_enabled", label: "Image Generation" },
    { feature_key: "user_prompt_editing", label: "User Prompt Editing" },
  ];

  const seedFlags = async () => {
    for (const f of defaultFlags) {
      if (!flags.find(fl => fl.feature_key === f.feature_key)) {
        await call("create", "ai_feature_flags", { feature_key: f.feature_key, enabled: true });
      }
    }
    load();
    toast({ title: "Default flags created" });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Feature Flags</h3>
        {flags.length === 0 && <Button size="sm" onClick={seedFlags}><Plus className="h-4 w-4 mr-1" /> Create Default Flags</Button>}
      </div>
      <div className="space-y-3">
        {flags.map(f => (
          <Card key={f.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{f.feature_key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                <p className="text-xs text-muted-foreground">{f.feature_key}</p>
              </div>
              <Switch checked={f.enabled} onCheckedChange={() => toggle(f)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Usage Logs Tab ----
function UsageLogsTab() {
  const { call } = useAdminAPI();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await call("usage_stats", "ai_usage_logs");
        setStats(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!stats) return <p className="text-muted-foreground text-center py-8">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total_generations },
          { label: "This Month", value: stats.month_generations },
          { label: "This Week", value: stats.week_generations },
          { label: "Text", value: stats.text_generations },
          { label: "Image", value: stats.image_generations },
          { label: "Errors", value: stats.total_errors },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h4 className="font-semibold text-foreground">Recent Logs</h4>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Time (ms)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(stats.recent_logs || []).slice(0, 20).map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{log.generation_type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.model || "-"}</TableCell>
                <TableCell>{log.status === "success" ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge> : <Badge variant="destructive">Error</Badge>}</TableCell>
                <TableCell className="text-xs">{log.response_time_ms || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---- Main Admin AI Control Center ----
export default function AdminAIControlCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin") as any;
      setIsAdmin(data && data.length > 0);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-destructive flex items-center justify-center">
              <Settings className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">AI Control Center</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="text-models">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-6">
            <TabsTrigger value="text-models" className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Text Models</TabsTrigger>
            <TabsTrigger value="image-models" className="flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Image Models</TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Prompts</TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Plan Limits</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-1"><ToggleLeft className="h-3.5 w-3.5" /> Feature Flags</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Usage Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="text-models"><TextModelsTab /></TabsContent>
          <TabsContent value="image-models"><ImageModelsTab /></TabsContent>
          <TabsContent value="prompts"><PromptTemplatesTab /></TabsContent>
          <TabsContent value="plans"><PlanLimitsTab /></TabsContent>
          <TabsContent value="flags"><FeatureFlagsTab /></TabsContent>
          <TabsContent value="logs"><UsageLogsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
