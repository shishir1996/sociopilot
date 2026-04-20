import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Crown, Sparkles, X } from "lucide-react";
import { useGeoPricing } from "@/hooks/useGeoPricing";

const PLANS = [
  {
    key: "trial",
    name: "Free Trial",
    tagline: "Explore for 7 days",
    monthlyMultiplier: 0,
    yearlyMultiplier: 0,
    featured: false,
    cta: "Start Free Trial",
    features: [
      { label: "📦 1 Product", included: true, highlight: true },
      { label: "🌐 1 Platform", included: true, highlight: true },
      { label: "7 posts per week", included: true },
      { label: "1 weekly AI generation", included: true },
      { label: "2 regenerations total", included: true },
      { label: "Basic AI captions", included: true },
      { label: "Multi-platform posting", included: false },
      { label: "Advanced tone control", included: false },
      { label: "Custom prompts", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    key: "basic",
    name: "Basic",
    tagline: "For individual creators",
    featured: true,
    cta: "Upgrade to Basic",
    features: [
      { label: "📦 5 Products", included: true, highlight: true },
      { label: "🌐 2 Platforms", included: true, highlight: true },
      { label: "7 posts per week", included: true },
      { label: "Weekly auto-generation", included: true },
      { label: "2 regenerations / week", included: true },
      { label: "Standard AI captions & images", included: true },
      { label: "Email support", included: true },
      { label: "Custom prompts", included: false },
      { label: "Premium image styles", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For growing businesses",
    featured: false,
    premium: true,
    cta: "Go Pro",
    features: [
      { label: "📦 30 Products", included: true, highlight: true },
      { label: "🌐 5 Platforms (FB, IG, LinkedIn, X + more)", included: true, highlight: true },
      { label: "Up to 4 posts per day", included: true },
      { label: "Multi-platform posting", included: true },
      { label: "Weekly auto-generation", included: true },
      { label: "20 regenerations / month", included: true },
      { label: "Advanced tone control", included: true },
      { label: "Custom prompts", included: true },
      { label: "Premium image styles & variations", included: true },
      { label: "Priority generation & support", included: true },
    ],
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();
  const { currencySymbol, basicPrice, proPrice, loading, region } = useGeoPricing();

  const getPrice = (planKey: string) => {
    if (planKey === "trial") return 0;
    const monthly = planKey === "basic" ? basicPrice : proPrice;
    if (annual) return Math.round(monthly * 10); // 2 months free
    return monthly;
  };

  const getSavings = (planKey: string) => {
    if (planKey === "trial") return 0;
    const monthly = planKey === "basic" ? basicPrice : proPrice;
    return monthly * 2; // 2 months saved
  };

  const handleCta = (planKey: string) => {
    if (planKey === "trial") {
      navigate("/auth");
    } else {
      navigate(`/account?upgrade=${planKey}&region=${region}&billing=${annual ? "annual" : "monthly"}`);
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Simple, <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free for 7 days. No credit card required. Upgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
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

          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {region === "india" ? "🇮🇳 India" : "🌍 Global"} pricing
            </Badge>
          </div>
        </div>

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan: any) => {
              const isPremium = plan.premium;
              const isFeatured = plan.featured;
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl border p-1 transition-all hover:-translate-y-1 ${
                    isFeatured
                      ? "border-primary shadow-glow bg-gradient-to-b from-primary/5 to-transparent"
                      : isPremium
                      ? "border-transparent bg-gradient-to-br from-primary via-accent to-primary shadow-elevated"
                      : "border-border hover:border-primary/30 hover:shadow-elevated"
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="gradient-primary border-0 text-primary-foreground px-4 py-1 text-xs font-semibold shadow-glow">
                        ⭐ Most Popular
                      </Badge>
                    </div>
                  )}
                  {isPremium && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground px-4 py-1 text-xs font-semibold shadow-glow">
                        <Crown className="h-3 w-3 mr-1" /> Premium
                      </Badge>
                    </div>
                  )}

                  <div className="bg-card rounded-xl p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        {isPremium && <Sparkles className="h-4 w-4 text-primary" />}
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.key === "trial" ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-foreground">Free</span>
                          <span className="text-sm text-muted-foreground">/ 7 days</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-extrabold ${isFeatured || isPremium ? "gradient-text" : "text-foreground"}`}>
                              {currencySymbol}{getPrice(plan.key)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              / {annual ? "year" : "month"}
                            </span>
                          </div>
                          {annual && (
                            <p className="text-xs text-success mt-1">
                              Save {currencySymbol}{getSavings(plan.key)} per year
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <Button
                      className={`w-full mb-6 ${
                        isFeatured
                          ? "gradient-primary border-0 shadow-glow"
                          : isPremium
                          ? "bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground shadow-glow hover:opacity-90"
                          : ""
                      }`}
                      variant={isFeatured || isPremium ? "default" : "outline"}
                      onClick={() => handleCta(plan.key)}
                    >
                      {isPremium && <Crown className="h-4 w-4 mr-1" />}
                      {plan.cta}
                    </Button>

                    {/* Features */}
                    <div className="space-y-3 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        What's included
                      </p>
                      {plan.features.map((f: any) => (
                        <div key={f.label} className="flex items-center gap-2.5">
                          {f.included ? (
                            <Check className={`h-4 w-4 flex-shrink-0 ${f.highlight ? "text-primary" : "text-success"}`} />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${
                            f.included
                              ? f.highlight ? "text-foreground font-semibold" : "text-foreground"
                              : "text-muted-foreground/50"
                          }`}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </section>
  );
}
