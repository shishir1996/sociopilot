import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [impersonation, setImpersonation] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin_impersonation");
    const impParam = searchParams.get("impersonate");
    if (stored || impParam) {
      setImpersonation(stored ? JSON.parse(stored) : { target_user_id: impParam });
    }
  }, [searchParams]);

  if (!impersonation) return null;

  const exitImpersonation = () => {
    localStorage.removeItem("admin_impersonation");
    navigate("/admin");
  };

  return (
    <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
      <Shield className="h-4 w-4" />
      Admin Impersonation Mode — Viewing as {impersonation.target_email || impersonation.target_user_id?.slice(0, 8)}
      <Button
        size="sm"
        variant="outline"
        className="ml-3 h-6 text-xs bg-amber-600 border-amber-700 text-amber-50 hover:bg-amber-700"
        onClick={exitImpersonation}
      >
        <X className="h-3 w-3 mr-1" /> Exit
      </Button>
    </div>
  );
}
