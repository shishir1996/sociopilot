import { useState } from "react";
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
  Plus, Trash2, Save, DollarSign,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GeoPricingPanel } from "@/components/admin/GeoPricingPanel";

// ===================== TEXT MODELS =====================
function TextModelsPanel() {
  const { toast } = useToast();
  const [providers, setProviders] = useState([
    { id: "1", name: "Lovable AI", model: "google/gemini-3-flash-preview", temp: 0.7, maxTokens: 2048, active: true, fallback: false },
  ]);
  const [editing, setEditing] = useState<any>(null);

  const save = () => {
    if (!editing) return;
    if (editing.id) {
      setProviders(prev => prev.map(p => p.id === editing.id ? editing : p));
    } else {
      setProviders(prev => [...prev, { ...editing, id: Date.now().toString() }]);
    }
    setEditing(null);
    toast({ title: "Provider saved ✓" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Text AI Providers</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", model: "", temp: 0.7, maxTokens: 2048, active: false, fallback: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Provider Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. OpenAI" /></div>
              <div><Label>Model Name</Label><Input value={editing.model} onChange={e => setEditing({ ...editing, model: e.target.value })} placeholder="google/gemini-3-flash-preview" /></div>
              <div><Label>Temperature</Label><Input type="number" step="0.1" min="0" max="2" value={editing.temp} onChange={e => setEditing({ ...editing, temp: parseFloat(e.target.value) })} /></div>
              <div><Label>Max Tokens</Label><Input type="number" value={editing.maxTokens} onChange={e => setEditing({ ...editing, maxTokens: parseInt(e.target.value) })} /></div>
              <div><Label>API Key Secret Name</Label><Input value={editing.apiKey || ""} onChange={e => setEditing({ ...editing, apiKey: e.target.value })} placeholder="Leave empty for Lovable AI" /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.fallback} onCheckedChange={v => setEditing({ ...editing, fallback: v })} /><Label>Fallback</Label></div>
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
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.model}</TableCell>
              <TableCell>{p.temp}</TableCell>
              <TableCell>
                {p.active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                {p.fallback && <Badge variant="outline" className="ml-1">Fallback</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setProviders(prev => prev.filter(x => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===================== IMAGE MODELS =====================
function ImageModelsPanel() {
  const { toast } = useToast();
  const [providers, setProviders] = useState([
    { id: "1", name: "Lovable AI", model: "google/gemini-3.1-flash-image-preview", active: true, fallback: false },
  ]);
  const [editing, setEditing] = useState<any>(null);

  const save = () => {
    if (!editing) return;
    if (editing.id) {
      setProviders(prev => prev.map(p => p.id === editing.id ? editing : p));
    } else {
      setProviders(prev => [...prev, { ...editing, id: Date.now().toString() }]);
    }
    setEditing(null);
    toast({ title: "Provider saved ✓" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Image AI Providers</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", model: "", active: false, fallback: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Provider Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Model Name</Label><Input value={editing.model} onChange={e => setEditing({ ...editing, model: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.fallback} onCheckedChange={v => setEditing({ ...editing, fallback: v })} /><Label>Fallback</Label></div>
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
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.model}</TableCell>
              <TableCell>{p.active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setProviders(prev => prev.filter(x => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===================== PROMPT TEMPLATES =====================
function PromptTemplatesPanel() {
  const { toast } = useToast();
  const templateTypes = ["caption", "ad_copy", "hook", "cta", "carousel", "linkedin", "image_prompt", "hashtag_generation"];
  const [templates, setTemplates] = useState([
    { id: "1", name: "Default Caption Prompt", type: "caption", prompt: "You are a social media expert. Generate engaging captions...", hidden: "", active: true },
    { id: "2", name: "Default Ad Copy Prompt", type: "ad_copy", prompt: "You are a conversion copywriter. Write compelling ad copy...", hidden: "", active: true },
  ]);
  const [editing, setEditing] = useState<any>(null);

  const save = () => {
    if (!editing) return;
    if (editing.id) {
      setTemplates(prev => prev.map(t => t.id === editing.id ? editing : t));
    } else {
      setTemplates(prev => [...prev, { ...editing, id: Date.now().toString() }]);
    }
    setEditing(null);
    toast({ title: "Template saved ✓" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Prompt Templates</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", type: "caption", prompt: "", hidden: "", active: true })}>
          <Plus className="h-4 w-4 mr-1" /> Add Template
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={editing.type} onValueChange={v => setEditing({ ...editing, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{templateTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>System Prompt</Label><Textarea rows={4} value={editing.prompt} onChange={e => setEditing({ ...editing, prompt: e.target.value })} placeholder="Main AI instruction..." /></div>
          <div><Label>Hidden Instructions</Label><Textarea rows={3} value={editing.hidden} onChange={e => setEditing({ ...editing, hidden: e.target.value })} placeholder="Additional hidden instructions..." /></div>
          <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
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
                <p className="text-xs text-muted-foreground">{t.type.replace(/_/g, " ")} • {t.prompt.substring(0, 80)}...</p>
              </div>
              <div className="flex items-center gap-2">
                {t.active ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setTemplates(prev => prev.filter(x => x.id !== t.id)); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===================== PLAN LIMITS =====================
function PlanLimitsPanel() {
  const { toast } = useToast();
  const [plans, setPlans] = useState([
    { id: "1", name: "Free", textLimit: 5, imageLimit: 2, regenLimit: 3, canEditPrompts: false, canSelectModel: false, premiumModels: false },
    { id: "2", name: "Starter", textLimit: 100, imageLimit: 20, regenLimit: 10, canEditPrompts: false, canSelectModel: false, premiumModels: false },
    { id: "3", name: "Pro", textLimit: 500, imageLimit: 100, regenLimit: 50, canEditPrompts: true, canSelectModel: false, premiumModels: true },
    { id: "4", name: "Agency", textLimit: 9999, imageLimit: 9999, regenLimit: 9999, canEditPrompts: true, canSelectModel: true, premiumModels: true },
  ]);
  const [editing, setEditing] = useState<any>(null);

  const save = () => {
    if (!editing) return;
    if (editing.id) {
      setPlans(prev => prev.map(p => p.id === editing.id ? editing : p));
    } else {
      setPlans(prev => [...prev, { ...editing, id: Date.now().toString() }]);
    }
    setEditing(null);
    toast({ title: "Plan saved ✓" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Plan Limits</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", textLimit: 5, imageLimit: 2, regenLimit: 3, canEditPrompts: false, canSelectModel: false, premiumModels: false })}>
          <Plus className="h-4 w-4 mr-1" /> Add Plan
        </Button>
      </div>
      {editing && (
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Plan Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Text Limit /mo</Label><Input type="number" value={editing.textLimit} onChange={e => setEditing({ ...editing, textLimit: parseInt(e.target.value) })} /></div>
            <div><Label>Image Limit /mo</Label><Input type="number" value={editing.imageLimit} onChange={e => setEditing({ ...editing, imageLimit: parseInt(e.target.value) })} /></div>
            <div><Label>Regen Limit</Label><Input type="number" value={editing.regenLimit} onChange={e => setEditing({ ...editing, regenLimit: parseInt(e.target.value) })} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><Switch checked={editing.canEditPrompts} onCheckedChange={v => setEditing({ ...editing, canEditPrompts: v })} /><Label>Can Edit Prompts</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.canSelectModel} onCheckedChange={v => setEditing({ ...editing, canSelectModel: v })} /><Label>Can Select Model</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.premiumModels} onCheckedChange={v => setEditing({ ...editing, premiumModels: v })} /><Label>Premium Models</Label></div>
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
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.textLimit}/mo</TableCell>
              <TableCell>{p.imageLimit}/mo</TableCell>
              <TableCell>{p.regenLimit}</TableCell>
              <TableCell>{p.canEditPrompts ? "✓" : "✗"}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setPlans(prev => prev.filter(x => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===================== FEATURE FLAGS =====================
function FeatureFlagsPanel() {
  const [flags, setFlags] = useState([
    { id: "1", key: "ai_studio_enabled", label: "AI Studio (Global)", enabled: true },
    { id: "2", key: "text_gen_enabled", label: "Text Generation", enabled: true },
    { id: "3", key: "image_gen_enabled", label: "Image Generation", enabled: true },
    { id: "4", key: "user_prompt_editing", label: "User Prompt Editing", enabled: false },
  ]);

  const toggle = (id: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Feature Flags</h3>
      <p className="text-sm text-muted-foreground">Control what AI features are available platform-wide</p>
      <div className="space-y-3">
        {flags.map(f => (
          <Card key={f.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.key}</p>
              </div>
              <Switch checked={f.enabled} onCheckedChange={() => toggle(f.id)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===================== USAGE LOGS =====================
function UsageLogsPanel() {
  const stats = {
    total: 1247,
    month: 342,
    week: 89,
    text: 984,
    image: 263,
    errors: 12,
  };

  const recentLogs = [
    { id: "1", time: "2026-04-09 14:32", type: "text", model: "gemini-3-flash", status: "success", ms: 1240 },
    { id: "2", time: "2026-04-09 14:28", type: "image", model: "gemini-3.1-flash-image", status: "success", ms: 8450 },
    { id: "3", time: "2026-04-09 14:15", type: "text", model: "gemini-3-flash", status: "error", ms: 320 },
    { id: "4", time: "2026-04-09 13:55", type: "text", model: "gemini-3-flash", status: "success", ms: 1580 },
    { id: "5", time: "2026-04-09 13:40", type: "image", model: "gemini-3.1-flash-image", status: "success", ms: 9200 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "This Month", value: stats.month },
          { label: "This Week", value: stats.week },
          { label: "Text", value: stats.text },
          { label: "Image", value: stats.image },
          { label: "Errors", value: stats.errors },
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
            {recentLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{log.time}</TableCell>
                <TableCell><Badge variant="outline">{log.type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.model}</TableCell>
                <TableCell>{log.status === "success" ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge> : <Badge variant="destructive">Error</Badge>}</TableCell>
                <TableCell className="text-xs">{log.ms}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
            <TabsTrigger value="prompts" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Prompts</TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Plan Limits</TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Pricing</TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-1"><ToggleLeft className="h-3.5 w-3.5" /> Feature Flags</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Usage Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="text-models"><TextModelsPanel /></TabsContent>
          <TabsContent value="image-models"><ImageModelsPanel /></TabsContent>
          <TabsContent value="prompts"><PromptTemplatesPanel /></TabsContent>
          <TabsContent value="plans"><PlanLimitsPanel /></TabsContent>
          <TabsContent value="pricing"><GeoPricingPanel /></TabsContent>
          <TabsContent value="flags"><FeatureFlagsPanel /></TabsContent>
          <TabsContent value="logs"><UsageLogsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
