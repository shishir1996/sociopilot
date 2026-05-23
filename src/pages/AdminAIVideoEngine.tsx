import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

const TOGGLES: { key: string; label: string; desc: string }[] = [
  { key: "enable_stock_video_mode", label: "Stock Video Engine", desc: "Pexels / Pixabay sourcing" },
  { key: "enable_ai_image_generation", label: "AI Image Generation", desc: "Lovable AI / Stability / Fal" },
  { key: "enable_motion_graphics", label: "Motion Graphics", desc: "Animated overlays, transitions" },
  { key: "enable_auto_caption", label: "Auto Captions", desc: "Animated word-by-word subtitles" },
  { key: "enable_auto_branding", label: "Auto Branding", desc: "Logo + brand color overlays" },
  { key: "enable_auto_cta_outro", label: "Auto CTA Outro", desc: "End card with brand CTA" },
  { key: "enable_premium_voice", label: "Premium Voice (ElevenLabs)", desc: "High-quality TTS" },
  { key: "enable_4k_rendering", label: "4K Rendering", desc: "Enterprise only" },
  { key: "enable_premium_video_generation", label: "Premium AI Video Generation", desc: "Master switch for cinematic AI engines" },
  { key: "enable_ai_avatar_generation", label: "AI Avatar Generation", desc: "UGC-style AI presenters" },
  { key: "enable_runway_generation", label: "Runway Engine", desc: "Requires RUNWAY_API_KEY secret" },
  { key: "enable_kling_generation", label: "Kling Engine", desc: "Requires KLING_API_KEY secret" },
  { key: "enable_pika_generation", label: "Pika Engine", desc: "Requires PIKA_API_KEY secret" },
  { key: "enable_veo_generation", label: "Veo Engine", desc: "Requires VEO_API_KEY secret" },
];

const PROVIDER_SECRETS: { key: string; label: string; desc: string; where: string }[] = [
  { key: "PEXELS_API_KEY", label: "Pexels", desc: "Stock video/photo sourcing", where: "pexels.com/api" },
  { key: "PIXABAY_API_KEY", label: "Pixabay", desc: "Stock video/photo sourcing", where: "pixabay.com/api/docs" },
  { key: "ELEVENLABS_API_KEY", label: "ElevenLabs", desc: "Premium TTS voice", where: "elevenlabs.io → Profile → API Keys" },
  { key: "STABILITY_API_KEY", label: "Stability AI", desc: "AI image generation", where: "platform.stability.ai" },
  { key: "FAL_API_KEY", label: "Fal.ai", desc: "AI image/video generation", where: "fal.ai/dashboard/keys" },
  { key: "RUNWAY_API_KEY", label: "Runway", desc: "Premium AI video engine", where: "dev.runwayml.com" },
  { key: "KLING_API_KEY", label: "Kling", desc: "Premium AI video engine", where: "klingai.com" },
  { key: "PIKA_API_KEY", label: "Pika", desc: "Premium AI video engine", where: "pika.art" },
  { key: "VEO_API_KEY", label: "Veo (Google)", desc: "Premium AI video engine", where: "Google AI Studio" },
];

export default function AdminAIVideoEngine() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState<any[]>([]);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      const admin = !!roles?.length;
      setIsAdmin(admin);
      if (!admin) return;
      const { data } = await supabase.from("admin_ai_settings").select("*").eq("singleton", true).maybeSingle();
      setSettings(data);
      loadKeys();
    })();
  }, [user, authLoading, navigate]);

  const loadKeys = async () => {
    const { data } = await supabase
      .from("provider_api_keys" as any)
      .select("*")
      .order("key_name", { ascending: true });
    setKeys(data || []);
  };

  const saveKey = async (row: any) => {
    const newVal = keyDrafts[row.key_name];
    if (newVal === undefined) return;
    setSavingKey(row.key_name);
    const { error } = await supabase
      .from("provider_api_keys" as any)
      .update({ key_value: newVal, updated_by: user?.id })
      .eq("id", row.id);
    setSavingKey(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${row.key_name} saved`);
    setKeyDrafts((d) => { const n = { ...d }; delete n[row.key_name]; return n; });
    loadKeys();
  };

  const clearKey = async (row: any) => {
    setSavingKey(row.key_name);
    const { error } = await supabase
      .from("provider_api_keys" as any)
      .update({ key_value: null })
      .eq("id", row.id);
    setSavingKey(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${row.key_name} cleared`);
    loadKeys();
  };

  const update = (patch: any) => setSettings((s: any) => ({ ...s, ...patch }));

  const save = async () => {
    if (!settings?.id) return;
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase.from("admin_ai_settings").update(rest).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  if (authLoading || isAdmin === null) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Admin only.</div>;
  }
  if (!settings) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Video Engine</h1>
            <p className="text-muted-foreground">Provider toggles and rendering limits. API keys live in the secret manager.</p>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feature toggles</CardTitle>
            <CardDescription>Default state for premium engines is OFF.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {TOGGLES.map((t) => (
              <div key={t.key} className="flex items-start justify-between p-3 rounded-lg border">
                <div className="pr-3">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
                <Switch
                  checked={!!settings[t.key]}
                  onCheckedChange={(v) => update({ [t.key]: v })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendering limits</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Max video length (seconds)</Label>
              <Input type="number" value={settings.max_video_length} onChange={(e) => update({ max_video_length: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Max render queue size</Label>
              <Input type="number" value={settings.max_render_queue} onChange={(e) => update({ max_render_queue: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Default voice provider</Label>
              <Input value={settings.default_voice_provider ?? ""} onChange={(e) => update({ default_voice_provider: e.target.value })} />
            </div>
            <div>
              <Label>Default image provider</Label>
              <Input value={settings.default_image_provider ?? ""} onChange={(e) => update({ default_image_provider: e.target.value })} />
            </div>
            <div>
              <Label>Default stock provider</Label>
              <Input value={settings.default_stock_provider ?? ""} onChange={(e) => update({ default_stock_provider: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Provider API keys & secrets</CardTitle>
            <CardDescription>
              Securely stored in Lovable Cloud secrets — never exposed to the browser. Ask Lovable to "set the {`{PROVIDER}`} API key" to add or update a value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {PROVIDER_SECRETS.map((s) => {
                const row = keys.find((k) => k.key_name === s.key);
                const stored = !!row?.key_value;
                const draft = keyDrafts[s.key];
                const meta = PROVIDER_SECRETS.find((x) => x.key === s.key);
                return (
                  <div key={s.key} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {meta?.label}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${stored ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"}`}>
                            {stored ? "Saved" : "Empty"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{s.key}</div>
                        <div className="text-[11px] text-muted-foreground">Get key from: {meta?.where}</div>
                      </div>
                      {stored && (
                        <Button variant="ghost" size="sm" onClick={() => clearKey(row)} disabled={savingKey === s.key}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={stored ? "•••••••••• (saved) — type to replace" : "Paste API key"}
                        value={draft ?? ""}
                        onChange={(e) => setKeyDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                      />
                      <Button
                        onClick={() => row && saveKey(row)}
                        disabled={!row || savingKey === s.key || draft === undefined || draft === ""}
                      >
                        {savingKey === s.key ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}