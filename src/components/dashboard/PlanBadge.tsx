import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Star } from "lucide-react";

interface PlanBadgeProps {
  planName: string;
  isTrial?: boolean;
}

export function PlanBadge({ planName, isTrial }: PlanBadgeProps) {
  if (isTrial || planName === "free_trial") {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
        <Zap className="h-3 w-3 mr-1" /> Free Trial
      </Badge>
    );
  }
  if (planName === "pro") {
    return (
      <Badge className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-600 border-amber-500/20 text-xs">
        <Crown className="h-3 w-3 mr-1" /> Pro
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      <Star className="h-3 w-3 mr-1" /> Basic
    </Badge>
  );
}
