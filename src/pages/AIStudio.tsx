import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Sparkles, Loader2, Lock, Crown,
  CheckCircle2, ChevronRight, ChevronLeft, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/ContentCard";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { useGeoPricing } from "@/hooks/useGeoPricing";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "facebook", label: "Facebook", color: "bg-blue-600" },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-700" },
  { id: "twitter", label: "X (Twitter)", color: "bg-foreground" },
];

type Step = "calendar" | "context" | "generating" | "results";

interface DaySelection {
  [day: number]: string[];
}

export default function AIStudio() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { region } = useGeoPricing();

  const [step, setStep] = useState<Step>("calendar");
  const [business, setBusiness] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [planLimits, setPlanLimits] = useState<any>(null);
  const [weeklyGenCount, setWeeklyGenCount] = useState(0);
  const [regenCount, setRegenCount] = useState(0);
  const [daySelection, setDaySelection] = useState<DaySelection>({});
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [showUpgrade, setShowUpgrade] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTrigger, setUpgradeModalTrigger] = useState("");

  // Context form
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentGoal, setContentGoal] = useState("");
  const [tone, setTone] = useState("professional");

  const planType = subscription?.plan_name || "free_trial";
  const isTrial = subscription?.is_trial || planType === "free_trial";
  const isBasic = planType === "basic";
  const isPro = planType === "pro";

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    const [bizRes, subRes, limitsRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("user_id", user.id).limit(1).single(),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).limit(1).single(),
      supabase.from("ai_plan_limits").select("*"),
    ]);
    if (bizRes.data) {
      setBusiness(bizRes.data);
      setBusinessName(bizRes.data.name || "");
      setIndustry(bizRes.data.industry || "");
      setTargetAudience(bizRes.data.target_audience || "");
    }
    const sub = subRes.data || { plan_name: "free_trial", is_trial: true };
    setSubscription(sub);
    if (limitsRes.data) {
      const currentPlan = sub.plan_name || "free_trial";
      const limits = limitsRes.data.find((l: any) => l.plan_name === currentPlan);
      setPlanLimits(limits);
    }
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const { count: genCount } = await supabase
      .from("weekly_generation_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString());
    setWeeklyGenCount(genCount || 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: regenC } = await supabase
      .from("regeneration_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString());
    setRegenCount(regenC || 0);
  };

  const togglePlatform = (dayIndex: number, platformId: string) => {
    setDaySelection(prev => {
      const current = prev[dayIndex] || [];
      const isSelected = current.includes(platformId);
      if (isBasic || isTrial) {
        if (isSelected) return { ...prev, [dayIndex]: [] };
        return { ...prev, [dayIndex]: [platformId] };
      }
      if (isSelected) return { ...prev, [dayIndex]: current.filter(p => p !== platformId) };
      if (current.length >= 4) return prev;
      return { ...prev, [dayIndex]: [...current, platformId] };
    });
  };

  const handleMultiPlatformClick = (dayIndex: number, platformId: string) => {
    const current = daySelection[dayIndex] || [];
    if ((isBasic || isTrial) && current.length >= 1 && !current.includes(platformId)) {
      setUpgradeModalTrigger("multi_platform");
      setShowUpgradeModal(true);
      return;
    }
    togglePlatform(dayIndex, platformId);
  };

  const totalSelectedPosts = Object.values(daySelection).reduce((sum, platforms) => sum + platforms.length, 0);

  const fetchGeneratedItemsForPlan = async (planId: string) => {
    const { data: items } = await supabase
      .from("content_items")
      .select("*")
      .eq("plan_id", planId)
      .order("day_number", { ascending: true });
    setGeneratedItems(items || []);
    return items || [];
  };

  const waitForGeneratedPlan = async (requestId: string) => {
    for (let attempt = 0; attempt < 36; attempt++) {
      const { data: request } = await supabase
        .from("weekly_generation_requests")
        .select("status, content_plan_id")
        .eq("id", requestId)
        .single();

      if (request?.status === "completed" && request.content_plan_id) {
        return fetchGeneratedItemsForPlan(request.content_plan_id);
      }

      const { data: latestPlan } = await supabase
        .from("content_plans")
        .select("id")
        .eq("business_id", business.id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPlan?.id) {
        const items = await fetchGeneratedItemsForPlan(latestPlan.id);
        if (items.length > 0) return items;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return [];
  };

  const canGenerate = () => {
    if (totalSelectedPosts === 0) return false;
    if (isTrial && weeklyGenCount >= 1) return false;
    return true;
  };

  const handleUpgrade = (plan: "basic" | "pro") => {
    setShowUpgradeModal(false);
    navigate(`/account?upgrade=${plan}&region=${region}`);
  };

  const handleGenerate = async () => {
    if (!canGenerate()) {
      if (isTrial && weeklyGenCount >= 1) setShowUpgrade("trial_limit");
      return;
    }

    // Auto-activate trial on first generation if no subscription exists
    if (!subscription || (!subscription.plan_name && !subscription.is_trial)) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      await supabase.from("subscriptions").upsert({
        user_id: user!.id,
        status: "active",
        plan_name: "free_trial",
        is_trial: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        starts_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      setSubscription({
        plan_name: "free_trial",
        is_trial: true,
        status: "active",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      });
      // Create notification
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: "🎉 Free Trial Started!",
        message: "Your 7-day free trial is now active. Enjoy generating content!",
        type: "info",
      });
    }

    setStep("generating");
    setGenerating(true);
    try {
      const { data: generationRequest, error: requestError } = await supabase.from("weekly_generation_requests").insert({
        user_id: user!.id,
        business_id: business.id,
        plan_type: planType,
        selected_days: daySelection,
        selected_platforms: Object.values(daySelection).flat(),
        status: "generating",
      }).select("id").single();
      if (requestError || !generationRequest) throw requestError || new Error("Could not start generation request");

      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          business_id: business.id,
          selected_days: daySelection,
          business_context: { name: businessName, industry, target_audience: targetAudience, content_goal: contentGoal, tone },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✨ Generation started", description: "Your weekly content is being created. Results will appear here automatically." });
      const items = data?.plan_id
        ? await fetchGeneratedItemsForPlan(data.plan_id)
        : await waitForGeneratedPlan(generationRequest.id);
      if (items.length === 0) throw new Error("Generation is still processing. Please open Content Manager in a minute to see the posts.");
      await supabase.from("businesses").update({ auto_generate_enabled: true }).eq("id", business.id);
      setStep("results");
      if (isTrial) setShowUpgrade("trial_generated");
      toast({ title: "✨ Weekly Content Generated!", description: `${items.length} posts created for your week.` });
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
      setStep("calendar");
    }
    setGenerating(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/auth"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        trigger={upgradeModalTrigger}
      />

      {/* Header */}
      <header className="border-b border-border bg-card h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => step === "calendar" ? navigate("/") : setStep("calendar")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> {step === "calendar" ? "Dashboard" : "Back"}
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-bold text-foreground">AI Studio</h1>
          </div>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          <Crown className="h-3 w-3 mr-1" />
          {planType.replace("_", " ")} Plan
        </Badge>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: "calendar", label: "Select Days" },
            { key: "context", label: "Business Context" },
            { key: "results", label: "Results" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.key || (step === "generating" && s.key === "results")
                  ? "gradient-primary text-primary-foreground"
                  : step === "results" && i < 2
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step === "results" && i < 2 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{s.label}</span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Calendar Selection */}
        {step === "calendar" && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-2">Select Your Weekly Schedule</h2>
              <p className="text-sm text-muted-foreground">
                Choose which days and platforms you want to post on.
                {(isBasic || isTrial) && " (1 platform per day on your plan)"}
                {isPro && " (Up to 4 platforms per day)"}
              </p>
            </div>

            <div className="grid gap-3">
              {DAYS.map((day, dayIndex) => {
                const selected = daySelection[dayIndex] || [];
                return (
                  <Card key={day} className="shadow-card">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-[100px]">
                          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {day.substring(0, 2)}
                          </span>
                          <span className="text-sm font-medium text-foreground">{day}</span>
                        </div>

                        <div className="flex gap-2 flex-wrap justify-end">
                          {PLATFORMS.map(platform => {
                            const isSelected = selected.includes(platform.id);
                            const isLocked = !isPro && !isSelected && selected.length >= 1;

                            return (
                              <button
                                key={platform.id}
                                onClick={() => handleMultiPlatformClick(dayIndex, platform.id)}
                                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  isSelected
                                    ? "gradient-primary text-primary-foreground shadow-sm"
                                    : isLocked
                                    ? "bg-muted/50 text-muted-foreground/50 cursor-pointer"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {isLocked && (
                                  <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                                )}
                                {platform.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Helper text for locked state */}
                      {(isBasic || isTrial) && selected.length >= 1 && (
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          <Lock className="h-3 w-3 inline mr-1" />
                          Multi-platform is Pro only.{" "}
                          <button
                            onClick={() => { setUpgradeModalTrigger("multi_platform"); setShowUpgradeModal(true); }}
                            className="text-primary font-medium hover:underline"
                          >
                            Activate Pro
                          </button>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selection summary */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalSelectedPosts}</span> posts selected this week
                {planLimits && (
                  <span className="ml-2 text-xs">(max {isBasic || isTrial ? "7" : "28"}/week)</span>
                )}
              </div>
              <Button onClick={() => setStep("context")} disabled={totalSelectedPosts === 0} className="gradient-primary border-0">
                Next: Business Context <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {isTrial && weeklyGenCount >= 1 && (
              <UpgradePrompt
                type="trial_limit"
                message="You've used your free weekly generation. Upgrade to continue generating content."
                onUpgrade={() => navigate("/pricing")}
                onDismiss={() => {}}
              />
            )}
          </div>
        )}

        {/* Step 2: Business Context */}
        {step === "context" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Business Context</h2>
              <p className="text-sm text-muted-foreground">Auto-filled from your profile. Edit as needed.</p>
            </div>
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Business Name</Label>
                  <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Industry</Label>
                  <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Restaurant, Fitness" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Target Audience</Label>
                <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Who are you trying to reach?" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Content Goal</Label>
                <Select value={contentGoal} onValueChange={setContentGoal}>
                  <SelectTrigger><SelectValue placeholder="What's your main goal?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                    <SelectItem value="engagement">Engagement & Community</SelectItem>
                    <SelectItem value="lead_generation">Lead Generation</SelectItem>
                    <SelectItem value="sales">Drive Sales</SelectItem>
                    <SelectItem value="education">Educate Audience</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">
                  Tone
                  {(isBasic || isTrial) && (
                    <Badge variant="outline" className="ml-2 text-xs"><Lock className="h-3 w-3 mr-1" /> Advanced tones in Pro</Badge>
                  )}
                </Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly & Casual</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    {isPro && (
                      <>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                        <SelectItem value="storytelling">Storytelling</SelectItem>
                        <SelectItem value="bold">Bold & Edgy</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("calendar")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate() || generating} className="flex-1 gradient-primary border-0">
                <Sparkles className="h-4 w-4 mr-2" /> Generate Weekly Content ({totalSelectedPosts} posts)
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">AI is crafting your content...</h2>
              <p className="text-sm text-muted-foreground">
                Generating {totalSelectedPosts} platform-optimized posts with captions, hashtags, images, and CTAs.
              </p>
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your Weekly Content</h2>
                <p className="text-sm text-muted-foreground">{generatedItems.length} posts generated</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/content")}>View All Content</Button>
                <Button size="sm" onClick={() => { setStep("calendar"); setDaySelection({}); setGeneratedItems([]); }} className="gradient-primary border-0">
                  <Sparkles className="h-4 w-4 mr-1" /> Generate New Week
                </Button>
              </div>
            </div>

            {showUpgrade === "trial_generated" && (
              <UpgradePrompt
                type="trial_generated"
                message="Your free week is ready 🚀 Next week content is locked 🔒 Upgrade to continue generating."
                onUpgrade={() => navigate("/pricing")}
                onDismiss={() => setShowUpgrade(null)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedItems.map((item) => (
                <ContentCard
                  key={item.id}
                  id={item.id}
                  dayNumber={item.day_number}
                  theme={item.content_theme}
                  goal={item.content_goal}
                  primaryPlatform={item.primary_platform}
                  secondaryPlatforms={item.secondary_platforms || []}
                  contentType={item.content_type}
                  topic={item.topic}
                  hook={item.hook}
                  painPoint={item.pain_point}
                  coreMessage={item.core_message}
                  cta={item.cta}
                  postingTime={item.posting_time}
                  whyItMatters={item.why_it_matters}
                  status={item.status}
                  caption={item.caption}
                  hashtags={item.hashtags}
                  imagePrompt={item.image_prompt}
                  imageUrl={item.image_url}
                  visualStyle={item.visual_style}
                  repurposingSuggestion={item.repurposing_suggestion}
                  onStatusChange={() => {}}
                  onDelete={() => setGeneratedItems(prev => prev.filter(i => i.id !== item.id))}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
