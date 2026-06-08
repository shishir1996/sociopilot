import { useState, useEffect } from "react";
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
  Loader2, Check, Sparkles, Facebook, Instagram, Linkedin, Lock, Send,
  Crown, Zap, Globe, CheckCircle2, Shield,
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
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "from-sky-500/20 to-blue-600/20 border-sky-500/30 hover:border-sky-400/50" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "from-pink-500/20 to-rose-600/20 border-pink-500/30 hover:border-pink-400/50" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 hover:border-blue-400/50" },
];

const PLANS = [
  {
    id: "free_trial",
    name: "Free Trial",
    desc: "7 days — no card required",
    icon: Zap,
    features: ["7 posts/week", "1 platform/day", "Weekly auto-generation", "Basic AI", "Email support"],
    gradient: "from-emerald-500/20 to-teal-600/20",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "basic",
    name: "Basic",
    desc: "For individual creators",
    icon: Sparkles,
    features: ["7 posts/week", "1 platform/day", "Weekly auto-generation", "2 regenerations/week", "Standard images", "Email support"],
    gradient: "from-blue-500/20 to-cyan-600/20",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For growing businesses",
    icon: Crown,
    features: ["Up to 4 posts/day", "Multi-platform posting", "Weekly auto-generation", "20 regenerations/month", "Advanced tone control", "Custom prompts", "Premium images", "Priority support"],
    gradient: "from-purple-500/20 to-violet-600/20",
    border: "border-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
  },
];

