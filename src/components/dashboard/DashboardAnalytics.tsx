import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, Sparkles } from "lucide-react";

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

function AnimatedCount({ value, label, icon: Icon, color, gradient }: { value: number; label: string; icon: any; color: string; gradient: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { start = value; clearInterval(timer); }
      setDisplay(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="card-3d-float">
      <Card className="stat-glow overflow-hidden relative border-[0.5px] border-border/60">
        <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full ${gradient} opacity-[0.07] blur-2xl`} />
        <CardContent className="pt-5 pb-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{display}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardAnalytics({ businessId }: DashboardAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [businessId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data: plans } = await supabase.from("content_plans").select("id, week_number").eq("business_id", businessId) as any;
    if (!plans || plans.length === 0) {
      setData({ totalPosts: 0, published: 0, scheduled: 0, drafts: 0, platformBreakdown: {}, weeklyTrend: [] });
      setLoading(false); return;
    }
    const planIds = plans.map((p: any) => p.id);
    const { data: items } = await supabase.from("content_items").select("status, primary_platform, plan_id").in("plan_id", planIds) as any;
    const allItems = items || [];
    const published = allItems.filter((i: any) => i.status === "posted").length;
    const scheduled = allItems.filter((i: any) => i.status === "scheduled").length;
    const drafts = allItems.filter((i: any) => i.status === "draft").length;
    const platformBreakdown: Record<string, number> = {};
    allItems.forEach((i: any) => { platformBreakdown[i.primary_platform || "Unknown"] = (platformBreakdown[i.primary_platform || "Unknown"] || 0) + 1; });
    const weekMap: Record<number, number> = {};
    allItems.forEach((i: any) => {
      const plan = plans.find((p: any) => p.id === i.plan_id);
      if (plan) weekMap[plan.week_number] = (weekMap[plan.week_number] || 0) + 1;
    });
    const weeklyTrend = Object.entries(weekMap).map(([week, count]) => ({ week: Number(week), count })).sort((a, b) => a.week - b.week).slice(-6);
    setData({ totalPosts: allItems.length, published, scheduled, drafts, platformBreakdown, weeklyTrend });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shimmer"><CardContent className="pt-6"><div className="h-16 bg-muted/30 rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Total Posts", value: data.totalPosts, icon: BarChart3, color: "bg-gradient-to-br from-blue-500/15 to-blue-600/10 text-blue-500", gradient: "bg-blue-500" },
    { label: "Published", value: data.published, icon: CheckCircle, color: "bg-gradient-to-br from-emerald-500/15 to-green-600/10 text-emerald-500", gradient: "bg-emerald-500" },
    { label: "Scheduled", value: data.scheduled, icon: Clock, color: "bg-gradient-to-br from-violet-500/15 to-purple-600/10 text-violet-500", gradient: "bg-violet-500" },
    { label: "Drafts", value: data.drafts, icon: AlertCircle, color: "bg-gradient-to-br from-amber-500/15 to-orange-600/10 text-amber-500", gradient: "bg-amber-500" },
  ];

  const maxBarValue = Math.max(...data.weeklyTrend.map(w => w.count), 1);
  const platformColors = ["from-blue-500 to-cyan-400", "from-violet-500 to-purple-400", "from-emerald-500 to-green-400", "from-amber-500 to-orange-400", "from-pink-500 to-rose-400"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
        {statCards.map((stat, i) => (
          <AnimatedCount key={stat.label} value={stat.value} label={stat.label} icon={stat.icon} color={stat.color} gradient={stat.gradient} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Platform Breakdown */}
        <Card className="glass-premium gradient-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              Platform Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.platformBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No content yet</p>
            ) : (
              Object.entries(data.platformBreakdown).sort(([, a], [, b]) => b - a).map(([platform, count], i) => (
                <div key={platform} className="flex items-center gap-3 card-3d-float">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platformColors[i % platformColors.length]} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-white uppercase">{platform.slice(0, 2)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-foreground capitalize">{platform}</span>
                      <span className="text-xs text-muted-foreground font-medium">{count}</span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${platformColors[i % platformColors.length]} transition-all duration-1000`}
                        style={{ width: `${(count / data.totalPosts) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="glass-premium gradient-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-primary" />
              </div>
              Weekly Content Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {data.weeklyTrend.map((w, i) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-xs text-muted-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity">{w.count}</span>
                    <div className="w-full rounded-t-md transition-all duration-500 cursor-pointer relative overflow-hidden"
                      style={{ height: `${(w.count / maxBarValue) * 100}%`, background: `linear-gradient(180deg, hsl(${220 + i * 15}, 80%, 55%), hsl(${260 + i * 10}, 70%, 50%))` }}>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
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
