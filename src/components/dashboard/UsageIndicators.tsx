import { Card, CardContent } from "@/components/ui/card";
import { Package, Globe, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface UsageIndicatorsProps {
  businessId: string;
}

export function UsageIndicators({ businessId }: UsageIndicatorsProps) {
  const navigate = useNavigate();
  const {
    productsUsed,
    productLimit,
    platformsConnected,
    platformLimit,
    planName,
    loading,
  } = usePlanLimits(businessId);

  if (loading) return null;

  const productPct = Math.min(100, (productsUsed / Math.max(productLimit, 1)) * 100);
  const platformPct = Math.min(100, (platformsConnected / Math.max(platformLimit, 1)) * 100);
  const productNear = productsUsed >= productLimit;
  const platformNear = platformsConnected >= platformLimit;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <UsageCard
        icon={Package}
        label="Products"
        used={productsUsed}
        limit={productLimit}
        pct={productPct}
        near={productNear}
        onClick={() => navigate("/brand-assets")}
      />
      <UsageCard
        icon={Globe}
        label="Platforms Connected"
        used={platformsConnected}
        limit={platformLimit}
        pct={platformPct}
        near={platformNear}
        onClick={() => navigate("/settings")}
      />
      {(productNear || platformNear) && planName !== "pro" && (
        <div className="sm:col-span-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">You've reached your plan limit.</span>{" "}
            Upgrade to unlock more products and platforms.
          </p>
          <Button size="sm" onClick={() => navigate("/pricing")} className="gradient-primary border-0 flex-shrink-0">
            <Crown className="h-3.5 w-3.5 mr-1" /> Upgrade
          </Button>
        </div>
      )}
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  used,
  limit,
  pct,
  near,
  onClick,
}: {
  icon: any;
  label: string;
  used: number;
  limit: number;
  pct: number;
  near: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <span className={`text-sm font-bold ${near ? "text-destructive" : "text-foreground"}`}>
            {used} / {limit}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${near ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
