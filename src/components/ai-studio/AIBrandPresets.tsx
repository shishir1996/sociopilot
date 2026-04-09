import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Star, Palette } from "lucide-react";

interface BrandPreset {
  id: string;
  name: string;
  tone: string;
  audience: string;
  voice: string;
  ctaStyle: string;
  hashtags: string;
  imageStyle: string;
  colorTheme: string;
  isDefault: boolean;
}

export default function AIBrandPresets() {
  const { toast } = useToast();
  const [presets, setPresets] = useState<BrandPreset[]>([
    {
      id: "demo-1",
      name: "SocioPilot Brand",
      tone: "Professional",
      audience: "Small business owners & marketers",
      voice: "Confident, helpful, data-driven",
      ctaStyle: "Soft CTA",
      hashtags: "#SocioPilot, #SocialMedia, #Marketing",
      imageStyle: "Minimal",
      colorTheme: "Blue & Purple",
      isDefault: true,
    },
  ]);
  const [editing, setEditing] = useState<Partial<BrandPreset> | null>(null);

  const save = () => {
    if (!editing?.name?.trim()) {
      toast({ title: "Please enter a preset name", variant: "destructive" });
      return;
    }

    if (editing.id) {
      setPresets(prev => prev.map(p => p.id === editing.id ? { ...p, ...editing } as BrandPreset : p));
    } else {
      setPresets(prev => [...prev, { ...editing, id: Date.now().toString() } as BrandPreset]);
    }
    setEditing(null);
    toast({ title: "Brand preset saved ✓" });
  };

  const remove = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    toast({ title: "Preset removed" });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-foreground">Brand Presets</h3>
          <p className="text-sm text-muted-foreground">Save your brand voice to auto-fill AI generators</p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing({
            name: "", tone: "", audience: "", voice: "", ctaStyle: "",
            hashtags: "", imageStyle: "", colorTheme: "", isDefault: false,
          })}
        >
          <Plus className="h-4 w-4 mr-1" /> New Preset
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preset Name</Label>
                <Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. My Luxury Brand" />
              </div>
              <div>
                <Label>Tone</Label>
                <Input value={editing.tone || ""} onChange={e => setEditing({ ...editing, tone: e.target.value })} placeholder="Professional, Casual, Bold" />
              </div>
            </div>
            <div>
              <Label>Brand Voice</Label>
              <Textarea value={editing.voice || ""} onChange={e => setEditing({ ...editing, voice: e.target.value })} rows={2} placeholder="How the brand speaks..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Audience</Label><Input value={editing.audience || ""} onChange={e => setEditing({ ...editing, audience: e.target.value })} /></div>
              <div><Label>CTA Style</Label><Input value={editing.ctaStyle || ""} onChange={e => setEditing({ ...editing, ctaStyle: e.target.value })} placeholder="Direct, Soft, Question" /></div>
            </div>
            <div><Label>Default Hashtags</Label><Input value={editing.hashtags || ""} onChange={e => setEditing({ ...editing, hashtags: e.target.value })} placeholder="Comma separated" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Image Style</Label><Input value={editing.imageStyle || ""} onChange={e => setEditing({ ...editing, imageStyle: e.target.value })} placeholder="Minimal, Luxury, Corporate" /></div>
              <div><Label>Color Theme</Label><Input value={editing.colorTheme || ""} onChange={e => setEditing({ ...editing, colorTheme: e.target.value })} placeholder="Black & Gold" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.isDefault || false} onCheckedChange={v => setEditing({ ...editing, isDefault: v })} />
              <Label>Set as default preset</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
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
                  {p.isDefault && <Star className="h-3.5 w-3.5 text-warning fill-warning" />}
                </div>
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); remove(p.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.tone && <Badge variant="outline" className="text-xs">{p.tone}</Badge>}
                {p.imageStyle && <Badge variant="outline" className="text-xs">{p.imageStyle}</Badge>}
                {p.audience && <Badge variant="secondary" className="text-xs">{p.audience.substring(0, 30)}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presets.length === 0 && !editing && (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Palette className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No presets yet. Create one to speed up content generation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
