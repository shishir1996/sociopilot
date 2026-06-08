import { Share2, Check, Zap } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

export default function SetupPublish() {
  const { connectedList, pubPlatforms, setPubPlatforms, planIsPro, selectedPlan } = useOnboarding();
  const isPro = planIsPro || selectedPlan === "pro";

  return (
    <div className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Share2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Publishing Setup</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isPro
            ? "Choose one or more platforms for automated publishing."
            : "Choose a platform. Upgrade to Pro for multi-platform."}
        </p>
      </div>

      {connectedList.length === 0 ? (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 px-5 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <Share2 className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm text-foreground/80 font-medium mb-1">No platforms connected yet</p>
          <p className="text-xs text-muted-foreground/60">Go back to Connect step and link at least one platform.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {connectedList.map((p) => {
            const selected = pubPlatforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (isPro) {
                    setPubPlatforms((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                    );
                  } else {
                    setPubPlatforms([p]);
                  }
                }}
                className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-300 card-3d-float ${
                  selected
                    ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 shadow-md"
                    : "border-border/40 bg-background/30 hover:border-foreground/20 hover:bg-accent/20"
                }`}
              >
                <span className="capitalize font-medium text-foreground/90">{p}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected ? "border-emerald-500 bg-emerald-500" : "border-border/50"
                }`}>
                  {selected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!isPro && connectedList.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 px-4 py-2.5 text-xs text-muted-foreground/70 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          On Free/Basic, the selected platform is used for all scheduled posts.
        </div>
      )}
    </div>
  );
}
