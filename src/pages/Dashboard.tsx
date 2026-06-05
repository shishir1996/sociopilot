import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogOut, Building2, Sparkles, Settings, UserCog,
  Zap, BarChart3, LayoutDashboard, Calendar, Inbox, Globe, ImageIcon, Crown, ChevronDown, Lightbulb, TrendingUp
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SocialConnectWidget } from "@/components/SocialConnectWidget";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { UsageIndicators } from "@/components/dashboard/UsageIndicators";
import { SetupProgress } from "@/components/dashboard/SetupProgress";

interface Business {
  id: string;
  name: string;
  industry: string;
  platforms: string[];
}

function InsightNotifications({ businessId, userId, navigate: nav }: { businessId: string; userId: string; navigate: (path: string) => void }) {
  const [insights, setInsights] = useState<Array<{ icon: any; title: string; desc: string; action?: string; route?: string }>>([]);

  useEffect(() => {
    if (!businessId) return;
    const fetchInsights = async () => {
      const result: Array<{ icon: any; title: string; desc: string; action?: string; route?: string }> = [];

      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("platform")
        .eq("business_id", businessId) as any;
      const connected = (accounts || []).map((a: any) => a.platform);

      const { data: items } = await supabase
        .from("content_items")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50) as any;
      const posted = (items || []).filter((i: any) => i.status === "posted").length;
      const draft = (items || []).filter((i: any) => i.status === "draft").length;

      if (connected.length === 0) {
        result.push({
          icon: Globe, title: "Connect your first platform",
          desc: "Link your social media accounts to start publishing content automatically.",
          action: "Connect Now", route: "/settings",
        });
      }
      if (connected.length > 0 && draft > 3) {
        result.push({
          icon: Sparkles, title: `${draft} posts ready to publish`,
          desc: "You have unpublished content waiting. Schedule or post them to keep your audience engaged.",
          action: "View Content", route: "/content",
        });
      }
      if (connected.length > 0 && posted > 0) {
        result.push({
          icon: TrendingUp, title: `${posted} posts published`,
          desc: "Your content is live! Check your analytics to see how your audience is responding.",
          action: "View Analytics", route: "/content",
        });
      }
      if (connected.includes("linkedin") && !connected.includes("facebook") && !connected.includes("instagram")) {
        result.push({
          icon: Lightbulb, title: "Cross-platform tip",
          desc: "LinkedIn content performs well when reshared on X (Twitter). Connect more platforms to maximize reach.",
          action: "Connect More", route: "/settings",
        });
      }

      setInsights(result);
    };
    fetchInsights();
  }, [businessId]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {insights.slice(0, 2).map((insight, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-primary/10 bg-primary/5">
          <insight.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{insight.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{insight.desc}</p>
          </div>
          {insight.action && insight.route && (
            <Button size="sm" variant="outline" className="text-xs h-7 flex-shrink-0" onClick={() => nav(insight.route!)}>
              {insight.action}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

const sidebarNav = [
  { icon: LayoutDashboard, label: "Dashboard", route: "/" },
  { icon: Calendar, label: "Schedule", route: "/schedule" },
  { icon: BarChart3, label: "Content", route: "/content" },
  { icon: Sparkles, label: "AI Studio", route: "/ai-studio" },
  { icon: Globe, label: "GMB", route: "/google-business", isGmb: true },
  { icon: Settings, label: "Social Channels", route: "/settings" },
  { icon: ImageIcon, label: "Brand Assets", route: "/brand-assets" },
  { icon: UserCog, label: "Account", route: "/account" },
];

const mobileNav = [
  { icon: LayoutDashboard, label: "Home", route: "/" },
  { icon: Calendar, label: "Schedule", route: "/schedule" },
  { icon: BarChart3, label: "Content", route: "/content" },
  { icon: Sparkles, label: "AI Studio", route: "/ai-studio" },
  { icon: UserCog, label: "Menu", route: null },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      const { data: logoData } = await supabase
        .from("brand_assets")
        .select("file_url")
        .eq("business_id", data[0].id)
        .eq("asset_type", "logo")
        .order("created_at", { ascending: false })
        .limit(1);
      if (logoData && logoData.length > 0) {
        setLogoUrl(logoData[0].file_url);
      }
    }
    // Fetch subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    if (subData && subData.length > 0) setSubscription(subData[0]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-elevated text-center border-border">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Set Up Your Business</h2>
            <p className="text-sm text-muted-foreground">
              Tell us about your business so we can create the perfect content strategy.
            </p>
            <Button onClick={() => navigate("/setup")} className="w-full gradient-primary border-0">
              Get Started <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} bg-foreground transition-all duration-200 flex flex-col hidden md:flex`}>
        <div className="p-4 flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {sidebarOpen && <span className="text-sm font-bold text-primary-foreground">Growvix</span>}
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1">
          {sidebarNav.map((item: any) => {
            const isActive = item.route === "/" ? location.pathname === "/" : location.pathname.startsWith(item.route || "/none");
            return (
              <button
                key={item.label}
                onClick={() => (item as any).route && navigate((item as any).route)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-muted-foreground/5"
                }`}
              >
                {item.isGmb ? (
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41.6 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/>
                  </svg>
                ) : (
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                )}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-muted-foreground/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground/80 py-1"
          >
            {sidebarOpen ? "← Collapse" : "→"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Nav */}
        <header className="border-b border-border bg-card h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <span className="text-sm font-bold text-foreground">Growvix</span>
            </div>
            {selectedBusiness && (
              <div className="flex items-center gap-2 hidden sm:flex">
                <span className="text-sm text-muted-foreground">
                  {businesses.find((b) => b.id === selectedBusiness)?.name}
                </span>
                <PlanBadge
                  planName={subscription?.plan_name || "free_trial"}
                  isTrial={subscription?.is_trial}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Settings className="h-3.5 w-3.5" /> Menu <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/pricing")}>
                  <Crown className="h-3.5 w-3.5 mr-2" /> Plans & Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Trial Banner */}
            <div className="mb-4">
              <TrialBanner />
            </div>

            {/* Setup progress */}
            <SetupProgress businessId={selectedBusiness} />

            {/* Usage Indicators */}
            {selectedBusiness && (
              <UsageIndicators businessId={selectedBusiness} />
            )}

            {/* Social Connect Widget */}
            {selectedBusiness && (
              <div className="mb-6">
                <SocialConnectWidget businessId={selectedBusiness} />
              </div>
            )}

            {/* Insight Notifications */}
            {selectedBusiness && user && (
              <InsightNotifications businessId={selectedBusiness} userId={user.id} navigate={navigate} />
            )}

            {/* Analytics Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Overview</h2>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/ai-studio")} size="sm" className="gradient-primary border-0">
                  <Sparkles className="h-4 w-4 mr-1" /> Generate Content
                </Button>
                <Button onClick={() => navigate("/content")} size="sm" variant="outline">
                  View Content
                </Button>
              </div>
            </div>

            {/* Analytics */}
            {selectedBusiness && (
              <DashboardAnalytics businessId={selectedBusiness} />
            )}
          </div>
        </main>
      </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex items-center justify-around px-2 py-1 safe-area-bottom">
        {mobileNav.map((item) => {
          const isActive = item.route === "/" ? location.pathname === "/" : location.pathname.startsWith(item.route || "/none");
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.route) {
                  navigate(item.route);
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground/60"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <Button variant="outline" className="w-full max-w-xs" onClick={() => { navigate("/brand-assets"); setMobileMenuOpen(false); }}>
              <ImageIcon className="h-4 w-4 mr-2" /> Brand Assets
            </Button>
            <Button variant="outline" className="w-full max-w-xs" onClick={() => { navigate("/settings"); setMobileMenuOpen(false); }}>
              <Settings className="h-4 w-4 mr-2" /> Connected Accounts
            </Button>
            <Button variant="outline" className="w-full max-w-xs" onClick={() => { navigate("/account"); setMobileMenuOpen(false); }}>
              <UserCog className="h-4 w-4 mr-2" /> Account Settings
            </Button>
            <Button className="w-full max-w-xs gradient-primary border-0" onClick={() => { navigate("/pricing"); setMobileMenuOpen(false); }}>
              <Crown className="h-4 w-4 mr-2" /> Plans & Billing
            </Button>
            <Button variant="ghost" className="w-full max-w-xs text-destructive" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
