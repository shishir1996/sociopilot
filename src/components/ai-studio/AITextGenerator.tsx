import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save, RefreshCw, Sparkles, Clock, Hash, Zap } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "Threads"];
const contentTypes = ["Caption", "Ad Copy", "Hook", "CTA", "Carousel Post", "Reel Script", "Story Text", "Product Post", "Promotional Post", "Educational Post", "Personal Brand Post"];
const tones = ["Professional", "Casual", "Witty", "Inspirational", "Bold", "Luxury", "Friendly", "Authoritative"];
const lengths = ["Short", "Medium", "Long"];
const emojiOptions = ["Yes", "No", "Minimal"];

interface Variation {
  title: string;
  content: string;
  cta: string;
  hashtags: string[];
  engagement_score: string;
  best_for: string;
  character_count: number;
}

export default function AITextGenerator({ business }: { business: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [presets, setPresets] = useState<any[]>([]);

  // Form state
  const [platform, setPlatform] = useState("Instagram");
  const [contentType, setContentType] = useState("Caption");
  const [brandName, setBrandName] = useState(business?.name || "");
  const [niche, setNiche] = useState(business?.industry || "");
  const [targetAudience, setTargetAudience] = useState(business?.target_audience || "");
  const [goal, setGoal] = useState("Engagement");
  const [tone, setTone] = useState(business?.brand_tone || "Professional");
  const [offerDetails, setOfferDetails] = useState(business?.products_services || "");
  const [keywords, setKeywords] = useState("");
  const [contentLength, setContentLength] = useState("Medium");
  const [language, setLanguage] = useState("English");
  const [emojis, setEmojis] = useState("Minimal");
  const [ctaPref, setCtaPref] = useState("Soft CTA");
  const [hashtagPref, setHashtagPref] = useState("Include");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [variationsCount, setVariationsCount] = useState(3);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  useEffect(() => {
    if (business) {
      setBrandName(business.name || "");
      setNiche(business.industry || "");
      setTargetAudience(business.target_audience || "");
      setTone(business.brand_tone || "Professional");
      setOfferDetails(business.products_services || "");
    }
  }, [business]);

  useEffect(() => {
    if (user) {
      supabase.from("ai_brand_presets").select("*").eq("user_id", user.id)
        .then(({ data }) => setPresets(data || []));
    }
  }, [user]);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.tone) setTone(preset.tone);
    if (preset.audience_profile) setTargetAudience(preset.audience_profile);
    if (preset.offer_style) setOfferDetails(preset.offer_style);
    if (preset.prompt_notes) setAdditionalInstructions(preset.prompt_notes);
  };

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    setVariations([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-text", {
        body: {
          platform, content_type: contentType.toLowerCase().replace(/ /g, "_"),
          brand_name: brandName, niche, target_audience: targetAudience, goal, tone,
          offer_details: offerDetails, keywords, content_length: contentLength,
          language, emojis, cta_preference: ctaPref, hashtag_preference: hashtagPref,
          additional_instructions: additionalInstructions, variations_count: variationsCount,
          brand_preset_id: selectedPreset || undefined,
          business_id: business?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVariations(data.variations || []);
      setResponseTime(data.response_time_ms);
      toast({ title: "✨ Content generated!", description: `${(data.variations || []).length} variation(s) ready.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const charLimits: Record<string, number> = {
    Instagram: 2200, Facebook: 63206, LinkedIn: 3000, Twitter: 280, YouTube: 5000, Threads: 500,
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="pt-4 space-y-3">
            {presets.length > 0 && (
              <div>
                <Label>Brand Preset</Label>
                <Select value={selectedPreset} onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue placeholder="Select a preset..." /></SelectTrigger>
                  <SelectContent>{presets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{contentTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div><Label>Brand / Business Name</Label><Input value={brandName} onChange={e => setBrandName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Niche / Industry</Label><Input value={niche} onChange={e => setNiche(e.target.value)} /></div>
              <div><Label>Target Audience</Label><Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Goal</Label><Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Engagement, Sales, Awareness" /></div>
              <div><Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div><Label>Offer / Product Details</Label><Input value={offerDetails} onChange={e => setOfferDetails(e.target.value)} /></div>
            <div><Label>Keywords / Focus Topics</Label><Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Comma separated" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Length</Label>
                <Select value={contentLength} onValueChange={setContentLength}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{lengths.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Emojis</Label>
                <Select value={emojis} onValueChange={setEmojis}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{emojiOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Variations</Label>
                <Select value={String(variationsCount)} onValueChange={v => setVariationsCount(parseInt(v))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="5">5</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div><Label>Additional Instructions</Label><Textarea value={additionalInstructions} onChange={e => setAdditionalInstructions(e.target.value)} rows={2} placeholder="Any special requirements..." /></div>
            <Button onClick={generate} className="w-full bg-gradient-to-r from-primary to-accent border-0" disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Content</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Output */}
      <div className="lg:col-span-3 space-y-4">
        {responseTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Generated in {(responseTime / 1000).toFixed(1)}s
          </div>
        )}

        {generating && (
          <Card><CardContent className="py-16 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">AI is crafting your content...</p>
          </CardContent></Card>
        )}

        {variations.map((v, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{v.title || `Variation ${i + 1}`}</h3>
                  {v.engagement_score === "high" && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">🔥 High Engagement</Badge>}
                  {v.best_for === "ads" && <Badge className="bg-accent/10 text-accent border-accent/20">📢 Best for Ads</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {v.character_count || v.content?.length || 0}/{charLimits[platform] || 2200} chars
                </span>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                {v.content}
              </div>

              {v.cta && (
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">CTA</p>
                  <p className="text-sm text-foreground">{v.cta}</p>
                </div>
              )}

              {v.hashtags && v.hashtags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{v.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(`${v.content}\n\n${v.cta || ""}\n\n${(v.hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline"><Save className="h-3.5 w-3.5 mr-1" /> Save Draft</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!generating && variations.length === 0 && (
          <Card><CardContent className="py-16 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Fill in the details and click Generate to create content</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
