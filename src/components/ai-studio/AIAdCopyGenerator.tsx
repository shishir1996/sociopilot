import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save, PenTool, Calendar } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const platforms = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube"];
const adTypes = ["Ad Copy", "Hook", "CTA", "Promotional Post"];
const tones = ["Professional", "Bold", "Witty", "Luxury", "Friendly", "Authoritative"];

interface GeneratedAd {
  title: string;
  headline: string;
  body: string;
  cta: string;
  tag?: string;
}

export default function AIAdCopyGenerator({ business }: { business: any }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedAd[]>([]);

  const [platform, setPlatform] = useState("Instagram");
  const [adType, setAdType] = useState("Ad Copy");
  const [product, setProduct] = useState(business?.products_services || "");
  const [offer, setOffer] = useState("");
  const [audience, setAudience] = useState(business?.target_audience || "");
  const [tone, setTone] = useState(business?.brand_tone || "Professional");
  const [details, setDetails] = useState("");

  const handleGenerate = () => {
    if (!product.trim()) {
      toast({ title: "Please enter your product or service", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResults([]);

    setTimeout(() => {
      setResults([
        {
          title: "Direct Response",
          headline: `${offer || "Limited Time Offer"} — Don't Miss This`,
          body: `Struggling with ${product}? You're not alone.\n\nThousands of ${audience || "professionals"} have already discovered a better way.\n\nOur solution gives you:\n• Faster results\n• Proven framework\n• Expert support\n\n${offer ? `🎯 ${offer}` : "Start your free trial today."}`,
          cta: "Click the link below to get started →",
          tag: "📢 Best for Ads",
        },
        {
          title: "Storytelling Approach",
          headline: `How ${audience || "Our Clients"} Achieved Amazing Results`,
          body: `6 months ago, one of our clients was stuck.\n\nThey tried everything for ${product} — nothing worked.\n\nThen they found us.\n\nFast forward to today: they've 3x their results and never looked back.\n\nThe difference? A proven system that actually works.\n\n${offer ? `💥 ${offer}` : "Ready to see what's possible?"}`,
          cta: "DM us 'START' to learn more",
        },
        {
          title: "Urgency-Driven",
          headline: `⚡ ${offer || "This Won't Last"} — Act Now`,
          body: `Here's the truth about ${product}:\n\nEvery day you wait is a day your competitors get ahead.\n\n${audience || "Smart professionals"} are already taking action.\n\nDon't be the one saying "I wish I started sooner."\n\n${offer ? `🔥 ${offer} — ends soon.` : "This opportunity won't last forever."}`,
          cta: "Tap the link in bio before it's too late ⏰",
          tag: "🔥 High Conversion",
        },
      ]);
      setGenerating(false);
      toast({ title: "✨ Ad copy generated!", description: "3 high-converting variations ready." });
    }, 2000);
  };

  const copyToClipboard = (ad: GeneratedAd) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`);
    toast({ title: "Copied to clipboard ✓" });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
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
                <Label>Ad Type</Label>
                <Select value={adType} onValueChange={setAdType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{adTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Product / Service</Label>
              <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Social media management tool" />
            </div>

            <div>
              <Label>Offer or promotion <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. 50% off first month" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Audience</Label>
                <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Small businesses" />
              </div>
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Additional details <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} placeholder="Any USPs, keywords, or special requirements..." />
            </div>

            <Button onClick={handleGenerate} className="w-full bg-gradient-to-r from-accent to-primary border-0" disabled={generating}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating ad copy...</>
              ) : (
                <><PenTool className="h-4 w-4 mr-2" /> Generate Ad Copy</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {generating && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto" />
              <p className="font-medium text-foreground">AI is crafting your ad copy...</p>
              <p className="text-sm text-muted-foreground">Optimizing for conversions</p>
            </CardContent>
          </Card>
        )}

        {results.map((ad, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{ad.title}</h3>
                {ad.tag && (
                  <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">{ad.tag}</Badge>
                )}
              </div>

              <div className="bg-accent/5 rounded-lg p-3 border border-accent/10">
                <p className="font-bold text-foreground">{ad.headline}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {ad.body}
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs font-medium text-primary mb-1">Call to Action</p>
                <p className="text-sm text-foreground">{ad.cta}</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(ad)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline"><Save className="h-3.5 w-3.5 mr-1" /> Save Draft</Button>
                <Button size="sm" variant="outline"><Calendar className="h-3.5 w-3.5 mr-1" /> Schedule</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!generating && results.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <PenTool className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-foreground">Ready to create converting ad copy</p>
              <p className="text-sm text-muted-foreground">Enter your product details and click Generate</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
