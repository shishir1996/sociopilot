import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, Globe, MessageSquare, Palette, BarChart3, Antenna,
  ArrowRight, Check, Star, ChevronRight, Play,
  Facebook, Instagram, Linkedin, Twitter
} from "lucide-react";
import PricingSection from "@/components/landing/PricingSection";
import { LegalFooter } from "@/components/legal/LegalPageLayout";
import { useScrollReveal, useScrollPosition } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: "up" | "scale" | "left";
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const variantClass =
    variant === "scale" ? "reveal-scale" : variant === "left" ? "reveal-left" : "reveal";
  const style: CSSProperties = delay ? { transitionDelay: `${delay}ms` } : {};
  const Component = Tag as any;
  return (
    <Component
      ref={ref as any}
      style={style}
      className={cn(variantClass, isVisible && "is-visible", className)}
    >
      {children}
    </Component>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const scrolled = useScrollPosition(20);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sticky Glass Navigation */}
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500",
          scrolled
            ? "glass-strong shadow-card"
            : "bg-background/40 backdrop-blur-md border-b border-transparent"
        )}
      >
        <div
          className={cn(
            "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500",
            scrolled ? "h-14" : "h-16"
          )}
        >
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-glow">
              <Antenna className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">Growvix <span className="text-muted-foreground font-medium">By Offdx</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How it Works" },
              { href: "#pricing", label: "Pricing" },
              { href: "#testimonials", label: "Testimonials" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm text-muted-foreground hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-px after:bg-gradient-to-r after:from-primary after:to-accent after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary border-0 btn-shine shadow-glow hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5">
              Get Started <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient gradient glows */}
        <div className="ambient-glow w-[520px] h-[520px] -top-32 -left-24 bg-primary/30 animate-float-slow" aria-hidden />
        <div className="ambient-glow w-[480px] h-[480px] top-20 -right-24 bg-accent/30 animate-float-slow" style={{ animationDelay: "2s" }} aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08),transparent_60%)] pointer-events-none" aria-hidden />

        <div className="relative max-w-7xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-primary text-sm font-medium mb-6 hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-4 w-4" />
              AI-Powered Social Media Automation
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.05]">
              Run Your Social Media on{" "}
              <span className="gradient-text">Autopilot — Growvix</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create, schedule, publish, and manage content across all platforms with AI.
              Auto-replies, engagement handling, and analytics — all in one place.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gradient-primary border-0 h-14 px-10 text-lg shadow-glow btn-shine transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                Start Free Trial in 10 Seconds <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base hover-lift glass">
                <Play className="h-4 w-4 mr-2" /> Watch Demo
              </Button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> 7-day trial</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Cancel anytime</span>
            </div>
          </Reveal>

          {/* Platform Icons */}
          <Reveal delay={400}>
            <div className="mt-12 flex items-center justify-center gap-4">
            {[
              { icon: Facebook, label: "Facebook" },
              { icon: Instagram, label: "Instagram" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Twitter, label: "X" },
              { icon: Globe, label: "Google Business" },
            ].map((p, i) => (
              <div
                key={p.label}
                style={{ transitionDelay: `${i * 60}ms` }}
                className="w-12 h-12 rounded-xl glass flex items-center justify-center shadow-card hover:shadow-glow hover:-translate-y-1 hover:text-primary transition-all duration-300"
              >
                <p.icon className="h-5 w-5 text-muted-foreground transition-colors" />
              </div>
            ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <Reveal variant="scale" className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-elevated overflow-hidden hover-lift">
            <div className="bg-foreground/5 px-4 py-3 flex items-center gap-2 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="ml-4 text-xs text-muted-foreground">app.growvix.com</span>
            </div>
            <div className="flex min-h-[400px]">
              {/* Mock Sidebar */}
              <div className="w-56 bg-foreground p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-primary-foreground">Growvix</span>
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
        </Reveal>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Everything you need to <span className="gradient-text">automate social</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From content creation to engagement — Growvix handles it all with AI intelligence.
            </p>
          </Reveal>
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
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80} className="group">
                <div className="relative h-full bg-card border border-border rounded-2xl p-6 hover-lift hover:border-primary/30 overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/0 group-hover:bg-primary/5 transition-all duration-500 blur-2xl" />
                  <div className={`relative w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="relative text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="relative text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-muted/40 overflow-hidden">
        <div className="ambient-glow w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/10" aria-hidden />
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Four steps to <span className="gradient-text">social media freedom</span>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Connect Accounts", desc: "Link your social media platforms in one click." },
              { step: "02", title: "AI Generates Content", desc: "Our AI creates tailored posts for each platform." },
              { step: "03", title: "Auto Publish", desc: "Content gets scheduled and published automatically." },
              { step: "04", title: "Engage Automatically", desc: "AI handles comments, replies, and engagement." },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 120} className="text-center group">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
                  <span className="text-xl font-bold text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Loved by <span className="gradient-text">businesses</span> everywhere
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Founder, LocalBites",
                text: "Growvix saves me 15+ hours a week. The AI content is better than what I was writing myself!",
                rating: 5,
              },
              {
                name: "Marcus Rodriguez",
                role: "Marketing Agency Owner",
                text: "We manage 20+ clients with Growvix. The multi-platform posting and auto-replies are game changers.",
                rating: 5,
              },
              {
                name: "Priya Patel",
                role: "E-commerce Entrepreneur",
                text: "Our engagement went up 300% in the first month. The AI understands our brand voice perfectly.",
                rating: 5,
              },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="h-full bg-card border border-border rounded-2xl p-6 hover-lift hover:border-primary/30">
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <Reveal variant="scale" className="max-w-4xl mx-auto">
          <div className="relative gradient-primary rounded-3xl p-12 sm:p-16 text-center overflow-hidden shadow-glow">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(0_0%_100%/0.18),transparent_60%)]" aria-hidden />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float-slow" aria-hidden />
            <h2 className="relative text-3xl sm:text-5xl font-extrabold tracking-tight text-primary-foreground mb-4">
              Start automating your business today
            </h2>
            <p className="relative text-lg text-primary-foreground/85 mb-8 max-w-xl mx-auto">
              Join thousands of businesses using AI to grow their social media presence on autopilot.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base font-semibold btn-shine transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
              >
                Get Started <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <LegalFooter />
    </div>
  );
}
