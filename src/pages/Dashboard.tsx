import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, Building2, CalendarDays, Sparkles, Settings, Loader2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: string;
  name: string;
  industry: string;
  platforms: string[];
}

interface ContentPlan {
  id: string;
  week_start: string;
  week_number: number;
  strategy_summary: string;
  status: string;
}

interface ContentItem {
  id: string;
  day_number: number;
  content_theme: string;
  content_goal: string;
  primary_platform: string;
  secondary_platforms: string[];
  content_type: string;
  topic: string;
  hook: string;
  pain_point: string;
  core_message: string;
  cta: string;
  posting_time: string;
  why_it_matters: string;
  status: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
  image_url: string;
  visual_style: string;
  repurposing_suggestion: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, [user]);

  const fetchBusinesses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("businesses")
      .select("id, name, industry, platforms")
      .eq("user_id", user.id) as any;
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0].id);
      fetchPlans(data[0].id);
    }
    setLoading(false);
  };

  const fetchPlans = async (businessId: string) => {
    const { data } = await supabase
      .from("content_plans")
      .select("id, week_start, week_number, strategy_summary, status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }) as any;
    setPlans(data || []);
    if (data && data.length > 0) {
      setSelectedPlan(data[0].id);
      fetchItems(data[0].id);
    } else {
      setSelectedPlan(null);
      setItems([]);
    }
  };

  const fetchItems = async (planId: string) => {
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .eq("plan_id", planId)
      .order("day_number", { ascending: true }) as any;
    setItems(data || []);
  };

  const generateAIPlan = async () => {
    if (!selectedBusiness || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { business_id: selectedBusiness },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "✨ Content Plan Generated!",
        description: "AI has created a complete 7-day plan with captions, hashtags, and more.",
      });
      await fetchPlans(selectedBusiness);
    } catch (error: any) {
      console.error("Error generating plan:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate content plan. Please try again.",
        variant: "destructive",
      });
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your content...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-elevated text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground">Set Up Your Business</h2>
            <p className="text-sm text-muted-foreground">
              Tell us about your business so we can create the perfect content strategy.
            </p>
            <Button onClick={() => navigate("/setup")} className="w-full">
              Get Started <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-foreground">ContentFlow</h1>
            {selectedBusiness && (
              <span className="text-sm text-muted-foreground">
                / {businesses.find((b) => b.id === selectedBusiness)?.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-1" /> Accounts
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/account")}>
              <UserCog className="h-4 w-4 mr-1" /> Account
            </Button>
            {/* Only one business per user - no "New Business" button */}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Strategy summary */}
        {currentPlan?.strategy_summary && (
          <Card className="mb-6 shadow-card bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">📋 Strategy:</span>{" "}
                {currentPlan.strategy_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plans header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Weekly Content Plans
            </h2>
            {plans.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Week {currentPlan?.week_number || 1}
              </span>
            )}
          </div>
          <Button onClick={generateAIPlan} size="sm" disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" /> Generate New Week
              </>
            )}
          </Button>
        </div>

        {/* Plan tabs */}
        {plans.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  fetchItems(plan.id);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedPlan === plan.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                Week {plan.week_number}
              </button>
            ))}
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <Card className="mb-6 shadow-card">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="font-heading font-semibold text-foreground">AI is crafting your content plan...</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Generating captions, hashtags, hooks, and platform-specific content for 7 days. This takes about 15-30 seconds.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content grid */}
        {!generating && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
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
                onStatusChange={() => selectedPlan && fetchItems(selectedPlan)}
                onDelete={() => selectedPlan && fetchItems(selectedPlan)}
              />
            ))}
          </div>
        ) : !generating ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center space-y-3">
              <Sparkles className="h-12 w-12 text-primary mx-auto" />
              <h3 className="font-heading font-semibold text-foreground">No content plan yet</h3>
              <p className="text-sm text-muted-foreground">
                Click "Generate New Week" to let AI create a complete 7-day content plan with captions, hashtags, and more.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
