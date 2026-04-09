import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Star, Loader2 } from "lucide-react";

interface BrandPreset {
  id: string;
  name: string;
  brand_voice: string;
  tone: string;
  cta_style: string;
  post_structure: string;
  audience_profile: string;
  default_hashtags: string[];
  offer_style: string;
  image_style: string;
  color_theme: string;
  prompt_notes: string;
  is_default: boolean;
}

export default function AIBrandPresets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [presets, setPresets] = useState<BrandPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BrandPreset> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("ai_brand_presets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPresets((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!editing || !user) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        user_id: user.id,
        default_hashtags: typeof editing.default_hashtags === "string"
          ? (editing.default_hashtags as string).split(",").map(h => h.trim()).filter(Boolean)
          : editing.default_hashtags || [],
      };

      if (editing.id) {
        const { error } = await supabase.from("ai_brand_presets").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_brand_presets").insert(payload as any);
        if (error) throw error;
      }
      toast({ title: "Brand preset saved!" });
      setEditing(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await supabase.from("ai_brand_presets").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-foreground">Brand Presets</h3>
          <p className="text-sm text-muted-foreground">Save brand voices to auto-fill AI generation forms</p>
        </div>
        <Button size="sm" onClick={() => setEditing({
          name: "", brand_voice: "", tone: "", cta_style: "", post_structure: "",
          audience_profile: "", default_hashtags: [], offer_style: "", image_style: "",
          color_theme: "", prompt_notes: "", is_default: false,
        })}>
          <Plus className="h-4 w-4 mr-1" /> New Preset
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preset Name</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. My Luxury Brand" /></div>
              <div><Label>Tone</Label><Input value={editing.tone || ""} onChange={e => setEditing({ ...editing, tone: e.target.value })} placeholder="Professional, Casual, Bold" /></div>
            </div>
            <div><Label>Brand Voice</Label><Textarea value={editing.brand_voice || ""} onChange={e => setEditing({ ...editing, brand_voice: e.target.value })} rows={2} placeholder="How the brand speaks..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CTA Style</Label><Input value={editing.cta_style || ""} onChange={e => setEditing({ ...editing, cta_style: e.target.value })} placeholder="Direct, Soft, Question-based" /></div>
              <div><Label>Post Structure</Label><Input value={editing.post_structure || ""} onChange={e => setEditing({ ...editing, post_structure: e.target.value })} placeholder="Hook → Story → CTA" /></div>
            </div>
            <div><Label>Target Audience</Label><Input value={editing.audience_profile || ""} onChange={e => setEditing({ ...editing, audience_profile: e.target.value })} /></div>
            <div><Label>Default Hashtags (comma separated)</Label><Input value={Array.isArray(editing.default_hashtags) ? editing.default_hashtags.join(", ") : editing.default_hashtags || ""} onChange={e => setEditing({ ...editing, default_hashtags: e.target.value as any })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Offer Style</Label><Input value={editing.offer_style || ""} onChange={e => setEditing({ ...editing, offer_style: e.target.value })} /></div>
              <div><Label>Image Style</Label><Input value={editing.image_style || ""} onChange={e => setEditing({ ...editing, image_style: e.target.value })} placeholder="Minimal, Luxury, Corporate" /></div>
            </div>
            <div><Label>Color Theme</Label><Input value={editing.color_theme || ""} onChange={e => setEditing({ ...editing, color_theme: e.target.value })} placeholder="Black & Gold, Navy & White" /></div>
            <div><Label>Default Prompt Notes</Label><Textarea value={editing.prompt_notes || ""} onChange={e => setEditing({ ...editing, prompt_notes: e.target.value })} rows={2} placeholder="Instructions injected into every generation..." /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_default || false} onCheckedChange={v => setEditing({ ...editing, is_default: v })} /><Label>Set as default preset</Label></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map(p => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setEditing(p)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{p.name}</h4>
                  {p.is_default && <Star className="h-3.5 w-3.5 text-warning fill-warning" />}
                </div>
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); remove(p.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.tone && <Badge variant="outline" className="text-xs">{p.tone}</Badge>}
                {p.image_style && <Badge variant="outline" className="text-xs">{p.image_style}</Badge>}
                {p.audience_profile && <Badge variant="secondary" className="text-xs">{p.audience_profile.substring(0, 30)}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presets.length === 0 && !editing && (
        <Card><CardContent className="py-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">No presets yet. Create one to speed up content generation.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
