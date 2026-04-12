import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { useNavigate } from "react-router-dom";

export function TrialBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) checkTrial();
  }, [user]);

  const checkTrial = async () => {
    if (!user) return;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!sub || !sub.is_trial) return;

    if (sub.trial_ends_at) {
      const end = new Date(sub.trial_ends_at);
      const now = new Date();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diff <= 0) {
        setExpired(true);
      } else if (diff <= 2) {
        setDaysLeft(diff);
      }
    }
  };

  if (expired) {
    return (
      <UpgradePrompt
        type="trial_expired"
        message="Upgrade to continue using Socio Pilot and keep generating content."
        onUpgrade={() => navigate("/pricing")}
        onDismiss={() => {}}
      />
    );
  }

  if (daysLeft !== null && !dismissed) {
    return (
      <UpgradePrompt
        type="trial_expiring"
        daysLeft={daysLeft}
        message=""
        onUpgrade={() => navigate("/pricing")}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  return null;
}
