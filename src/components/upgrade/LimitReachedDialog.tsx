import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Package, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LimitReachedDialogProps {
  open: boolean;
  onClose: () => void;
  type: "product" | "platform";
  current: number;
  limit: number;
  planName: string;
}

export function LimitReachedDialog({ open, onClose, type, current, limit, planName }: LimitReachedDialogProps) {
  const navigate = useNavigate();
  const Icon = type === "product" ? Package : Globe;
  const label = type === "product" ? "Products" : "Platforms";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Plan Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            You've reached your plan limit. Upgrade to unlock more products and platforms.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 border border-border p-4 my-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{label} used</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {current} / {limit}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Current plan: <span className="font-medium capitalize">{planName.replace("_", " ")}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full gradient-primary border-0"
            onClick={() => {
              onClose();
              navigate("/pricing");
            }}
          >
            <Crown className="h-4 w-4 mr-2" /> View Upgrade Options
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
