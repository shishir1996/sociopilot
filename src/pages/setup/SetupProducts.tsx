import { Palette, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOnboarding } from "@/contexts/OnboardingContext";

export default function SetupProducts() {
  const { form, updateField } = useOnboarding();

  return (
    <div className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Palette className="h-7 w-7 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Product & Service Info</h3>
        <p className="text-sm text-muted-foreground mt-1">Help us understand what you offer</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">What do you offer?</Label>
        <Textarea
          value={form.products_services}
          onChange={(e) => updateField("products_services", e.target.value)}
          placeholder="Describe your products or services..."
          rows={3}
          className="bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Key Features / USP</Label>
        <Textarea
          value={form.main_offers}
          onChange={(e) => updateField("main_offers", e.target.value)}
          placeholder="What makes you unique?"
          rows={2}
          className="bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Location (optional)</Label>
        <div className="relative group">
          <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-purple-400 transition-colors" />
          <Input
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="City, region, or global"
            className="h-11 pl-10 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
