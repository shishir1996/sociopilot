
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/contexts/OnboardingContext";

const GOALS = ["Lead Generation", "Brand Awareness", "Sales & Conversions", "Engagement", "Trust Building", "Local Visibility"];
const TONES = ["Professional", "Casual", "Luxury", "Friendly", "Bold & Viral", "Educational", "Emotional", "Promotional"];

export default function SetupGoals() {
  const { form, updateField, toggleGoal } = useOnboarding();

  return (
    <div className="space-y-6 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <span className="text-2xl text-blue-400">🎯</span>
        </div>
        <h3 className="text-xl font-bold text-foreground">Goals & Brand Tone</h3>
        <p className="text-sm text-muted-foreground mt-1">Define your marketing objectives</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">What are your goals?</Label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <ChipToggle key={g} label={g} active={form.goals.includes(g)} onClick={() => toggleGoal(g)} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Brand Tone</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <ChipToggle key={t} label={t} active={form.brand_tone === t} onClick={() => updateField("brand_tone", form.brand_tone === t ? "" : t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        active
          ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
          : "bg-white/5 text-muted-foreground/60 border-white/10 hover:bg-white/10 hover:text-foreground/80"
      }`}
    >
      {label}
    </button>
  );
}
