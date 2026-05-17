import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Settings, Cpu, Image, FileText, Shield, ToggleLeft, Activity,
  Plus, Trash2, Save, DollarSign, Key, RefreshCw, Eye, EyeOff, Loader2, CheckCircle2, XCircle, MapPin, Sparkles, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GeoPricingPanel } from "@/components/admin/GeoPricingPanel";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

// Helper to call the ai-admin-settings edge function
async function adminApi(body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin-settings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

const TEXT_PROVIDERS = [
  { label: "OpenRouter", value: "openrouter" },
  { label: "Lovable AI", value: "lovable" },
  { label: "OpenAI", value: "openai" },
  { label: "Gemini", value: "gemini" },
  { label: "Groq", value: "groq" },
  { label: "Together AI", value: "together" },
  { label: "DeepSeek", value: "deepseek" },
];

const IMAGE_PROVIDERS = [
  { label: "OpenRouter", value: "openrouter" },
  { label: "Lovable AI", value: "lovable" },
  { label: "OpenAI Image", value: "openai_image" },
  { label: "Stability", value: "stability" },
  { label: "Replicate", value: "replicate" },
  { label: "Fal AI", value: "fal" },
];

function healthBadge(status?: string) {
  if (status === "healthy") return <Badge variant="secondary">Healthy</Badge>;
  if (status === "degraded") return <Badge variant="outline">Degraded</Badge>;
  if (status === "down") return <Badge variant="destructive">Down</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

// ===================== TEXT MODELS =====================
function TextModelsPanel() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const testKey = async () => {
    if (!editing?.api_key_secret_name) {
      setTestResult({ ok: false, msg: "Enter an API key first" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-validate-key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: editing.provider_name, api_key: editing.api_key_secret_name }),
        }
      );
      const json = await res.json();
      setTestResult({ ok: !!json.ok, msg: json.ok ? json.message : (json.error || "Unknown error") });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message || "Validation failed" });
    } finally {
      setTesting(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminApi({ action: "list", table: "ai_provider_settings" });
      setProviders((rows || []).filter((r: any) => r.provider_type === "text"));
    } catch (e: any) {
      toast({ title: "Error loading providers", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        provider_name: editing.provider_name,
        provider_type: "text",
        model_name: editing.model_name,
        api_key_secret_name: editing.api_key_secret_name || null,
        temperature: editing.temperature ?? 0.7,
        max_tokens: editing.max_tokens ?? 2048,
        top_p: editing.top_p ?? 1.0,
        frequency_penalty: editing.frequency_penalty ?? 0,
        presence_penalty: editing.presence_penalty ?? 0,
        is_active: editing.is_active ?? false,
        is_fallback: editing.is_fallback ?? false,
        priority: editing.priority ?? (editing.is_fallback ? 50 : 10),
        health_status: editing.health_status || "unknown",
        config_json: editing.config_json || {},
      };
      if (editing.id) {
        await adminApi({ action: "update", table: "ai_provider_settings", id: editing.id, data: payload });
      } else {
        await adminApi({ action: "create", table: "ai_provider_settings", data: payload });
      }
      toast({ title: "Provider saved ✓" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi({ action: "delete", table: "ai_provider_settings", id });
      toast({ title: "Provider deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Text AI Providers</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setEditing({
            provider_name: "openrouter", model_name: "openrouter/auto", temperature: 0.7,
            max_tokens: 2048, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0,
            is_active: false, is_fallback: false, api_key_secret_name: "", priority: 10, health_status: "unknown",
          })}>
            <Plus className="h-4 w-4 mr-1" /> Add Provider
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
        Providers run by priority. Lower numbers run first; degraded providers remain fallbackable, while down providers are skipped.
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Select value={editing.provider_name} onValueChange={v => setEditing({ ...editing, provider_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEXT_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>OpenRouter Model Slug</Label><Input value={editing.model_name} onChange={e => setEditing({ ...editing, model_name: e.target.value })} placeholder="e.g. openrouter/auto" /></div>
              <div><Label>OpenRouter API Key</Label><Input type="password" value={editing.api_key_secret_name || ""} onChange={e => setEditing({ ...editing, api_key_secret_name: e.target.value })} placeholder="sk-or-..." /></div>
              <div><Label>Max Tokens</Label><Input type="number" value={editing.max_tokens} onChange={e => setEditing({ ...editing, max_tokens: parseInt(e.target.value) || 2048 })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Temperature: {editing.temperature}</Label>
                <Slider min={0} max={2} step={0.1} value={[editing.temperature]} onValueChange={([v]) => setEditing({ ...editing, temperature: v })} />
              </div>
              <div>
                <Label>Top P: {editing.top_p}</Label>
                <Slider min={0} max={1} step={0.05} value={[editing.top_p]} onValueChange={([v]) => setEditing({ ...editing, top_p: v })} />
              </div>
              <div>
                <Label>Freq Penalty: {editing.frequency_penalty}</Label>
                <Slider min={0} max={2} step={0.1} value={[editing.frequency_penalty]} onValueChange={([v]) => setEditing({ ...editing, frequency_penalty: v })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_fallback} onCheckedChange={v => setEditing({ ...editing, is_fallback: v })} /><Label>Fallback</Label></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button size="sm" variant="outline" onClick={testKey} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Key className="h-4 w-4 mr-1" />} Test Key
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${testResult.ok ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>Temp</TableHead><TableHead>API Key</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {providers.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No text providers configured. Add one above.</TableCell></TableRow>
            )}
            {providers.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{TEXT_PROVIDERS.find(x => x.value === p.provider_name)?.label || p.provider_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.model_name}</TableCell>
                <TableCell>{p.temperature}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.api_key_secret_name || "Lovable AI (built-in)"}</TableCell>
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
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ===================== IMAGE MODELS =====================
function ImageModelsPanel() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminApi({ action: "list", table: "ai_provider_settings" });
      setProviders((rows || []).filter((r: any) => r.provider_type === "image"));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        provider_name: editing.provider_name,
        provider_type: "image",
        model_name: editing.model_name,
        api_key_secret_name: editing.api_key_secret_name || null,
        is_active: editing.is_active ?? false,
        is_fallback: editing.is_fallback ?? false,
        config_json: editing.config_json || {},
      };
      if (editing.id) {
        await adminApi({ action: "update", table: "ai_provider_settings", id: editing.id, data: payload });
      } else {
        await adminApi({ action: "create", table: "ai_provider_settings", data: payload });
      }
      toast({ title: "Image provider saved ✓" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi({ action: "delete", table: "ai_provider_settings", id });
      toast({ title: "Provider deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Image AI Providers</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setEditing({
            provider_name: "openrouter", model_name: "google/gemini-2.5-flash-image", is_active: false, is_fallback: false, api_key_secret_name: "",
          })}>
            <Plus className="h-4 w-4 mr-1" /> Add Provider
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
        Only <strong>OpenRouter</strong> is supported for image generation. Use an
        OpenRouter image-capable model slug (e.g. <code>google/gemini-2.5-flash-image</code>) and
        paste your OpenRouter API key (<code>sk-or-...</code>) below.
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Provider</Label>
              <Select value={editing.provider_name} onValueChange={v => setEditing({ ...editing, provider_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{IMAGE_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>OpenRouter Model Slug</Label><Input value={editing.model_name} onChange={e => setEditing({ ...editing, model_name: e.target.value })} placeholder="e.g. google/gemini-2.5-flash-image" /></div>
            <div><Label>OpenRouter API Key</Label><Input type="password" value={editing.api_key_secret_name || ""} onChange={e => setEditing({ ...editing, api_key_secret_name: e.target.value })} placeholder="sk-or-..." /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_fallback} onCheckedChange={v => setEditing({ ...editing, is_fallback: v })} /><Label>Fallback</Label></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>API Key</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {providers.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No image providers configured.</TableCell></TableRow>
            )}
            {providers.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{IMAGE_PROVIDERS.find(x => x.value === p.provider_name)?.label || p.provider_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.model_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.api_key_secret_name || "Lovable AI (built-in)"}</TableCell>
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
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ===================== API KEYS =====================
function ApiKeysPanel() {
  const { toast } = useToast();
  const knownKeys = [
    { name: "OPENAI_API_KEY", provider: "OpenAI", description: "Used for GPT models and DALL-E" },
    { name: "GOOGLE_AI_API_KEY", provider: "Google Gemini", description: "Used for Gemini models" },
    { name: "ANTHROPIC_API_KEY", provider: "Anthropic", description: "Used for Claude models" },
    { name: "GROQ_API_KEY", provider: "Groq", description: "Used for Groq-hosted models" },
    { name: "OPENROUTER_API_KEY", provider: "OpenRouter", description: "Access to 100+ models" },
    { name: "STABILITY_API_KEY", provider: "Stability AI", description: "Used for Stable Diffusion" },
    { name: "REPLICATE_API_TOKEN", provider: "Replicate", description: "Used for hosted models" },
    { name: "FAL_KEY", provider: "Fal AI", description: "Used for Fal image models" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">API Key Management</h3>
        <p className="text-sm text-muted-foreground mt-1">
          API keys are stored as encrypted secrets and are never exposed in the frontend. 
          To add or update a key, use the secret management system in your backend settings.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Security Note:</strong> API keys are stored as encrypted backend secrets. 
            The "API Key Secret Name" field in provider settings references these secrets by name. 
            For Lovable AI (built-in), no key is needed.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Supported Providers & Secret Names</h4>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Secret Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>How to Add</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {knownKeys.map(k => (
              <TableRow key={k.name}>
                <TableCell className="font-medium">{k.provider}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{k.name}</code></TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">Add via Backend Secrets</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardContent className="py-4 space-y-2">
          <h4 className="font-medium text-foreground">How to Add API Keys</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Get your API key from the provider's dashboard (e.g., platform.openai.com)</li>
            <li>Add it as a backend secret using the secret name shown above</li>
            <li>In the Text/Image Models tab, set the "API Key Secret Name" field to match</li>
            <li>The edge function will automatically use the correct key when calling that provider</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== PROMPT TEMPLATES =====================
function PromptTemplatesPanel() {
  const { toast } = useToast();
  const templateTypes = ["caption", "ad_copy", "hook", "cta", "carousel", "linkedin", "image_prompt", "hashtag_generation", "weekly_content"];
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminApi({ action: "list", table: "ai_prompt_templates" });
      setTemplates(rows || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        template_type: editing.template_type,
        system_prompt: editing.system_prompt,
        hidden_instructions: editing.hidden_instructions || "",
        is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        await adminApi({ action: "update", table: "ai_prompt_templates", id: editing.id, data: payload });
      } else {
        await adminApi({ action: "create", table: "ai_prompt_templates", data: payload });
      }
      toast({ title: "Template saved ✓" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi({ action: "delete", table: "ai_prompt_templates", id });
      toast({ title: "Template deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Prompt Templates</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setEditing({ name: "", template_type: "caption", system_prompt: "", hidden_instructions: "", is_active: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Template
          </Button>
        </div>
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
          <div><Label>System Prompt</Label><Textarea rows={5} value={editing.system_prompt} onChange={e => setEditing({ ...editing, system_prompt: e.target.value })} placeholder="Main AI instruction..." /></div>
          <div><Label>Hidden Instructions (appended but not shown to users)</Label><Textarea rows={3} value={editing.hidden_instructions} onChange={e => setEditing({ ...editing, hidden_instructions: e.target.value })} placeholder="Additional hidden context..." /></div>
          <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {templates.length === 0 && <p className="text-center text-muted-foreground py-8">No prompt templates yet.</p>}
          {templates.map(t => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setEditing(t)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.template_type?.replace(/_/g, " ")} • {(t.system_prompt || "").substring(0, 80)}...</p>
                </div>
                <div className="flex items-center gap-2">
                  {t.is_active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); remove(t.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== PLAN LIMITS =====================
function PlanLimitsPanel() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminApi({ action: "list", table: "ai_plan_limits" });
      setPlans(rows || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        plan_name: editing.plan_name,
        text_generations_limit: editing.text_generations_limit ?? 5,
        image_generations_limit: editing.image_generations_limit ?? 2,
        regeneration_limit: editing.regeneration_limit ?? 3,
        brand_preset_limit: editing.brand_preset_limit ?? 1,
        can_edit_prompts: editing.can_edit_prompts ?? false,
        can_select_model: editing.can_select_model ?? false,
        premium_model_access: editing.premium_model_access ?? false,
        premium_image_styles: editing.premium_image_styles ?? false,
        gmb_enabled: editing.gmb_enabled ?? false,
      };
      if (editing.id) {
        await adminApi({ action: "update", table: "ai_plan_limits", id: editing.id, data: payload });
      } else {
        await adminApi({ action: "create", table: "ai_plan_limits", data: payload });
      }
      toast({ title: "Plan saved ✓" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi({ action: "delete", table: "ai_plan_limits", id });
      toast({ title: "Plan deleted" }); load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Plan Limits</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setEditing({
            plan_name: "", text_generations_limit: 5, image_generations_limit: 2,
            regeneration_limit: 3, brand_preset_limit: 1, can_edit_prompts: false,
            can_select_model: false, premium_model_access: false, premium_image_styles: false,
          })}>
            <Plus className="h-4 w-4 mr-1" /> Add Plan
          </Button>
        </div>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Plan Name</Label><Input value={editing.plan_name} onChange={e => setEditing({ ...editing, plan_name: e.target.value })} /></div>
            <div><Label>Text Limit /mo</Label><Input type="number" value={editing.text_generations_limit} onChange={e => setEditing({ ...editing, text_generations_limit: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Image Limit /mo</Label><Input type="number" value={editing.image_generations_limit} onChange={e => setEditing({ ...editing, image_generations_limit: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Regen Limit</Label><Input type="number" value={editing.regeneration_limit} onChange={e => setEditing({ ...editing, regeneration_limit: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><Switch checked={editing.can_edit_prompts} onCheckedChange={v => setEditing({ ...editing, can_edit_prompts: v })} /><Label>Can Edit Prompts</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.can_select_model} onCheckedChange={v => setEditing({ ...editing, can_select_model: v })} /><Label>Can Select Model</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.premium_model_access} onCheckedChange={v => setEditing({ ...editing, premium_model_access: v })} /><Label>Premium Models</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.gmb_enabled ?? false} onCheckedChange={v => setEditing({ ...editing, gmb_enabled: v })} /><Label>Google My Business</Label></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Text</TableHead><TableHead>Image</TableHead><TableHead>Regen</TableHead><TableHead>Prompts</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {plans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No plans configured.</TableCell></TableRow>}
            {plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.plan_name}</TableCell>
                <TableCell>{p.text_generations_limit}/mo</TableCell>
                <TableCell>{p.image_generations_limit}/mo</TableCell>
                <TableCell>{p.regeneration_limit}</TableCell>
                <TableCell>{p.can_edit_prompts ? "✓" : "✗"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ===================== FEATURE FLAGS =====================
function FeatureFlagsPanel() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminApi({ action: "list", table: "ai_feature_flags" });
      const required = [
        { feature_key: "allow_text_generation", enabled: true, plan_restriction: [] },
        { feature_key: "allow_image_generation", enabled: true, plan_restriction: [] },
        { feature_key: "allow_video_generation", enabled: false, plan_restriction: [] },
      ];
      const missing = required.filter(flag => !(rows || []).some((row: any) => row.feature_key === flag.feature_key));
      for (const flag of missing) await adminApi({ action: "create", table: "ai_feature_flags", data: flag });
      setFlags(missing.length ? await adminApi({ action: "list", table: "ai_feature_flags" }) : (rows || []));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flag: any) => {
    try {
      await adminApi({ action: "update", table: "ai_feature_flags", id: flag.id, data: { enabled: !flag.enabled } });
      toast({ title: `${flag.feature_key} ${!flag.enabled ? "enabled" : "disabled"}` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const setGenerationMode = async (mode: "text" | "image" | "video") => {
    const nextState: Record<string, boolean> = {
      allow_text_generation: true,
      allow_image_generation: mode === "image" || mode === "video",
      allow_video_generation: mode === "video",
    };
    try {
      await Promise.all(flags
        .filter((flag: any) => flag.feature_key in nextState)
        .map((flag: any) => adminApi({ action: "update", table: "ai_feature_flags", id: flag.id, data: { enabled: nextState[flag.feature_key] } })));
      toast({ title: "Generation mode updated ✓" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const enabledMap = Object.fromEntries(flags.map((flag: any) => [flag.feature_key, !!flag.enabled]));
  const activeMode = enabledMap.allow_video_generation ? "video" : enabledMap.allow_image_generation ? "image" : "text";
  const generationFlags = flags.filter((flag: any) => ["allow_text_generation", "allow_image_generation", "allow_video_generation"].includes(flag.feature_key));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-foreground">Feature Flags</h3>
          <p className="text-sm text-muted-foreground">Control what AI features are available platform-wide</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 space-y-3">
          <p className="font-semibold text-foreground text-sm mb-1">Content Generation Modes</p>
          <p className="text-xs text-muted-foreground">
            Choose exactly what every user can generate. Text is always required; image and video are optional admin-controlled add-ons.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button size="sm" variant={activeMode === "text" ? "default" : "outline"} onClick={() => setGenerationMode("text")}>Text only</Button>
            <Button size="sm" variant={activeMode === "image" ? "default" : "outline"} onClick={() => setGenerationMode("image")}>Text + Image</Button>
            <Button size="sm" variant={activeMode === "video" ? "default" : "outline"} onClick={() => setGenerationMode("video")}>Text + Image + Video</Button>
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {generationFlags.length === 0 && <p className="text-center text-muted-foreground py-8">No feature flags configured.</p>}
          {generationFlags.map(f => (
            <Card key={f.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground capitalize">{f.feature_key?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.feature_key === "allow_text_generation" && "Master switch — when off, no users can generate any content."}
                    {f.feature_key === "allow_image_generation" && "When off, every generated post is text-only (no AI images)."}
                    {f.feature_key === "allow_video_generation" && "Reserved for upcoming video post format."}
                    {!["allow_text_generation","allow_image_generation","allow_video_generation"].includes(f.feature_key) && f.feature_key}
                  </p>
                </div>
                <Switch checked={f.enabled} onCheckedChange={() => toggle(f)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== USAGE LOGS =====================
function UsageLogsPanel() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi({ action: "usage_stats", table: "ai_usage_logs" });
      setStats(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!stats) return <p className="text-center text-muted-foreground py-8">No usage data available.</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Usage Logs</h3>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>
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
            <TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Time (ms)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(stats.recent_logs || []).map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{log.generation_type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.provider || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.model || "-"}</TableCell>
                <TableCell>
                  {log.status === "success"
                    ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge>
                    : <Badge variant="destructive">Error</Badge>}
                </TableCell>
                <TableCell className="text-xs">{log.response_time_ms || "-"}</TableCell>
              </TableRow>
            ))}
            {(stats.recent_logs || []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No logs yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===================== MODEL DISCOVERY =====================
function ModelDiscoveryPanel() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminApi({ action: "list", table: "ai_provider_settings" });
      setProviders(rows || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const sync = async (provider: any) => {
    setSyncingId(provider.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-list-models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ provider_id: provider.id }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Sync failed");
      toast({ title: `Synced ${j.count} models` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSyncingId(null); }
  };

  const toggleModel = async (provider: any, kind: "text" | "image" | "video", modelId: string) => {
    const field = `selected_${kind}_models` as const;
    const current: string[] = provider[field] || [];
    const next = current.includes(modelId) ? current.filter((m) => m !== modelId) : [...current, modelId];
    try {
      await adminApi({ action: "update", table: "ai_provider_settings", id: provider.id, data: { [field]: next } });
      setProviders((prev) => prev.map((p) => p.id === provider.id ? { ...p, [field]: next } : p));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Click <strong>Sync Models</strong> on each provider to fetch the live list of available models, then check the ones you want users to be able to select.
      </div>
      {providers.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No providers configured. Add one in API Keys first.</CardContent></Card>
      )}
      {providers.map((p) => {
        const models: any[] = Array.isArray(p.available_models) ? p.available_models : [];
        const groups: Record<string, any[]> = { text: [], image: [], video: [] };
        for (const m of models) {
          const k = (m.kind || "text") as "text" | "image" | "video";
          (groups[k] || groups.text).push(m);
        }
        return (
          <Card key={p.id}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{p.provider_name} <span className="text-xs text-muted-foreground">({p.provider_type})</span></div>
                  <div className="text-xs text-muted-foreground">
                    {p.models_synced_at ? `Synced ${new Date(p.models_synced_at).toLocaleString()}` : "Never synced"} • {models.length} models available
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => sync(p)} disabled={syncingId === p.id}>
                  {syncingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync Models
                </Button>
              </div>
              {(["text", "image", "video"] as const).map((kind) => (
                groups[kind].length > 0 && (
                  <div key={kind}>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{kind} models ({groups[kind].length})</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                      {groups[kind].map((m) => {
                        const selected: string[] = p[`selected_${kind}_models`] || [];
                        const checked = selected.includes(m.id);
                        return (
                          <label key={m.id} className={`flex items-start gap-2 rounded-md border p-2 text-xs cursor-pointer hover:bg-muted/40 ${checked ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                            <Checkbox checked={checked} onCheckedChange={() => toggleModel(p, kind, m.id)} />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{m.name || m.id}</div>
                              <div className="text-muted-foreground truncate">{m.id}</div>
                              {m.context_length && <div className="text-muted-foreground">ctx {m.context_length}</div>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ===================== ADMIN GMB PANEL =====================
function AdminGMBPanel() {
  const [stats, setStats] = useState<any>({ connected: 0, avg_completeness: 0, optimizations_this_month: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "completeness_score" | "last_optimized_at">("completeness_score");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: profiles }, { data: opts }] = await Promise.all([
          supabase.from("gmb_profiles").select("*"),
          supabase.from("gmb_optimizations").select("created_at").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);
        const p = profiles || [];
        setUsers(p);
        setStats({
          connected: p.length,
          avg_completeness: p.length ? Math.round(p.reduce((s: number, x: any) => s + (x.completeness_score || 0), 0) / p.length) : 0,
          optimizations_this_month: (opts || []).length,
        });
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const sorted = [...users].sort((a, b) => {
    const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
    if (typeof av === "string") return av.localeCompare(bv as string);
    return (bv as number) - (av as number);
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Connected GMB users</div><div className="text-2xl font-bold">{stats.connected}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Avg completeness</div><div className="text-2xl font-bold">{stats.avg_completeness}%</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Optimizations this month</div><div className="text-2xl font-bold">{stats.optimizations_this_month}</div></CardContent></Card>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="cursor-pointer" onClick={() => setSortBy("name")}>Business</TableHead>
          <TableHead className="cursor-pointer" onClick={() => setSortBy("rating")}>Rating</TableHead>
          <TableHead className="cursor-pointer" onClick={() => setSortBy("completeness_score")}>Completeness</TableHead>
          <TableHead className="cursor-pointer" onClick={() => setSortBy("last_optimized_at")}>Last Optimized</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {sorted.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No GMB profiles connected yet.</TableCell></TableRow>}
          {sorted.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name || "Untitled"}</TableCell>
              <TableCell>{u.rating || 0} ★ ({u.review_count || 0})</TableCell>
              <TableCell>{u.completeness_score || 0}%</TableCell>
              <TableCell className="text-xs text-muted-foreground">{u.last_optimized_at ? new Date(u.last_optimized_at).toLocaleDateString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===================== MAIN ADMIN PAGE =====================
export default function AdminAIControlCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
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
            <TabsTrigger value="api-keys" className="flex items-center gap-1"><Key className="h-3.5 w-3.5" /> API Keys</TabsTrigger>
            <TabsTrigger value="model-discovery" className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Model Discovery</TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Prompts</TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Plan Limits</TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Pricing</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-1"><ToggleLeft className="h-3.5 w-3.5" /> Feature Flags</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Usage Logs</TabsTrigger>
            <TabsTrigger value="gmb" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Google Business</TabsTrigger>
          </TabsList>
          <TabsContent value="text-models"><TextModelsPanel /></TabsContent>
          <TabsContent value="image-models"><ImageModelsPanel /></TabsContent>
          <TabsContent value="api-keys"><ApiKeysPanel /></TabsContent>
          <TabsContent value="model-discovery"><ModelDiscoveryPanel /></TabsContent>
          <TabsContent value="prompts"><PromptTemplatesPanel /></TabsContent>
          <TabsContent value="plans"><PlanLimitsPanel /></TabsContent>
          <TabsContent value="pricing"><GeoPricingPanel /></TabsContent>
          <TabsContent value="flags"><FeatureFlagsPanel /></TabsContent>
          <TabsContent value="logs"><UsageLogsPanel /></TabsContent>
          <TabsContent value="gmb"><AdminGMBPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
