import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Building2, Target, Palette, Share2,
  Loader2, Check, Sparkles, Facebook, Instagram, Linkedin, Lock,
} from "lucide-react";

const INDUSTRIES = [
  "Real Estate", "SaaS / Tech", "E-Commerce", "Coaching / Consulting",
  "Healthcare", "Education", "Restaurant / Food", "Fitness / Wellness",
  "Fashion / Beauty", "Finance / Insurance", "Travel / Hospitality", "Other",
];

const GOALS = ["Lead Generation", "Brand Awareness", "Sales & Conversions", "Engagement", "Trust Building", "Local Visibility"];
const TONES = ["Professional", "Casual", "Luxury", "Friendly", "Bold & Viral", "Educational", "Emotional", "Promotional"];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland", "America/Sao_Paulo", "Africa/Lagos",
];

const SOCIAL_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-sky-500/10 text-sky-600 border-sky-200 hover:bg-sky-500/20" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20" },
];

export default function BusinessSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    target_audience: "",
    goals: [] as string[],
    brand_tone: "",
    products_services: "",
    main_offers: "",
    location: "",
    timezone: "Asia/Kolkata",
  });

  const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const toggleGoal = (goal: string) => {
    setForm((p) => ({
      ...p,
      goals: p.goals.includes(goal) ? p.goals.filter((g) => g !== goal) : [...p.goals, goal],
    }));
  };

  // Load admin-enabled platforms when reaching the connect step
  const loadEnabledPlatforms = async () => {
    try {
      const { data } = await supabase.functions.invoke("social-oauth", {
        body: { action: "check_platforms" },
      });
      setEnabledPlatforms(data?.platforms || []);
    } catch {
      setEnabledPlatforms([]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      console.warn("[Onboarding] No user, redirecting to /auth");
      navigate("/auth");
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Business name required", description: "Please go back and enter your business name.", variant: "destructive" });
      setStep(0);
      return;
    }
    setLoading(true);
    console.log("[Onboarding] Submitting business setup", { user_id: user.id, name: form.name });
    try {
      // Check if business already exists (idempotent)
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("businesses").update({
          name: form.name,
          industry: form.industry,
          target_audience: form.target_audience,
          goals: form.goals,
          brand_tone: form.brand_tone,
          products_services: form.products_services,
          main_offers: form.main_offers,
          location: form.location,
          timezone: form.timezone,
        } as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("businesses").insert({
          user_id: user.id,
          name: form.name,
          industry: form.industry,
          target_audience: form.target_audience,
          goals: form.goals,
          brand_tone: form.brand_tone,
          products_services: form.products_services,
          main_offers: form.main_offers,
          location: form.location,
          timezone: form.timezone,
        } as any);
        if (error) throw error;
      }
      console.log("[Onboarding] Saved successfully → navigating to /");
      toast({ title: "🎉 You're all set!", description: "Head to your dashboard to generate your first content." });
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("[Onboarding] Save failed:", error);
      toast({ title: "Setup failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Save business first, then trigger OAuth connect
  const handleConnectPlatform = async (platformId: string) => {
    if (!user) return;
    if (!enabledPlatforms.includes(platformId === "instagram" ? "facebook" : platformId)) {
      toast({
        title: "Platform not available",
        description: "Platform setup is not available yet. Please contact admin.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Persist business first so user_id + business_id exist
      let businessId: string | null = null;
      const { data: existing } = await supabase
        .from("businesses").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        businessId = existing.id;
      } else {
        const { data, error } = await supabase.from("businesses").insert({
          user_id: user.id, name: form.name, industry: form.industry,
          target_audience: form.target_audience, goals: form.goals,
          brand_tone: form.brand_tone, products_services: form.products_services,
          main_offers: form.main_offers, location: form.location, timezone: form.timezone,
        } as any).select("id").single();
        if (error) throw error;
        businessId = data!.id;
      }

      const platform = platformId === "instagram" ? "facebook" : platformId;
      const redirectUri = `${window.location.origin}/settings`;
      const { data, error } = await supabase.functions.invoke("social-oauth", {
        body: { action: "get_oauth_url", platform, redirect_uri: redirectUri, business_id: businessId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const stepLabels = [
    { icon: Building2, label: "Business" },
    { icon: Target, label: "Goals & Tone" },
    { icon: Palette, label: "Product Info" },
    { icon: Share2, label: "Connect" },
  ];

  const canProceed = () => {
    if (step === 0) return form.name.trim() !== "";
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Step {step + 1} of {TOTAL_STEPS}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set up your business</h1>
          <p className="text-sm text-muted-foreground mt-1">Takes less than 2 minutes</p>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2 mb-6" />

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6">
          {stepLabels.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card Content */}
        <Card className="shadow-elevated border-border animate-fade-in">
          <CardContent className="pt-6">
            {/* Step 0: Business Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Business Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Industry</Label>
                  <select
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select your industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Target Audience</Label>
                  <Input
                    value={form.target_audience}
                    onChange={(e) => updateField("target_audience", e.target.value)}
                    placeholder="e.g. Small business owners, 25-45"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Timezone *</Label>
                  <select
                    value={form.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 1: Goals & Tone */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What are your goals?</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <ChipToggle key={g} label={g} active={form.goals.includes(g)} onClick={() => toggleGoal(g)} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Brand Tone</Label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <ChipToggle key={t} label={t} active={form.brand_tone === t} onClick={() => updateField("brand_tone", form.brand_tone === t ? "" : t)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Product / Service Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What do you offer?</Label>
                  <Textarea
                    value={form.products_services}
                    onChange={(e) => updateField("products_services", e.target.value)}
                    placeholder="Describe your products or services..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Key Features / USP</Label>
                  <Textarea
                    value={form.main_offers}
                    onChange={(e) => updateField("main_offers", e.target.value)}
                    placeholder="What makes you unique?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Location (optional)</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="City, region, or global"
                    className="h-11"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Social Connection (Optional) */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Share2 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Connect your social accounts</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Publish content directly to your platforms. You can skip this and connect later.
                  </p>
                </div>

                <div className="space-y-3">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <button
                        key={platform.id}
                        onClick={() => {
                          toast({
                            title: "Connect after setup",
                            description: `Complete setup first, then connect ${platform.label} from your dashboard.`,
                          });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${platform.color}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">Connect {platform.label}</span>
                        <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  🔒 We use secure OAuth — no passwords stored
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setStep((p) => p - 1)}
                disabled={step === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              {step < TOTAL_STEPS - 1 ? (
                <Button onClick={() => setStep((p) => p + 1)} disabled={!canProceed()} className="gap-2">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSubmit} disabled={loading}>
                    Skip & Finish
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? "Creating..." : "Finish Setup"}
                  </Button>
                </div>
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
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted text-muted-foreground border-transparent hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
