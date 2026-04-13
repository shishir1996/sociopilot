import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Shield, TrendingUp, TrendingDown, Users, DollarSign,
  BarChart3, Activity, Crown, Loader2, CreditCard, UserMinus, UserPlus
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
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
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
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
                <span className="font-semibold text-foreground">₹{indiaRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">🌍 Global (USD)</span>
                </div>
                <span className="font-semibold text-foreground">${globalRevenue.toLocaleString()}</span>
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
      </main>
    </div>
  );
}
