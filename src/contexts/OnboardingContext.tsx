import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FormState {
  name: string;
  industry: string;
  target_audience: string;
  goals: string[];
  brand_tone: string;
  products_services: string;
  main_offers: string;
  location: string;
  timezone: string;
}

interface OnboardingContextValue {
  form: FormState;
  updateField: (field: string, value: any) => void;
  toggleGoal: (goal: string) => void;
  connectedAccounts: any[];
  connectedCount: number;
  connectedList: string[];
  enabledPlatforms: string[];
  pubPlatforms: string[];
  setPubPlatforms: (v: string[] | ((prev: string[]) => string[])) => void;
  selectedPlan: string;
  setSelectedPlan: (v: string) => void;
  planIsPro: boolean;
  loading: boolean;
  loadEnabledPlatforms: () => Promise<void>;
  toggleLinkedInPage: (accountId: string, urn: string, enabled: boolean) => Promise<void>;
  handleConnectPlatform: (platformId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectedList, setConnectedList] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [pubPlatforms, setPubPlatforms] = useState<string[]>([]);
  const [planIsPro, setPlanIsPro] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free_trial");

  const [form, setForm] = useState<FormState>({
    name: "",
    industry: "",
    target_audience: "",
    goals: [],
    brand_tone: "",
    products_services: "",
    main_offers: "",
    location: "",
    timezone: "Asia/Kolkata",
  });

  const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));
  const toggleGoal = (goal: string) => {
    setForm((p) => ({
      ...p,
      goals: p.goals.includes(goal) ? p.goals.filter((g) => g !== goal) : [...p.goals, goal],
    }));
  };

  const loadEnabledPlatforms = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke("social-oauth", {
        body: { action: "check_platforms" },
      });
      setEnabledPlatforms(data?.platforms || []);
    } catch {
      setEnabledPlatforms([]);
    }
    try {
      const { data: biz } = await supabase
        .from("businesses").select("id").eq("user_id", user.id).maybeSingle();
      if (biz) {
        const { data: accts, count } = await supabase
          .from("social_accounts")
          .select("id, platform, pages, account_name, account_id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("business_id", biz.id) as any;
        setConnectedCount(count || 0);
        setConnectedList((accts || []).map((a: any) => a.platform));
        setConnectedAccounts(accts || []);
      }
      const { data: sub } = await supabase
        .from("subscriptions").select("plan_name").eq("user_id", user.id).maybeSingle() as any;
      setPlanIsPro((sub?.plan_name || "").toLowerCase() === "pro");
    } catch {
      // Silently handled
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadEnabledPlatforms().catch(console.error);
  }, [user, loadEnabledPlatforms]);

  const toggleLinkedInPage = async (accountId: string, urn: string, enabled: boolean) => {
    const nextAccounts = connectedAccounts.map((acc) => {
      if (acc.id !== accountId) return acc;
      const nextPages = (acc.pages || []).map((p: any) =>
        p.urn === urn ? { ...p, enabled } : p
      );
      return { ...acc, pages: nextPages };
    });
    setConnectedAccounts(nextAccounts);
    try {
      const account = nextAccounts.find((a) => a.id === accountId);
      await supabase.functions.invoke("social-oauth", {
        body: { action: "update_linkedin_pages", social_account_id: accountId, pages: account?.pages || [] },
      });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      loadEnabledPlatforms();
    }
  };

  const handleConnectPlatform = async (platformId: string) => {
    if (!user) return;
    if (!enabledPlatforms.includes(platformId === "instagram" ? "facebook" : platformId)) {
      toast({
        title: "Platform not available",
        description: "Platform setup is not available yet. Please contact admin.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      let businessId: string | null = null;
      const { data: existing } = await supabase
        .from("businesses").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        businessId = existing.id;
      } else {
        const { data, error } = await supabase.from("businesses").insert({
          user_id: user.id, name: form.name, industry: form.industry,
          target_audience: form.target_audience, goals: form.goals,
          brand_tone: form.brand_tone, products_services: form.products_services,
          main_offers: form.main_offers, location: form.location, timezone: form.timezone,
        } as any).select("id").single();
        if (error) throw error;
        businessId = data!.id;
      }

      const platform = platformId === "instagram" ? "facebook" : platformId;
      const redirectUri = `${window.location.origin}/settings`;
      const { data, error } = await supabase.functions.invoke("social-oauth", {
        body: { action: "get_oauth_url", platform, redirect_uri: redirectUri, business_id: businessId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const createSubscription = async (plan: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
        body: { plan_name: plan, billing_period: "monthly", region: "global" },
      });
      if (error) throw error;
      if (data?.short_url) {
        navigate(`/account?plan=${plan}&from=onboarding`, { replace: true });
      }
      return data;
    } catch (err: any) {
      console.error("[Onboarding] Subscription creation failed:", err);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!form.name.trim()) {
      toast({
        title: "Business name required",
        description: "Please go back and enter your business name.",
        variant: "destructive",
      });
      navigate("/setup/business", { replace: true });
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("businesses").update({
          name: form.name,
          industry: form.industry,
          target_audience: form.target_audience,
          goals: form.goals,
          brand_tone: form.brand_tone,
          products_services: form.products_services,
          main_offers: form.main_offers,
          location: form.location,
          timezone: form.timezone,
          publishing_platforms: pubPlatforms,
        } as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("businesses").insert({
          user_id: user.id,
          name: form.name,
          industry: form.industry,
          target_audience: form.target_audience,
          goals: form.goals,
          brand_tone: form.brand_tone,
          products_services: form.products_services,
          main_offers: form.main_offers,
          location: form.location,
          timezone: form.timezone,
          publishing_platforms: pubPlatforms,
        } as any);
        if (error) throw error;
      }

      if (selectedPlan !== "free_trial") {
        await createSubscription(selectedPlan);
      }

      toast({ title: "You're all set!", description: "Head to your dashboard to generate your first content." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "Setup failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        form, updateField, toggleGoal,
        connectedAccounts, connectedCount, connectedList,
        enabledPlatforms, pubPlatforms, setPubPlatforms,
        selectedPlan, setSelectedPlan, planIsPro,
        loading, loadEnabledPlatforms,
        toggleLinkedInPage, handleConnectPlatform, handleSubmit,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
