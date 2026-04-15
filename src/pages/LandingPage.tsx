import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, Globe, MessageSquare, Palette, BarChart3, Antenna,
  ArrowRight, Check, Star, ChevronRight, Play,
  Facebook, Instagram, Linkedin, Twitter
} from "lucide-react";
import PricingSection from "@/components/landing/PricingSection";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Antenna className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-primary shadow-none">SocioPilot By Offdx</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary border-0">
              Get Started <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Social Media Automation
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
            Run Your Social Media on{" "}
            <span className="gradient-text">Autopilot - SocioPilot</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create, schedule, publish, and manage content across all platforms with AI.
            Auto-replies, engagement handling, and analytics — all in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary border-0 h-14 px-10 text-lg shadow-glow">
              Start Free Trial in 10 Seconds <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              <Play className="h-4 w-4 mr-2" /> Watch Demo
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> 7-day trial</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Cancel anytime</span>
          </div>

          {/* Platform Icons */}
          <div className="mt-12 flex items-center justify-center gap-4">
            {[
              { icon: Facebook, label: "Facebook" },
              { icon: Instagram, label: "Instagram" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Twitter, label: "X" },
              { icon: Globe, label: "Google Business" },
            ].map((p) => (
              <div key={p.label} className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shadow-card hover:shadow-elevated transition-shadow text-success-foreground bg-primary-foreground">
                <p.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
            <div className="bg-foreground/5 px-4 py-3 flex items-center gap-2 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="ml-4 text-xs text-muted-foreground">app.sociopilot.com</span>
            </div>
            <div className="flex min-h-[400px]">
              {/* Mock Sidebar */}
              <div className="w-56 bg-foreground p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-primary-foreground">SocioPilot</span>
                </div>
                {["Dashboard", "Content", "Calendar", "Analytics", "Inbox", "Settings"].map((item, i) => (
                  <div key={item} className={`px-3 py-2 rounded-lg text-sm mb-1 ${i === 0 ? "bg-primary/20 text-primary" : "text-muted-foreground/60 hover:text-muted-foreground/80"}`}>
                    {item}
                  </div>
                ))}
              </div>
              {/* Mock Content */}
              <div className="flex-1 p-6 bg-background">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Scheduled Posts", value: "24", color: "text-primary" },
                    { label: "Engagement Rate", value: "4.8%", color: "text-success" },
                    { label: "AI Generated", value: "156", color: "text-accent" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">Upcoming Posts</p>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                          <div className="h-2 bg-muted rounded w-1/2" />
                        </div>
                        <div className="text-xs text-muted-foreground">Today</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">AI Content Preview</p>
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                        <Sparkles className="h-3 w-3" /> AI Generated
                      </div>
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="flex gap-2 mt-3">
                        {["#marketing", "#growth", "#ai"].map((tag) => (
                          <span key={tag} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Everything you need to <span className="gradient-text">automate social</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From content creation to engagement — SocioPilot handles it all with AI intelligence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "AI Content Creation",
                description: "Generate platform-optimized posts, captions, hashtags, and hooks with a single click.",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: Globe,
                title: "Multi-Platform Posting",
                description: "Publish across Facebook, Instagram, LinkedIn, X, and Google Business Profile simultaneously.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: MessageSquare,
                title: "Auto Comments & Replies",
                description: "AI automatically responds to comments and messages with contextual, on-brand replies.",
                color: "text-success",
                bg: "bg-success/10",
              },
              {
                icon: Palette,
                title: "Content Personalization",
                description: "Tailor content to your brand voice, industry, and target audience automatically.",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Track engagement, growth, and content performance with real-time analytics.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Zap,
                title: "GMB Management",
                description: "Manage Google Business Profile posts, reviews, and updates from one dashboard.",
                color: "text-success",
                bg: "bg-success/10",
              },
            ].map((feature) => (
              <div key={feature.title} className="group bg-card border border-border rounded-2xl p-6 hover:shadow-elevated transition-all hover:border-primary/20">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Four steps to <span className="gradient-text">social media freedom</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Connect Accounts", desc: "Link your social media platforms in one click." },
              { step: "02", title: "AI Generates Content", desc: "Our AI creates tailored posts for each platform." },
              { step: "03", title: "Auto Publish", desc: "Content gets scheduled and published automatically." },
              { step: "04", title: "Engage Automatically", desc: "AI handles comments, replies, and engagement." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <span className="text-xl font-bold text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Loved by <span className="gradient-text">businesses</span> everywhere
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Founder, LocalBites",
                text: "SocioPilot saves me 15+ hours a week. The AI content is better than what I was writing myself!",
                rating: 5,
              },
              {
                name: "Marcus Rodriguez",
                role: "Marketing Agency Owner",
                text: "We manage 20+ clients with SocioPilot. The multi-platform posting and auto-replies are game changers.",
                rating: 5,
              },
              {
                name: "Priya Patel",
                role: "E-commerce Entrepreneur",
                text: "Our engagement went up 300% in the first month. The AI understands our brand voice perfectly.",
                rating: 5,
              },
            ].map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto gradient-primary rounded-3xl p-12 sm:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-4">
            Start automating your business today
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of businesses using AI to grow their social media presence on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base font-semibold"
            >
              Get Started <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">SocioPilot</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 SocioPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
