import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, Filter, ArrowLeft, CalendarDays
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  plan_id: string;
}

interface ContentPlan {
  id: string;
  week_start: string;
  week_number: number;
  strategy_summary: string;
  status: string;
}

export default function ContentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<string>("all");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1) as any;

    if (!biz || biz.length === 0) {
      setLoading(false);
      return;
    }

    const bizId = biz[0].id;
    setBusinessId(bizId);

    const { data: plansData } = await supabase
      .from("content_plans")
      .select("id, week_start, week_number, strategy_summary, status")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false }) as any;

    setPlans(plansData || []);

    if (plansData && plansData.length > 0) {
      const planIds = plansData.map((p: any) => p.id);
      const { data: itemsData } = await supabase
        .from("content_items")
        .select("*")
        .in("plan_id", planIds)
        .order("day_number", { ascending: true }) as any;
      setItems(itemsData || []);
    }
    setLoading(false);
  };

  const generateAIPlan = async () => {
    if (!businessId || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✨ Content Plan Generated!", description: "AI has created a new 7-day plan." });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  // Get unique platforms from items
  const allPlatforms = [...new Set(items.map(i => i.primary_platform).filter(Boolean))];

  // Apply filters
  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (platformFilter !== "all" && item.primary_platform !== platformFilter) return false;
    if (weekFilter !== "all" && item.plan_id !== weekFilter) return false;
    return true;
  });

  const statusCounts = {
    all: items.length,
    draft: items.filter(i => i.status === "draft").length,
    scheduled: items.filter(i => i.status === "scheduled").length,
    posted: items.filter(i => i.status === "posted").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <h1 className="text-sm font-bold text-foreground">Content Manager</h1>
        </div>
        <Button onClick={generateAIPlan} size="sm" disabled={generating} className="gradient-primary border-0">
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-1" /> Generate New Week</>
          )}
        </Button>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" className="text-xs">
              All <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">
              Drafts <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">{statusCounts.draft}</Badge>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">
              Scheduled <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">{statusCounts.scheduled}</Badge>
            </TabsTrigger>
            <TabsTrigger value="posted" className="text-xs">
              Published <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">{statusCounts.posted}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Secondary filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Filters:</span>
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {allPlatforms.map(p => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {plans.map(p => (
                <SelectItem key={p.id} value={p.id}>Week {p.week_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || platformFilter !== "all" || weekFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setWeekFilter("all"); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Results info */}
        <p className="text-xs text-muted-foreground mb-4">
          Showing {filtered.length} of {items.length} content items
        </p>

        {/* Generating state */}
        {generating && (
          <Card className="mb-6 shadow-card">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="font-bold text-foreground">AI is crafting your content plan...</h3>
              <p className="text-sm text-muted-foreground">Generating captions, hashtags, and platform-specific content for 7 days.</p>
            </CardContent>
          </Card>
        )}

        {/* Content grid */}
        {!generating && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => (
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
                onStatusChange={fetchData}
                onDelete={fetchData}
              />
            ))}
          </div>
        ) : !generating ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center space-y-3">
              <CalendarDays className="h-12 w-12 text-primary mx-auto" />
              <h3 className="font-bold text-foreground">
                {items.length === 0 ? "No content yet" : "No content matches your filters"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? 'Click "Generate New Week" to create a 7-day content plan.'
                  : "Try adjusting your filters to see more results."}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
