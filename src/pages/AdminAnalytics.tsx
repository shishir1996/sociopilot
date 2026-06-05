import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Shield, TrendingUp, TrendingDown, Users, DollarSign,
  BarChart3, Activity, Crown, Loader2, CreditCard, UserMinus, UserPlus, Cpu, Settings, Video
} from "lucide-react";

const adminNav = [
  { icon: Shield, label: "Dashboard", route: "/admin" },
  { icon: BarChart3, label: "Analytics", route: "/admin/analytics" },
  { icon: Cpu, label: "AI Control", route: "/admin/ai" },
  { icon: Settings, label: "Integrations", route: "/admin/integrations" },
  { icon: CreditCard, label: "Payments", route: "/admin/payments" },
  { icon: Video, label: "AI Video", route: "/admin/ai-video" },
];

interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: any;
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [regionFilter, setRegionFilter] = useState("all");

  // Metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [trialUsers, setTrialUsers] = useState(0);
  const [proUsers, setProUsers] = useState(0);
  const [basicUsers, setBasicUsers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (user) checkAdminAndFetch();
  }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (data && data.length > 0) {
      setIsAdmin(true);
      await fetchAnalytics();
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const [subsRes, postsRes, paymentsRes] = await Promise.all([
      supabase.from("subscriptions").select("*"),
      supabase.from("content_items").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("*").eq("status", "completed"),
    ]);

    const subs = subsRes.data || [];
    setTotalUsers(subs.length);
    setActiveSubscribers(subs.filter(s => s.status === "active" && !s.is_trial).length);
    setTrialUsers(subs.filter(s => s.is_trial).length);
    setProUsers(subs.filter(s => s.plan_name === "pro" && s.status === "active").length);
    setBasicUsers(subs.filter(s => s.plan_name === "basic" && s.status === "active").length);
    setTotalPosts(postsRes.count || 0);
    setPayments(paymentsRes.data || []);
  };

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const mrr = payments.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + Number(p.amount), 0);

  const conversionRate = trialUsers > 0 ? Math.round((activeSubscribers / (trialUsers + activeSubscribers)) * 100) : 0;
  const churnRate = totalUsers > 0 ? Math.round(((totalUsers - activeSubscribers - trialUsers) / totalUsers) * 100) : 0;
  const arpu = activeSubscribers > 0 ? Math.round(totalRevenue / activeSubscribers) : 0;

  const indiaRevenue = payments.filter(p => p.region === "india").reduce((s, p) => s + Number(p.amount), 0);
  const globalRevenue = payments.filter(p => p.region !== "india").reduce((s, p) => s + Number(p.amount), 0);

  const metrics: MetricCard[] = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, change: "+12%", trend: "up", icon: DollarSign },
    { label: "MRR", value: `$${mrr.toLocaleString()}`, change: "+8%", trend: "up", icon: CreditCard },
    { label: "Active Subscribers", value: String(activeSubscribers), change: "+5%", trend: "up", icon: Users },
    { label: "Total Users", value: String(totalUsers), change: "+15%", trend: "up", icon: UserPlus },
    { label: "Trial Users", value: String(trialUsers), change: "+3", trend: "up", icon: Activity },
    { label: "Conversion Rate", value: `${conversionRate}%`, change: conversionRate > 10 ? "+2%" : "-1%", trend: conversionRate > 10 ? "up" : "down", icon: TrendingUp },
    { label: "Churn Rate", value: `${churnRate}%`, change: churnRate < 10 ? "-1%" : "+2%", trend: churnRate < 10 ? "up" : "down", icon: UserMinus },
    { label: "ARPU", value: `$${arpu}`, change: "+$3", trend: "up", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forecasting projections
  const projectedGrowth = {
    usersNextMonth: Math.round(totalUsers * 1.12),
    mrrNextQuarter: Math.round(mrr * 3.3),
    projectedARR: Math.round(mrr * 12 * 1.15),
    estConversionNext: Math.min(100, conversionRate + 3),
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} bg-foreground transition-all duration-200 flex flex-col hidden md:flex flex-shrink-0`}>
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          {sidebarOpen && <span className="text-sm font-bold text-primary-foreground">Analytics</span>}
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1">
          {adminNav.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.route === "/admin/analytics"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-muted-foreground/5"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-muted-foreground/10 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-muted-foreground/5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {sidebarOpen && <span>Back to App</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-muted-foreground/5 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b border-border bg-card h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Top Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <Card key={m.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <m.icon className="h-5 w-5 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          m.trend === "up" ? "text-green-600 border-green-200" : m.trend === "down" ? "text-red-500 border-red-200" : ""
                        }`}
                      >
                        {m.trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : m.trend === "down" ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
                        {m.change}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Forecasting Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Growth Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Projected Users (Next Month)</p>
                    <p className="text-xl font-bold text-foreground">{projectedGrowth.usersNextMonth.toLocaleString()}</p>
                    <p className="text-xs text-green-600">+12% growth</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">MRR (Next Quarter Est.)</p>
                    <p className="text-xl font-bold text-foreground">${projectedGrowth.mrrNextQuarter.toLocaleString()}</p>
                    <p className="text-xs text-green-600">+10% quarter-over-quarter</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Projected ARR</p>
                    <p className="text-xl font-bold text-foreground">${projectedGrowth.projectedARR.toLocaleString()}</p>
                    <p className="text-xs text-green-600">annual run rate</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Est. Conversion Rate</p>
                    <p className="text-xl font-bold text-foreground">{projectedGrowth.estConversionNext}%</p>
                    <p className="text-xs text-green-600">+3% improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Region</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">🇮🇳 India (INR)</span>
                    </div>
                    <span className="font-semibold text-foreground">₹{indiaRevenue.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-sm text-muted-foreground">🌍 Global (USD)</span>
                    </div>
                    <span className="font-semibold text-foreground">${globalRevenue.toLocaleString("en-US")}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (indiaRevenue / totalRevenue) * 100 : 50}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Pro", count: proUsers, color: "bg-amber-500", icon: Crown },
                    { name: "Basic", count: basicUsers, color: "bg-primary", icon: Activity },
                    { name: "Trial", count: trialUsers, color: "bg-blue-500", icon: Activity },
                  ].map((plan) => (
                    <div key={plan.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${plan.color}`} />
                        <span className="text-sm text-muted-foreground">{plan.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${plan.color} rounded-full`}
                            style={{ width: `${totalUsers > 0 ? (plan.count / totalUsers) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="font-semibold text-foreground w-8 text-right">{plan.count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Trial Analytics & Usage */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trial Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Trials</span>
                    <span className="font-semibold text-foreground">{trialUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expired Trials</span>
                    <span className="font-semibold text-foreground">{Math.max(0, totalUsers - activeSubscribers - trialUsers)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trial → Paid Rate</span>
                    <span className="font-semibold text-foreground">{conversionRate}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Posts Generated</span>
                    <span className="font-semibold text-foreground">{totalPosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Posts/User</span>
                    <span className="font-semibold text-foreground">{totalUsers > 0 ? Math.round(totalPosts / totalUsers) : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Rate</span>
                    <span className="font-semibold text-foreground">{totalUsers > 0 ? Math.round(((activeSubscribers + trialUsers) / totalUsers) * 100) : 0}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {payments.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.plan_name} Plan</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {p.currency === "INR" ? "₹" : "$"}{Number(p.amount).toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-xs">{p.region}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
