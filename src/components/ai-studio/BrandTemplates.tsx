import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Crown, Upload, Trash2, Loader2, Image as ImageIcon, Video, Sparkles, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const TEMPLATE_TYPES = [
  { key: "image_template", label: "Image Branding Template", icon: ImageIcon, accept: "image/*" },
  { key: "video_template", label: "Video Branding Template", icon: Video, accept: "video/*" },
  { key: "logo_overlay", label: "Logo Overlay", icon: Sparkles, accept: "image/png" },
  { key: "cta_animation", label: "CTA Animation Template", icon: Sparkles, accept: "image/*,video/*" },
  { key: "brand_color", label: "Brand Color System", icon: Palette, accept: "image/*" },
];

const MIN_TEMPLATES = 2;
const MAX_TEMPLATES = 5;

interface Props {
  businessId: string | null;
  isPro: boolean;
  proActivatedAt: string | null;
}

export function BrandTemplates({ businessId, isPro, proActivatedAt }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const unlocked = isPro && !!proActivatedAt;

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from("brand_templates" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data as any[]) || []);
  };

  const handleLockedClick = () => {
    toast({
      title: "Upgrade to Pro to unlock branded AI content generation.",
      description: proActivatedAt
        ? "Already on Pro — please refresh."
        : "Available after your first successful Pro subscription payment.",
    });
    navigate("/pricing");
  };

  const onUpload = async (templateType: string, file: File) => {
    if (!user || !businessId) return;
    if (templates.length >= MAX_TEMPLATES) {
      toast({ title: `Max ${MAX_TEMPLATES} templates allowed`, variant: "destructive" });
      return;
    }
    setUploading(templateType);
    try {
      const path = `templates/${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("content-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("content-images").getPublicUrl(path);
      const { error: insErr } = await supabase.from("brand_templates" as any).insert({
        user_id: user.id,
        business_id: businessId,
        template_type: templateType,
        label: file.name,
        file_url: pub.publicUrl,
      });
      if (insErr) throw insErr;
      toast({ title: "Template uploaded" });
      await load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const onDelete = async (id: string) => {
    await supabase.from("brand_templates" as any).delete().eq("id", id);
    await load();
  };

  return (
    <Card className="shadow-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Brand Templates</h3>
              {unlocked ? (
                <Badge variant="outline" className="text-xs"><Crown className="h-3 w-3 mr-1" /> Pro</Badge>
              ) : (
                <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" /> Pro only</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Upload {MIN_TEMPLATES}–{MAX_TEMPLATES} templates. Applied automatically to generated image &amp; video posts.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{templates.length}/{MAX_TEMPLATES}</span>
        </div>

        {!unlocked && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {isPro
                ? "Pro plan detected. Branded generation unlocks after your first successful recurring payment."
                : "Upgrade to Pro to unlock branded AI content generation."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-disabled={!unlocked}>
          {TEMPLATE_TYPES.map((t) => {
            const Icon = t.icon;
            const isUploading = uploading === t.key;
            return (
              <div
                key={t.key}
                className={`relative rounded-lg border border-border p-3 flex flex-col gap-2 ${!unlocked ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{t.label}</span>
                </div>
                <Label htmlFor={`tpl-${t.key}`} className="sr-only">{t.label}</Label>
                <Input
                  id={`tpl-${t.key}`}
                  type="file"
                  accept={t.accept}
                  disabled={!unlocked || isUploading}
                  onClick={(e) => { if (!unlocked) { e.preventDefault(); handleLockedClick(); } }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(t.key, f);
                    e.target.value = "";
                  }}
                  className="text-xs"
                />
                {isUploading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {templates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Uploaded</p>
            <div className="space-y-1.5">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded border border-border bg-muted/20">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{TEMPLATE_TYPES.find(x => x.key === t.template_type)?.label || t.template_type}</span>
                    <span className="text-muted-foreground ml-2">{t.label}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)} className="h-7 w-7 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
