import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogOut, Building2, Sparkles, Settings, UserCog,
  Zap, BarChart3, LayoutDashboard, Calendar, Globe, ImageIcon, Crown, ChevronDown, Lightbulb, TrendingUp,
  Menu, X, Instagram, Facebook, Linkedin, Twitter,
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
      const { data: accounts } = await supabase.from("social_accounts").select("platform").eq("business_id", businessId) as any;
      const connected = (accounts || []).map((a: any) => a.platform);
      const { data: items } = await supabase.from("content_items").select("status").eq("user_id", userId).order("created_at", { ascending: false }).limit(50) as any;
      const posted = (items || []).filter((i: any) => i.status === "posted").length;
      const draft = (items || []).filter((i: any) => i.status === "draft").length;
      if (connected.length === 0) result.push({ icon: Globe, title: "Connect your first platform", desc: "Link your social media accounts to start publishing.", action: "Connect Now", route: "/settings" });
      if (connected.length > 0 && draft > 3) result.push({ icon: Sparkles, title: `${draft} posts ready to publish`, desc: "You have unpublished content waiting.", action: "View Content", route: "/content" });
      if (connected.length > 0 && posted > 0) result.push({ icon: TrendingUp, title: `${posted} posts published`, desc: "Your content is live! Check analytics.", action: "View Analytics", route: "/content" });
      if (connected.includes("linkedin") && !connected.includes("facebook") && !connected.includes("instagram")) result.push({ icon: Lightbulb, title: "Cross-platform tip", desc: "Connect more platforms to maximize reach.", action: "Connect More", route: "/settings" });
      setInsights(result);
    };
    fetchInsights();
  }, [businessId]);

  if (insights.length === 0) return null;
  return (
    <div className="mb-6 space-y-2 stagger-enter">
      {insights.slice(0, 2).map((insight, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            <insight.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{insight.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{insight.desc}</p>
          </div>
          {insight.action && insight.route && (
            <Button size="sm" variant="outline" className="text-xs h-7 flex-shrink-0 btn-shine" onClick={() => nav(insight.route!)}>
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

  useEffect(() => { fetchBusinesses(); }, [user]);

  const fetchBusinesses = async () => {
    if (!user) return;
    const { data } = await supabase.from("businesses").select("id, name, industry, platforms").eq("user_id", user.id) as any;
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0].id);
      const { data: logoData } = await supabase.from("brand_assets").select("file_url").eq("business_id", data[0].id).eq("asset_type", "logo").order("created_at", { ascending: false }).limit(1);
      if (logoData && logoData.length > 0) setLogoUrl(logoData[0].file_url);
    }
    const { data: subData } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).limit(1);
    if (subData && subData.length > 0) setSubscription(subData[0]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <Zap className="w-5 h-5 absolute inset-0 m-auto text-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="mesh-gradient-1 absolute inset-0" />
        <Card className="max-w-md w-full text-center border-border relative z-10 card-3d-float">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-glow">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold gradient-text-blue">Set Up Your Business</h2>
            <p className="text-sm text-muted-foreground">Tell us about your business so we can create the perfect content strategy.</p>
            <Button onClick={() => navigate("/setup")} className="w-full gradient-primary border-0 btn-shine">
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
        <aside className={`${sidebarOpen ? "w-60" : "w-16"} bg-gradient-to-b from-foreground to-[#1a1f2e] transition-all duration-300 flex flex-col hidden md:flex relative z-20`}>
          <div className="mesh-gradient-dark absolute inset-0 opacity-30 pointer-events-none" />
          <div className="p-4 flex items-center gap-2 relative z-10">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-2 ring-primary/20" />
            ) : (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                <Zap className="h-4 w-4 text-white" />
              </div>
            )}
            {sidebarOpen && <span className="text-sm font-bold text-white gradient-text-anim">Growvix</span>}
          </div>
          <nav className="flex-1 px-2 mt-4 space-y-1 relative z-10">
            {sidebarNav.map((item: any) => {
              const isActive = item.route === "/" ? location.pathname === "/" : location.pathname.startsWith(item.route || "/none");
              return (
                <button key={item.label} onClick={() => item.route && navigate(item.route)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary/30 to-accent/20 text-primary shadow-sm border border-primary/10"
                      : "text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-white/5"
                  }`}>
                  {item.isGmb ? (
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41.6 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
                  ) : (
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  {sidebarOpen && <span>{item.label}</span>}
                  {isActive && sidebarOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/5 relative z-10">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full text-xs text-muted-foreground/40 hover:text-muted-foreground/60 py-1 transition-colors">
              {sidebarOpen ? "← Collapse" : "→"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Nav */}
          <header className="glass-strong h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="md:hidden flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover ring-1 ring-primary/20" />
                ) : (
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <span className="text-sm font-bold gradient-text-anim">Growvix</span>
              </div>
              {selectedBusiness && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:block">{businesses.find((b) => b.id === selectedBusiness)?.name}</span>
                  <PlanBadge planName={subscription?.plan_name || "free_trial"} isTrial={subscription?.is_trial} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1 btn-shine">
                    <Settings className="h-3.5 w-3.5" /> Menu <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => navigate("/pricing")}>
                    <Crown className="h-3.5 w-3.5 mr-2 text-amber-500" /> Plans & Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-auto mesh-gradient-2">
            {/* Floating Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="orb orb-1 -top-20 -left-20" />
              <div className="orb orb-3 -bottom-20 -right-20" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              {/* Welcome Banner */}
              {selectedBusiness && (
                <Card className="gradient-border mb-6 overflow-hidden">
                  <div className="mesh-gradient-1 absolute inset-0" />
                  <CardContent className="pt-5 pb-5 relative z-10">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-bold gradient-text-blue">
                            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
                          </h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {businesses.find(b => b.id === selectedBusiness)?.name || "Your business"} — ready to grow your audience today.
                        </p>
                      </div>
                      <Button onClick={() => navigate("/ai-studio")} size="sm" className="gradient-primary border-0 btn-shine text-xs">
                        <Sparkles className="h-4 w-4 mr-1" /> Generate Content
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trial Banner */}
              <div className="mb-4"><TrialBanner /></div>

              {/* Setup progress */}
              <SetupProgress businessId={selectedBusiness} />

              {/* Usage Indicators */}
              {selectedBusiness && <UsageIndicators businessId={selectedBusiness} />}

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
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold gradient-text-blue">Overview</h2>
                    <p className="text-xs text-muted-foreground">Your content at a glance</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => navigate("/content")} size="sm" variant="outline" className="text-xs btn-shine">
                    <BarChart3 className="h-4 w-4 mr-1" /> View Content
                  </Button>
                </div>
              </div>

              {/* Analytics */}
              {selectedBusiness && <DashboardAnalytics businessId={selectedBusiness} />}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50 flex items-center justify-around px-2 py-1 safe-area-bottom">
        {mobileNav.map((item) => {
          const isActive = item.route === "/" ? location.pathname === "/" : location.pathname.startsWith(item.route || "/none");
          return (
            <button key={item.label} onClick={() => { if (item.route) navigate(item.route); else setMobileMenuOpen(!mobileMenuOpen); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                isActive ? "text-primary scale-110" : "text-muted-foreground/60"
              }`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Zap className="h-8 w-8 text-white" />
            </div>
            {[
              { icon: ImageIcon, label: "Brand Assets", route: "/brand-assets" },
              { icon: Settings, label: "Connected Accounts", route: "/settings" },
              { icon: UserCog, label: "Account Settings", route: "/account" },
            ].map(item => (
              <Button key={item.label} variant="outline" className="w-full max-w-xs" onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}>
                <item.icon className="h-4 w-4 mr-2" /> {item.label}
              </Button>
            ))}
            <Button className="w-full max-w-xs gradient-primary border-0 btn-shine" onClick={() => { navigate("/pricing"); setMobileMenuOpen(false); }}>
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
