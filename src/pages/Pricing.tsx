import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, X, ArrowLeft, Sparkles } from "lucide-react";
import { useGeoPricing } from "@/hooks/useGeoPricing";

const TRIAL_FEATURES = [
  { label: "7 posts per week", included: true },
  { label: "1 platform per day", included: true },
  { label: "1 weekly generation", included: true },
  { label: "2 regenerations total", included: true },
  { label: "Basic AI generation", included: true },
  { label: "Multi-platform posting", included: false },
  { label: "Custom prompts", included: false },
  { label: "Priority support", included: false },
];

const BASIC_FEATURES = [
  { label: "7 posts per week", included: true },
  { label: "1 platform per day", included: true },
  { label: "Weekly auto-generation", included: true },
  { label: "2 regenerations / week", included: true },
  { label: "Standard image styles", included: true },
  { label: "Email support", included: true },
  { label: "Multi-platform posting", included: false },
  { label: "Custom prompts", included: false },
];

const PRO_FEATURES = [
  { label: "Up to 4 posts per day", included: true },
  { label: "Multi-platform posting", included: true },
  { label: "Weekly auto-generation", included: true },
  { label: "20 regenerations / month", included: true },
  { label: "Advanced tone control", included: true },
  { label: "Custom prompts", included: true },
  { label: "Premium images & variations", included: true },
  { label: "Priority generation", included: true },
  { label: "Priority support", included: true },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();
  const { currencySymbol, basicPrice, proPrice, loading, region } = useGeoPricing();

  const getPrice = (plan: string) => {
    const monthly = plan === "basic" ? basicPrice : proPrice;
    if (annual) return Math.round(monthly * 10);
    return monthly;
  };

  const getSavings = (plan: string) => {
    const monthly = plan === "basic" ? basicPrice : proPrice;
    return monthly * 2;
  };

  const handleUpgrade = (plan: string) => {
    navigate(`/account?upgrade=${plan}&region=${region}&billing=${annual ? "annual" : "monthly"}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-heading font-bold text-foreground">Pricing</h1>
          <Badge variant="outline" className="text-xs ml-auto">
            {region === "india" ? "🇮🇳 India" : "🌍 Global"} pricing
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start free for 7 days. No credit card required. Upgrade anytime to unlock more features.
          </p>

          {/* Billing Toggle */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            {annual && (
              <Badge className="bg-success/10 text-success border-success/20 text-xs ml-1">
                Save 2 months
              </Badge>
            )}
          </div>
        </div>

        {!loading && (
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Trial */}
            <div className="rounded-2xl border border-border p-1 hover:border-primary/30 hover:shadow-elevated transition-all">
              <div className="bg-card rounded-xl p-6 h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Free Trial</h3>
                  <p className="text-sm text-muted-foreground">Try everything for 7 days</p>
                </div>
                <div className="text-4xl font-extrabold text-foreground mb-6">
                  Free
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ 7 days</span>
                </div>
                <Button variant="outline" className="w-full mb-6" onClick={() => navigate("/auth")}>
                  Start Free Trial
                </Button>
                <div className="space-y-3 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Includes</p>
                  {TRIAL_FEATURES.map(f => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      {f.included ? (
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Basic */}
            <div className="rounded-2xl border border-border p-1 hover:border-primary/30 hover:shadow-elevated transition-all">
              <div className="bg-card rounded-xl p-6 h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">Basic</h3>
                  <p className="text-sm text-muted-foreground">For individual creators</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                      {currencySymbol}{getPrice("basic")}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {annual ? "year" : "month"}</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-success mt-1">Save {currencySymbol}{getSavings("basic")} per year</p>
                  )}
                </div>
                <Button variant="outline" className="w-full mb-6" onClick={() => handleUpgrade("basic")}>
                  Get Basic
                </Button>
                <div className="space-y-3 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Includes</p>
                  {BASIC_FEATURES.map(f => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      {f.included ? (
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border-2 border-primary p-1 shadow-glow bg-gradient-to-b from-primary/5 to-transparent">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <Badge className="gradient-primary border-0 text-primary-foreground px-4 py-1 text-xs font-semibold shadow-glow">
                  <Crown className="h-3 w-3 mr-1" /> Most Popular
                </Badge>
              </div>
              <div className="bg-card rounded-xl p-6 h-full flex flex-col">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Pro</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">For growing businesses</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold gradient-text">
                      {currencySymbol}{getPrice("pro")}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {annual ? "year" : "month"}</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-success mt-1">Save {currencySymbol}{getSavings("pro")} per year</p>
                  )}
                </div>
                <Button className="w-full gradient-primary border-0 shadow-glow mb-6" onClick={() => handleUpgrade("pro")}>
                  <Crown className="h-4 w-4 mr-1" /> Upgrade to Pro
                </Button>
                <div className="space-y-3 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Everything in Basic, plus</p>
                  {PRO_FEATURES.map(f => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-sm text-foreground">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
