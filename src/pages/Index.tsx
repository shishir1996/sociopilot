import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import LandingPage from "./LandingPage";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    checkOnboarding();
    async function checkOnboarding() {
      try {
        // Check user_profiles first, fallback to businesses
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        let needsOnboarding: boolean;
        if (profile !== null) {
          needsOnboarding = !profile.onboarding_completed;
        } else {
          const { data: biz } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          needsOnboarding = biz === null;
        }

        if (needsOnboarding) {
          navigate("/setup/business", { replace: true });
          return;
        }
      } catch {
        // On error, fall through to Dashboard
      }
      setChecking(false);
    }
  }, [user, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return <Dashboard />;
}
