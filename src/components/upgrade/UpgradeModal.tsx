import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Lock, Zap, Sparkles } from "lucide-react";
import { useGeoPricing } from "@/hooks/useGeoPricing";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: (plan: "basic" | "pro") => void;
  trigger?: string;
}

const BASIC_FEATURES = [
  "7 posts per week",
  "1 platform per day",
  "Standard AI generation",
  "Basic image styles",
];

const PRO_FEATURES = [
  "Up to 4 posts per day",
  "Multi-platform posting",
  "Advanced tone control",
  "Custom prompts",
  "Premium images",
  "Content variations",
  "Priority generation",
];

export function UpgradeModal({ open, onClose, onUpgrade, trigger }: UpgradeModalProps) {
  const { currencySymbol, basicPrice, proPrice, loading } = useGeoPricing();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {trigger === "multi_platform"
              ? "Unlock Multi-Platform Posting 🚀"
              : "Upgrade Your Plan 🚀"}
          </DialogTitle>
          <DialogDescription>
            {trigger === "multi_platform"
              ? "Post on Instagram, Facebook, LinkedIn & Twitter in one click"
              : "Choose a plan to unlock more features"}
          </DialogDescription>
        </DialogHeader>

        {!loading && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {/* Basic */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Basic</h3>
                <Badge variant="outline">Starter</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currencySymbol}{basicPrice}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-2">
                {BASIC_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => onUpgrade("basic")}>
                Continue with Basic
              </Button>
            </div>

            {/* Pro */}
            <div className="rounded-xl border-2 border-primary p-4 space-y-3 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="gradient-primary border-0 text-primary-foreground text-xs">
                  <Crown className="h-3 w-3 mr-1" /> Recommended
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Pro</h3>
                <Badge className="bg-primary/10 text-primary border-primary/20">Popular</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currencySymbol}{proPrice}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-2">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full gradient-primary border-0" onClick={() => onUpgrade("pro")}>
                <Crown className="h-4 w-4 mr-1" /> Upgrade to Pro
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