/* ─── Floating Particles ─── */
function FloatingParticles({ count = 15 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: `${10 + ((i * 37) % 80)}%`,
    top: `${5 + ((i * 53) % 85)}%`,
    size: 1.5 + (i % 3),
    delay: i * 0.7,
    duration: 6 + (i % 6),
    drift: (i % 20) - 10,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-purple-400/20"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `orb-float-${(i % 3) + 1} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function BusinessSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("onboarding_step");
    return saved ? parseInt(saved) : 0;
  });
  const [loading, setLoading] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectedList, setConnectedList] = useState<string[]>([]);
  const [pubPlatforms, setPubPlatforms] = useState<string[]>([]);
  const [planIsPro, setPlanIsPro] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free_trial");
  const [curStep, setCurStep] = useState(0);

  // Restore onboarding state if returning from OAuth
  useEffect(() => {
    const pending = localStorage.getItem("onboarding_pending");
    if (pending) {
      localStorage.removeItem("onboarding_pending");
      localStorage.removeItem("onboarding_step");
      setStep(3);
      loadEnabledPlatforms();
    }
  }, [user]);

  useEffect(() => {
    setCurStep(step);
  }, [step]);

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

  const loadEnabledPlatforms = async () => {
    try {
      const { data } = await supabase.functions.invoke("social-oauth", {
        body: { action: "check_platforms" },
      });
      setEnabledPlatforms(data?.platforms || []);
    } catch {
      setEnabledPlatforms([]);
    }
    if (user) {
      const { data: biz } = await supabase
        .from("businesses").select("id").eq("user_id", user.id).maybeSingle();
      if (biz) {
        const { data: accts, count } = await supabase
          .from("social_accounts")
          .select("platform", { count: "exact" })
          .eq("user_id", user.id)
          .eq("business_id", biz.id) as any;
        setConnectedCount(count || 0);
        setConnectedList((accts || []).map((a: any) => a.platform));
      }
      const { data: sub } = await supabase
        .from("subscriptions").select("plan_name").eq("user_id", user.id).maybeSingle() as any;
      setPlanIsPro((sub?.plan_name || "").toLowerCase() === "pro");
    }
  };

  const createSubscription = async (plan: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
        body: { plan_name: plan, billing_period: "monthly", region: "global" },
      });
      if (error) throw error;
      if (data?.short_url) {
        navigate(`/account?plan=${plan}&from=onboarding`, { replace: true });
      }
      return data;
    } catch (err: any) {
      console.error("[Onboarding] Subscription creation failed:", err);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      console.warn("[Onboarding] No user, redirecting to /auth");
      navigate("/auth");
      return;
    }
    if (!form.name.trim()) {
      toast({
        title: "Business name required",
        description: "Please go back and enter your business name.",
        variant: "destructive",
      });
      setStep(0);
      return;
    }
    setLoading(true);
    try {
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
          publishing_platforms: pubPlatforms,
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
          publishing_platforms: pubPlatforms,
        } as any);
        if (error) throw error;
      }

      if (selectedPlan !== "free_trial") {
        await createSubscription(selectedPlan);
      }

      toast({ title: "You're all set!", description: "Head to your dashboard to generate your first content." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "Setup failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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

      localStorage.setItem("onboarding_pending", platformId);
      localStorage.setItem("onboarding_step", "3");

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

  const TOTAL_STEPS = 6;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const stepLabels = [
    { icon: Building2, label: "Business" },
    { icon: Target, label: "Goals & Tone" },
    { icon: Palette, label: "Product Info" },
    { icon: Share2, label: "Connect" },
    { icon: Zap, label: "Choose Plan" },
    { icon: Send, label: "Publishing" },
  ];

  const canProceed = () => {
    if (step === 0) return form.name.trim() !== "";
    if (step === 5) return pubPlatforms.length > 0;
    return true;
  };

  const stepContent = [
    /* Step 0 */
    <div key="s0" className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Building2 className="h-7 w-7 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Business Details</h3>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your company</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Business Name *</Label>
        <div className="relative group">
          <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-purple-400 transition-colors" />
          <Input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g. Acme Corp"
            className="h-11 pl-10 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Industry</Label>
        <select
          value={form.industry}
          onChange={(e) => updateField("industry", e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500/50 transition-all"
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Target Audience</Label>
        <Input
          value={form.target_audience}
          onChange={(e) => updateField("target_audience", e.target.value)}
          placeholder="e.g. Small business owners, 25-45"
          className="h-11 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Timezone *</Label>
        <select
          value={form.timezone}
          onChange={(e) => updateField("timezone", e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500/50 transition-all"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
    </div>,

    /* Step 1 */
    <div key="s1" className="space-y-6 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Target className="h-7 w-7 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Goals & Brand Tone</h3>
        <p className="text-sm text-muted-foreground mt-1">Define your marketing objectives</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">What are your goals?</Label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <ChipToggle key={g} label={g} active={form.goals.includes(g)} onClick={() => toggleGoal(g)} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Brand Tone</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <ChipToggle key={t} label={t} active={form.brand_tone === t} onClick={() => updateField("brand_tone", form.brand_tone === t ? "" : t)} />
          ))}
        </div>
      </div>
    </div>,

    /* Step 2 */
    <div key="s2" className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Palette className="h-7 w-7 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Product & Service Info</h3>
        <p className="text-sm text-muted-foreground mt-1">Help us understand what you offer</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">What do you offer?</Label>
        <Textarea
          value={form.products_services}
          onChange={(e) => updateField("products_services", e.target.value)}
          placeholder="Describe your products or services..."
          rows={3}
          className="bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Key Features / USP</Label>
        <Textarea
          value={form.main_offers}
          onChange={(e) => updateField("main_offers", e.target.value)}
          placeholder="What makes you unique?"
          rows={2}
          className="bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Location (optional)</Label>
        <div className="relative group">
          <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-purple-400 transition-colors" />
          <Input
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="City, region, or global"
            className="h-11 pl-10 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
        </div>
      </div>
    </div>,

    /* Step 3 */
    <div key="s3" className="space-y-6 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Share2 className="h-7 w-7 text-sky-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Connect Social Platforms</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Publish content directly. You can skip and connect later.
        </p>
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const oauthKey = platform.id === "instagram" ? "facebook" : platform.id;
          const isAvailable = enabledPlatforms.includes(oauthKey);
          const alreadyConnected = connectedList.includes(platform.id) || connectedList.includes(oauthKey);
          return (
            <button
              key={platform.id}
              onClick={() => isAvailable
                ? handleConnectPlatform(platform.id)
                : toast({
                    title: "Not available yet",
                    description: "Connect it later from your dashboard's Accounts page.",
                  })}
              disabled={loading || alreadyConnected}
              className={`w-full relative group overflow-hidden rounded-xl border transition-all duration-300 card-3d-float ${
                alreadyConnected
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 opacity-80"
                  : isAvailable
                    ? `bg-gradient-to-r ${platform.color}`
                    : "bg-background/30 border-dashed border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  alreadyConnected ? "bg-emerald-500/20 text-emerald-400" : "text-foreground/70"
                }`}>
                  {alreadyConnected ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-sm font-medium">
                  {alreadyConnected ? `${platform.label} Connected` : `Connect ${platform.label}`}
                </span>
                {isAvailable && !alreadyConnected && (
                  <ArrowRight className="h-4 w-4 ml-auto opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                )}
                {!isAvailable && !alreadyConnected && (
                  <Lock className="h-4 w-4 ml-auto opacity-40" />
                )}
                {alreadyConnected && (
                  <Check className="h-4 w-4 ml-auto text-emerald-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {connectedCount > 0 && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400/90 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
        </div>
      )}

      {enabledPlatforms.length === 0 && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 px-4 py-3 text-xs text-foreground/70">
          No platforms are enabled yet. You can <strong className="text-amber-400">Skip & Finish</strong> and connect later from your dashboard → <strong className="text-amber-400">Accounts</strong>.
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground/60 flex items-center justify-center gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        Secure OAuth — no passwords stored
      </p>
    </div>,

    /* Step 4 */
    <div key="s4" className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Crown className="h-7 w-7 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Choose Your Plan</h3>
        <p className="text-sm text-muted-foreground mt-1">Start free for 7 days — no credit card needed</p>
      </div>

      <div className="grid gap-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all duration-300 card-3d-float ${
                isSelected
                  ? `bg-gradient-to-r ${plan.gradient} ${plan.border} shadow-lg`
                  : "border-border/40 bg-background/30 hover:border-foreground/20 hover:bg-accent/20"
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${plan.iconBg} ${
                  isSelected ? "shadow-md" : ""
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    {plan.id === "pro" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-[10px] font-semibold text-purple-400 border border-purple-500/30">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{plan.desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {plan.features.map((f) => (
                      <span key={f} className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-500" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedPlan !== "free_trial" && (
        <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/5 border border-purple-500/20 px-4 py-3 text-sm text-foreground/80 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
          You're eligible for a <strong className="text-purple-400 mx-1">7-day free trial</strong> of the {selectedPlan === "basic" ? "Basic" : "Pro"} plan.
        </div>
      )}
    </div>,

    /* Step 5 */
    <div key="s5" className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Send className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Publishing Setup</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {(planIsPro || selectedPlan === "pro")
            ? "Choose one or more platforms for automated publishing."
            : "Choose a platform. Upgrade to Pro for multi-platform."}
        </p>
      </div>

      {connectedList.length === 0 ? (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 px-5 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <Share2 className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm text-foreground/80 font-medium mb-1">No platforms connected yet</p>
          <p className="text-xs text-muted-foreground/60">Go back to Connect step and link at least one platform.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {connectedList.map((p) => {
            const selected = pubPlatforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (planIsPro || selectedPlan === "pro") {
                    setPubPlatforms((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                    );
                  } else {
                    setPubPlatforms([p]);
                  }
                }}
                className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-300 card-3d-float ${
                  selected
                    ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 shadow-md"
                    : "border-border/40 bg-background/30 hover:border-foreground/20 hover:bg-accent/20"
                }`}
              >
                <span className="capitalize font-medium text-foreground/90">{p}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected ? "border-emerald-500 bg-emerald-500" : "border-border/50"
                }`}>
                  {selected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!(planIsPro || selectedPlan === "pro") && connectedList.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 px-4 py-2.5 text-xs text-muted-foreground/70 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          On Free/Basic, the selected platform is used for all scheduled posts.
        </div>
      )}
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 mesh-gradient-dark" />
      <div className="fixed inset-0 bg-grid opacity-[0.03]" />
      <div className="fixed inset-0 bg-gradient-to-b from-purple-500/3 via-transparent to-blue-500/3" />

      {/* Floating Orbs */}
      <div className="fixed top-[15%] left-[10%] orb orb-1" />
      <div className="fixed bottom-[20%] right-[15%] orb orb-2" />
      <div className="fixed top-[50%] right-[25%] orb orb-3" />

      <FloatingParticles count={20} />

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-premium border-purple-500/20 text-xs font-medium text-purple-300 mb-4 shadow-lg shadow-purple-500/5">
            <Sparkles className="h-3.5 w-3.5" />
            Step {step + 1} of {TOTAL_STEPS}
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            <span className="gradient-text">Set up your business</span>
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-1.5">Takes less than 2 minutes</p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-6">
          <Progress value={progress} className="h-2 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-violet-500" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6 px-1">
          {stepLabels.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < step;
            const isActive = i === step;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-500 ${
                    isComplete
                      ? "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                      : isActive
                      ? "bg-gradient-to-br from-purple-500/20 to-violet-600/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                      : "bg-white/5 text-muted-foreground/40 border border-white/10"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-300 ${
                  isComplete || isActive ? "text-purple-400" : "text-muted-foreground/40"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="gradient-border rounded-2xl">
          <div className="glass-premium rounded-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />
            <CardContent className="p-6 md:p-8">
              {/* Step content with transition */}
              <div
                key={step}
                style={{
                  animation: "stagger-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              >
                {stepContent[step]}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-5 border-t border-white/5">
                <Button
                  variant="outline"
                  onClick={() => setStep((p) => p - 1)}
                  disabled={step === 0}
                  className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-foreground/70 hover:text-foreground transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                {step < TOTAL_STEPS - 1 ? (
                  <Button
                    onClick={() => {
                      const next = step + 1;
                      setStep(next);
                      if (next === 3) loadEnabledPlatforms();
                      if (next === 5) loadEnabledPlatforms();
                    }}
                    disabled={!canProceed()}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 btn-shine"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || pubPlatforms.length === 0}
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 btn-shine"
                    title={pubPlatforms.length === 0 ? "Pick at least one publishing platform" : undefined}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? "Creating..." : "Finish Setup"}
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        active
          ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
          : "bg-white/5 text-muted-foreground/60 border-white/10 hover:bg-white/10 hover:text-foreground/80"
      }`}
    >
      {label}
    </button>
  );
}