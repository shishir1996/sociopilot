import { useOnboarding } from "@/contexts/OnboardingContext";

const PLANS = [
  {
    id: "free_trial",
    name: "Free Trial",
    desc: "7 days — no card required",
    icon: "⚡",
    features: ["7 posts/week", "1 platform/day", "Weekly auto-generation", "Basic AI", "Email support"],
    gradient: "from-emerald-500/20 to-teal-600/20",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "basic",
    name: "Basic",
    desc: "For individual creators",
    icon: "✨",
    features: ["7 posts/week", "1 platform/day", "Weekly auto-generation", "2 regenerations/week", "Standard images", "Email support"],
    gradient: "from-blue-500/20 to-cyan-600/20",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For growing businesses",
    icon: "👑",
    features: ["Up to 4 posts/day", "Multi-platform posting", "Weekly auto-generation", "20 regenerations/month", "Advanced tone control", "Custom prompts", "Premium images", "Priority support"],
    gradient: "from-purple-500/20 to-violet-600/20",
    border: "border-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
  },
];

export default function SetupPlan() {
  const { selectedPlan, setSelectedPlan } = useOnboarding();

  return (
    <div className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <span className="text-2xl text-purple-400">👑</span>
        </div>
        <h3 className="text-xl font-bold text-foreground">Choose Your Plan</h3>
        <p className="text-sm text-muted-foreground mt-1">Start free for 7 days — no credit card needed</p>
      </div>

      <div className="grid gap-3">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all duration-300 card-3d-float ${
                isSelected
                  ? `bg-gradient-to-r ${plan.gradient} ${plan.border} shadow-lg`
                  : "border-border/40 bg-background/30 hover:border-foreground/20 hover:bg-accent/20"
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${plan.iconBg} ${
                  isSelected ? "shadow-md" : ""
                }`}>
                  <span className="text-lg">{plan.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    {plan.id === "pro" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-[10px] font-semibold text-purple-400 border border-purple-500/30">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{plan.desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {plan.features.map((f) => (
                      <span key={f} className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <span className="text-emerald-500 text-xs">✓</span> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedPlan !== "free_trial" && (
        <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/5 border border-purple-500/20 px-4 py-3 text-sm text-foreground/80 flex items-center gap-2">
          <span className="text-purple-400 text-base">✨</span>
          You're eligible for a <strong className="text-purple-400 mx-1">7-day free trial</strong> of the {selectedPlan === "basic" ? "Basic" : "Pro"} plan.
        </div>
      )}
    </div>
  );
}
