import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Building2, Target, Palette, Megaphone } from "lucide-react";

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "X (Twitter)", "Google Business Profile", "YouTube"];
const GOALS = ["Brand Awareness", "Lead Generation", "Trust Building", "Engagement", "Conversions", "Local Visibility"];
const CONTENT_TYPES = ["Image Posts", "Carousels", "Short Videos / Reels", "Text Posts", "GMB Posts", "LinkedIn Posts"];
const TONES = ["Simple", "Premium", "Luxury", "Informative", "Viral", "Emotional", "Educational", "Promotional"];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland", "America/Sao_Paulo", "Africa/Lagos",
];

export default function BusinessSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    products_services: "",
    location: "",
    target_audience: "",
    goals: [] as string[],
    competitors: "",
    brand_tone: "",
    main_offers: "",
    platforms: [] as string[],
    posting_goals: [] as string[],
    content_types: [] as string[],
    content_style: "",
    timezone: "Asia/Kolkata",
  });

  const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const toggleArrayField = (field: string, value: string) => {
    setForm((p) => {
      const arr = (p as any)[field] as string[];
      return { ...p, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("businesses").insert({
        user_id: user.id,
        name: form.name,
        industry: form.industry,
        products_services: form.products_services,
        location: form.location,
        target_audience: form.target_audience,
        goals: form.goals,
        competitors: form.competitors,
        brand_tone: form.brand_tone,
        main_offers: form.main_offers,
        platforms: form.platforms,
        posting_goals: form.posting_goals,
        content_types: form.content_types,
        content_style: form.content_style,
      } as any);
      if (error) throw error;
      toast({ title: "Business created!", description: "Now let's build your content plan." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      icon: <Building2 className="h-5 w-5" />,
      title: "Business Basics",
      description: "Tell us about your business",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Industry / Niche</Label>
            <Input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="Real Estate, SaaS, Coaching..." />
          </div>
          <div className="space-y-2">
            <Label>Products or Services</Label>
            <Textarea value={form.products_services} onChange={(e) => updateField("products_services", e.target.value)} placeholder="What do you offer?" />
          </div>
          <div className="space-y-2">
            <Label>Location / Target Market</Label>
            <Input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="City, region, or global" />
          </div>
        </div>
      ),
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Audience & Goals",
      description: "Who are you targeting?",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ideal Customers / Audience</Label>
            <Textarea value={form.target_audience} onChange={(e) => updateField("target_audience", e.target.value)} placeholder="Demographics, interests, pain points..." />
          </div>
          <div className="space-y-2">
            <Label>Business Goals</Label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <ChipToggle key={g} label={g} active={form.goals.includes(g)} onClick={() => toggleArrayField("goals", g)} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Main Competitors</Label>
            <Input value={form.competitors} onChange={(e) => updateField("competitors", e.target.value)} placeholder="Competitor names (optional)" />
          </div>
          <div className="space-y-2">
            <Label>Main Offers / USP</Label>
            <Textarea value={form.main_offers} onChange={(e) => updateField("main_offers", e.target.value)} placeholder="What makes you unique?" />
          </div>
        </div>
      ),
    },
    {
      icon: <Megaphone className="h-5 w-5" />,
      title: "Platforms & Content",
      description: "Where should we post?",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <ChipToggle key={p} label={p} active={form.platforms.includes(p)} onClick={() => toggleArrayField("platforms", p)} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content Types</Label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((c) => (
                <ChipToggle key={c} label={c} active={form.content_types.includes(c)} onClick={() => toggleArrayField("content_types", c)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Brand & Tone",
      description: "Define your style",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <ChipToggle key={t} label={t} active={form.brand_tone === t} onClick={() => updateField("brand_tone", form.brand_tone === t ? "" : t)} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content Style Notes</Label>
            <Textarea value={form.content_style} onChange={(e) => updateField("content_style", e.target.value)} placeholder="Any specific style preferences or guidelines..." />
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const canProceed = step === 0 ? form.name.trim() !== "" : true;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s.icon}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-24 h-0.5 mx-1 ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-elevated animate-fade-in">
          <CardHeader>
            <CardTitle className="font-heading">{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep.content}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep((p) => p - 1)} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep((p) => p + 1)} disabled={!canProceed}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading || !canProceed}>
                  {loading ? "Creating..." : "Create Business"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
