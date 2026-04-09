import { useState } from "react";
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

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResults([]);

    // Simulate generation (will be replaced with real API in Phase 2)
    setTimeout(() => {
      setResults([
        {
          title: "Engaging Hook Style",
          content: `🚀 Stop scrolling — this changes everything about ${topic}.\n\nMost people don't realize that the key to success in ${topic} is consistency, not perfection.\n\nHere's what I've learned after working with hundreds of ${audience || "professionals"}:\n\n✅ Start small, think big\n✅ Focus on value, not vanity metrics\n✅ Show up every single day\n\nThe best time to start was yesterday. The second best time? Right now.`,
          cta: goal || "Save this post and share it with someone who needs to hear this 💡",
          hashtags: ["ContentCreation", topic.replace(/\s/g, ""), "SocialMediaTips", "GrowthMindset", "DigitalMarketing"],
          tag: "🔥 High Engagement",
        },
        {
          title: "Professional & Informative",
          content: `${topic} is transforming the way ${audience || "businesses"} operate.\n\nIn today's landscape, staying ahead means embracing change and adapting quickly.\n\nHere are 3 things you should know:\n\n1️⃣ The market is shifting towards authenticity\n2️⃣ Your audience wants value, not noise\n3️⃣ Consistency beats viral content every time\n\nWhat's your take on this? Drop your thoughts below 👇`,
          cta: goal || "Follow for more insights on " + topic,
          hashtags: [topic.replace(/\s/g, ""), "BusinessTips", "Entrepreneur", "Marketing", "Strategy"],
        },
        {
          title: "Story-Driven Approach",
          content: `I used to think ${topic} was just another buzzword.\n\nThen I saw the results.\n\nOne of my clients went from zero to 10K followers in 90 days — not by going viral, but by being genuinely helpful.\n\nThe secret? Understanding your ${audience || "audience"} deeply and giving them exactly what they need.\n\nStop chasing trends. Start building trust.`,
          cta: goal || "DM me 'GROWTH' to learn how we can help",
          hashtags: ["StoryTime", topic.replace(/\s/g, ""), "GrowOnline", "ContentStrategy", "RealResults"],
          tag: "📢 Best for Ads",
        },
      ]);
      setGenerating(false);
      toast({ title: "✨ Captions generated!", description: "3 variations ready for you." });
    }, 2000);
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
