import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, ArrowLeft, Lock, Sparkles } from "lucide-react";
import { useGeoPricing } from "@/hooks/useGeoPricing";

const TRIAL_FEATURES = [
  "7 posts per week",
  "1 platform per day",
  "1 weekly generation",
  "2 regenerations total",
  "Basic AI generation",
];

const BASIC_FEATURES = [
  "7 posts per week",
  "1 platform per day",
  "Weekly auto-generation",
  "2 regenerations per week",
  "Standard image styles",
  "Email support",
];

const PRO_FEATURES = [
  "Up to 4 posts per day",
  "Multi-platform posting",
  "Weekly auto-generation",
  "20 regenerations per month",
  "Advanced tone control",
  "Custom prompts",
  "Premium images & variations",
  "Priority generation",
  "Priority support",
];

export default function Pricing() {
  const navigate = useNavigate();
  const { currencySymbol, basicPrice, proPrice, loading, region } = useGeoPricing();

  const handleUpgrade = (plan: string) => {
    // Navigate to account with plan param — payment handled there
    navigate(`/account?upgrade=${plan}&region=${region}`);
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
        </div>

        {!loading && (
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Trial */}
            <Card className="shadow-card relative">
              <CardContent className="pt-6 pb-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Free Trial</h3>
                  <p className="text-sm text-muted-foreground">Try everything for 7 days</p>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  Free
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ 7 days</span>
                </div>
                <ul className="space-y-2.5">
                  {TRIAL_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Basic */}
            <Card className="shadow-card relative">
              <CardContent className="pt-6 pb-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Basic</h3>
                  <p className="text-sm text-muted-foreground">For individual creators</p>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {currencySymbol}{basicPrice}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
                </div>
                <ul className="space-y-2.5">
                  {BASIC_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => handleUpgrade("basic")}>
                  Get Basic
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="shadow-elevated border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="gradient-primary border-0 text-primary-foreground px-3">
                  <Crown className="h-3 w-3 mr-1" /> Most Popular
                </Badge>
              </div>
              <CardContent className="pt-6 pb-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Pro</h3>
                  <p className="text-sm text-muted-foreground">For growing businesses</p>
                </div>
                <div className="text-3xl font-bold gradient-text">
                  {currencySymbol}{proPrice}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
                </div>
                <ul className="space-y-2.5">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full gradient-primary border-0" onClick={() => handleUpgrade("pro")}>
                  <Crown className="h-4 w-4 mr-1" /> Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
