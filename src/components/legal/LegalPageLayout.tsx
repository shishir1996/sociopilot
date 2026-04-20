import { ReactNode, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Antenna, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
  children: ReactNode;
}

const FOOTER_LINKS = [
  { label: "About Us", to: "/about" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Refund Policy", to: "/refund-policy" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Disclaimer", to: "/disclaimer" },
];

export default function LegalPageLayout({
  title,
  subtitle,
  icon,
  metaTitle,
  metaDescription,
  children,
}: LegalPageLayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (metaTitle) document.title = metaTitle;
    if (metaDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", metaDescription);
    }
    // canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
    window.scrollTo(0, 0);
  }, [metaTitle, metaDescription]);

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Sticky Header */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover-scale">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Antenna className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-primary">SocioPilot By Offdx</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors story-link"
              >
                {l.label}
              </Link>
            ))}
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top left, hsl(var(--primary) / 0.12), transparent 50%), radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.12), transparent 50%)",
          }}
        />
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] items-center gap-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5 border border-primary/20">
              Legal & Information
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              <span className="gradient-text">{title}</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
          </div>
          <div className="hidden md:flex w-32 h-32 lg:w-40 lg:h-40 rounded-3xl gradient-primary items-center justify-center shadow-glow">
            <div className="text-primary-foreground [&>svg]:w-16 [&>svg]:h-16 lg:[&>svg]:w-20 lg:[&>svg]:h-20">
              {icon}
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.4), transparent)",
          }}
        />
      </div>

      {/* Content */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <article
            className="prose prose-slate max-w-none
              [&>h2]:text-2xl [&>h2]:sm:text-3xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:tracking-tight
              [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-8 [&>h3]:mb-3
              [&>p]:text-base [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4
              [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:text-muted-foreground [&>ul]:space-y-2 [&>ul]:mb-4
              [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:text-muted-foreground [&>ol]:space-y-2 [&>ol]:mb-4
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline"
          >
            {children}
          </article>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-14 text-center gradient-primary shadow-elevated">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground mb-3">
            Ready to put your social media on autopilot?
          </h2>
          <p className="text-primary-foreground/80 mb-7 max-w-xl mx-auto">
            Join thousands of businesses growing with SocioPilot's AI-powered content engine.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base font-semibold hover-scale"
          >
            Start Free Trial <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Global Footer */}
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card/30 py-12 px-4 sm:px-6 lg:px-8 mt-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Antenna className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold text-foreground">SocioPilot By Offdx</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered social media automation for modern businesses.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Contact</h4>
            <p className="text-sm text-muted-foreground">
              Support:{" "}
              <a
                href="mailto:support@sociopilot.in"
                className="text-primary hover:underline"
              >
                support@sociopilot.in
              </a>
            </p>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SocioPilot By Offdx. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
