import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, Building2, CalendarDays, Sparkles } from "lucide-react";

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
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const createSamplePlan = async () => {
    if (!selectedBusiness || !user) return;
    setLoading(true);
    try {
      const { data: plan, error: planError } = await supabase
        .from("content_plans")
        .insert({
          business_id: selectedBusiness,
          user_id: user.id,
          week_start: new Date().toISOString().split("T")[0],
          week_number: plans.length + 1,
          strategy_summary: "This week focuses on brand awareness, trust building, and lead generation through diverse content formats.",
          status: "draft",
        } as any)
        .select()
        .single();
      if (planError) throw planError;

      const sampleItems = [
        { day_number: 1, content_theme: "Educational", content_goal: "Awareness", primary_platform: "Instagram", secondary_platforms: ["Facebook"], content_type: "Carousel", topic: "5 Common Mistakes in Your Industry", hook: "Stop making these costly mistakes...", pain_point: "Customers waste time and money on avoidable errors", core_message: "Expert guidance saves you from common pitfalls", cta: "Save this post for later →", posting_time: "10:00 AM", why_it_matters: "Educational content builds authority", status: "draft" },
        { day_number: 2, content_theme: "Trust Building", content_goal: "Trust", primary_platform: "LinkedIn", secondary_platforms: ["Facebook"], content_type: "Text", topic: "Behind the Scenes: How We Work", hook: "Here's what happens before you see the final result...", pain_point: "Clients wonder if they can trust the process", core_message: "Transparency builds lasting relationships", cta: "What would you like to see behind the scenes?", posting_time: "8:30 AM", why_it_matters: "Humanizes the brand", status: "draft" },
        { day_number: 3, content_theme: "Engagement", content_goal: "Engagement", primary_platform: "Instagram", secondary_platforms: ["X (Twitter)"], content_type: "Reel", topic: "Quick Tip: One Change That Makes a Difference", hook: "This one trick changed everything for our clients...", pain_point: "People want quick, actionable solutions", core_message: "Small changes create big results", cta: "Follow for more tips like this!", posting_time: "12:00 PM", why_it_matters: "Reels drive maximum reach", status: "draft" },
        { day_number: 4, content_theme: "Authority", content_goal: "Authority", primary_platform: "LinkedIn", secondary_platforms: ["Google Business Profile"], content_type: "Image", topic: "Industry Insight: What's Changing in 2026", hook: "The industry is shifting. Are you ready?", pain_point: "Fear of falling behind on trends", core_message: "Stay ahead with expert insights", cta: "Share your thoughts in the comments", posting_time: "9:00 AM", why_it_matters: "Positions as thought leader", status: "draft" },
        { day_number: 5, content_theme: "Lead Generation", content_goal: "Leads", primary_platform: "Facebook", secondary_platforms: ["Instagram"], content_type: "Image", topic: "Limited Offer: Free Consultation", hook: "This week only — free strategy session", pain_point: "Prospects need a low-risk entry point", core_message: "Take the first step at no cost", cta: "DM 'FREE' to get started", posting_time: "11:00 AM", why_it_matters: "Direct lead generation", status: "draft" },
        { day_number: 6, content_theme: "Local Visibility", content_goal: "Local Reach", primary_platform: "Google Business Profile", secondary_platforms: ["Facebook"], content_type: "Text", topic: "Serving [Your City] for Over X Years", hook: "Your neighbors trust us. Here's why.", pain_point: "Local customers want nearby, reliable options", core_message: "We're local, experienced, and trusted", cta: "Visit us or call today", posting_time: "2:00 PM", why_it_matters: "Boosts local SEO", status: "draft" },
        { day_number: 7, content_theme: "Social Proof", content_goal: "Conversion", primary_platform: "Instagram", secondary_platforms: ["LinkedIn", "Facebook"], content_type: "Carousel", topic: "Client Success Story: Before & After", hook: "See the transformation we created for a real client", pain_point: "Prospects need proof before committing", core_message: "Real results from real clients", cta: "Ready for your transformation? Link in bio", posting_time: "5:00 PM", why_it_matters: "Social proof drives conversions", status: "draft" },
      ];

      const insertItems = sampleItems.map((item) => ({
        ...item,
        plan_id: (plan as any).id,
        user_id: user.id,
      }));

      await supabase.from("content_items").insert(insertItems as any);
      await fetchPlans(selectedBusiness);
    } catch (error: any) {
      console.error("Error creating plan:", error);
    }
    setLoading(false);
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
            <Button variant="outline" size="sm" onClick={() => navigate("/setup")}>
              <Plus className="h-4 w-4 mr-1" /> New Business
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Plans header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Weekly Content Plans
            </h2>
            {plans.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Week {plans.find((p) => p.id === selectedPlan)?.week_number || 1}
              </span>
            )}
          </div>
          <Button onClick={createSamplePlan} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Week
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

        {/* Content grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
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
              />
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center space-y-3">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="font-heading font-semibold text-foreground">No content plan yet</h3>
              <p className="text-sm text-muted-foreground">
                Click "New Week" to generate your first 7-day content plan.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
