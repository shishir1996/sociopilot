import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Zap, X } from "lucide-react";

interface UpgradePromptProps {
  type: "trial_limit" | "trial_generated" | "trial_expiring" | "trial_expired" | "basic_limit" | "pro_feature";
  message: string;
  daysLeft?: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function UpgradePrompt({ type, message, daysLeft, onUpgrade, onDismiss }: UpgradePromptProps) {
  if (type === "trial_expired") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-elevated">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Your Trial Has Ended</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="space-y-2">
              <Button onClick={onUpgrade} className="w-full gradient-primary border-0">
                <Crown className="h-4 w-4 mr-2" /> Upgrade to Pro
              </Button>
              <Button variant="outline" onClick={onUpgrade} className="w-full">
                Continue with Basic
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === "trial_expiring") {
    return (
      <div className="relative bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Your free trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}.</span>{" "}
            Upgrade to keep generating content.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={onUpgrade} className="gradient-primary border-0 text-xs">
            <Crown className="h-3 w-3 mr-1" /> Upgrade
          </Button>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 shadow-card bg-primary/5">
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            {type === "trial_generated" ? (
              <Zap className="h-5 w-5 text-primary-foreground" />
            ) : (
              <Lock className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={onUpgrade} className="gradient-primary border-0 text-xs">
            <Crown className="h-3 w-3 mr-1" /> Upgrade to Pro
          </Button>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
