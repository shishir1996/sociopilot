import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save, Sparkles, Hash, Calendar } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "Threads"];
const contentTypes = ["Caption", "Carousel Post", "Story Text", "Product Post", "Educational Post", "Personal Brand Post"];
const tones = ["Professional", "Casual", "Witty", "Inspirational", "Bold", "Luxury", "Friendly"];

interface GeneratedCaption {
  title: string;
  content: string;
  cta: string;
  hashtags: string[];
  tag?: string;
}

export default function AICaptionGenerator({ business }: { business: any }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedCaption[]>([]);

  // Simple form fields
  const [platform, setPlatform] = useState("Instagram");
  const [contentType, setContentType] = useState("Caption");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(business?.brand_tone || "Professional");
  const [audience, setAudience] = useState(business?.target_audience || "");
  const [goal, setGoal] = useState("");
  const [details, setDetails] = useState("");

  const charLimits: Record<string, number> = {
    Instagram: 2200, Facebook: 63206, LinkedIn: 3000, Twitter: 280, YouTube: 5000, Threads: 500,
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResults([]);

    const prompt = `Write 3 social media captions for ${platform} (${contentType}) about "${topic}".
Tone: ${tone}.
Target audience: ${audience}.
Goal: ${goal || "engagement"}.
${details ? `Additional context: ${details}` : ""}
${business?.name ? `Brand: ${business.name}. Industry: ${business.industry || ""}.` : ""}

For each caption, provide:
- A compelling title (2-4 words)
- The main caption body (under ${platforms.includes(platform) ? "the platform character limit" : "2500 chars"})
- A clear call-to-action
- 5-8 relevant hashtags without the # symbol
- A tag like "🔥 High Engagement" or "📢 Best for Ads"

Return as a JSON array: [{title, content, cta, hashtags: string[], tag}]`;

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-text", {
        body: { prompt, temperature: 0.7, max_tokens: 2000 },
      });

      if (error) throw error;
      const text = data?.text || data?.content || "[]";
      let parsed: any[];
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract JSON from markdown
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      }
      if (parsed.length) {
        setResults(parsed);
        toast({ title: "Captions generated!", description: `${parsed.length} variations ready.` });
      } else {
        toast({ title: "Could not parse captions", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const copyToClipboard = (caption: GeneratedCaption) => {
    const text = `${caption.content}\n\n${caption.cta}\n\n${caption.hashtags.map(h => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard ✓" });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Simple Input Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{contentTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>What's your post about?</Label>
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Benefits of morning routines"
              />
            </div>

            <div>
              <Label>Who's your audience?</Label>
              <Input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Small business owners"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Goal</Label>
                <Input
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="e.g. Drive traffic"
                />
              </div>
            </div>

            <div>
              <Label>Additional details <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={2}
                placeholder="Any specific details, offers, or keywords to include..."
              />
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-primary to-accent border-0"
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating your captions...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate Captions</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Output Cards */}
      <div className="lg:col-span-3 space-y-4">
        {generating && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="font-medium text-foreground">AI is writing your captions...</p>
              <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
            </CardContent>
          </Card>
        )}

        {results.map((caption, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{caption.title}</h3>
                  {caption.tag && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                      {caption.tag}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {caption.content.length}/{charLimits[platform]} chars
                </span>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {caption.content}
              </div>

              {caption.cta && (
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">Call to Action</p>
                  <p className="text-sm text-foreground">{caption.cta}</p>
                </div>
              )}

              {caption.hashtags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {caption.hashtags.map(h => `#${h}`).join(" ")}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(caption)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline">
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!generating && results.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-foreground">Ready to create amazing content</p>
              <p className="text-sm text-muted-foreground">
                Enter your topic and click Generate to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
