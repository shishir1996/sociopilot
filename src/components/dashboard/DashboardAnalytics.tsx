import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface AnalyticsData {
  totalPosts: number;
  published: number;
  scheduled: number;
  drafts: number;
  platformBreakdown: Record<string, number>;
  weeklyTrend: { week: number; count: number }[];
}

interface DashboardAnalyticsProps {
  businessId: string;
}

export function DashboardAnalytics({ businessId }: DashboardAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    // Fetch all content items for this business via plans
    const { data: plans } = await supabase
      .from("content_plans")
      .select("id, week_number")
      .eq("business_id", businessId) as any;

    if (!plans || plans.length === 0) {
      setData({ totalPosts: 0, published: 0, scheduled: 0, drafts: 0, platformBreakdown: {}, weeklyTrend: [] });
      setLoading(false);
      return;
    }

    const planIds = plans.map((p: any) => p.id);
    const { data: items } = await supabase
      .from("content_items")
      .select("status, primary_platform, plan_id")
      .in("plan_id", planIds) as any;

    const allItems = items || [];
    const published = allItems.filter((i: any) => i.status === "posted").length;
    const scheduled = allItems.filter((i: any) => i.status === "scheduled").length;
    const drafts = allItems.filter((i: any) => i.status === "draft").length;

    const platformBreakdown: Record<string, number> = {};
    allItems.forEach((i: any) => {
      const p = i.primary_platform || "Unknown";
      platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
    });

    // Weekly trend
    const weekMap: Record<number, number> = {};
    allItems.forEach((i: any) => {
      const plan = plans.find((p: any) => p.id === i.plan_id);
      if (plan) {
        weekMap[plan.week_number] = (weekMap[plan.week_number] || 0) + 1;
      }
    });
    const weeklyTrend = Object.entries(weekMap)
      .map(([week, count]) => ({ week: Number(week), count: count as number }))
      .sort((a, b) => a.week - b.week)
      .slice(-6);

    setData({ totalPosts: allItems.length, published, scheduled, drafts, platformBreakdown, weeklyTrend });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Total Posts", value: data.totalPosts, icon: BarChart3, color: "text-primary" },
    { label: "Published", value: data.published, icon: CheckCircle, color: "text-green-500" },
    { label: "Scheduled", value: data.scheduled, icon: Clock, color: "text-blue-500" },
    { label: "Drafts", value: data.drafts, icon: AlertCircle, color: "text-yellow-500" },
  ];

  const maxBarValue = Math.max(...(data.weeklyTrend.map(w => w.count)), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Platform Breakdown */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Platform Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.platformBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No content yet</p>
            ) : (
              Object.entries(data.platformBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([platform, count]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-24 capitalize truncate">{platform}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / data.totalPosts) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right">{count}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Weekly Content Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {data.weeklyTrend.map((w) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">{w.count}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t-md transition-all min-h-[4px]"
                      style={{ height: `${(w.count / maxBarValue) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">W{w.week}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
