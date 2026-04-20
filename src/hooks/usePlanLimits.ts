import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanLimits {
  planName: string;
  productLimit: number;
  platformLimit: number;
  productsUsed: number;
  platformsConnected: number;
  canAddProduct: boolean;
  canAddPlatform: boolean;
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePlanLimits(businessId?: string | null): PlanLimits {
  const { user } = useAuth();
  const [planName, setPlanName] = useState<string>("free_trial");
  const [productLimit, setProductLimit] = useState(1);
  const [platformLimit, setPlatformLimit] = useState(1);
  const [productsUsed, setProductsUsed] = useState(0);
  const [platformsConnected, setPlatformsConnected] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_name, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = (sub?.plan_name as string) || "free_trial";
    setPlanName(plan);

    const { data: limits } = await supabase
      .from("ai_plan_limits")
      .select("product_limit, platform_limit")
      .eq("plan_name", plan)
      .maybeSingle() as any;

    setProductLimit(limits?.product_limit ?? 1);
    setPlatformLimit(limits?.platform_limit ?? 1);

    let bid = businessId;
    if (!bid) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1) as any;
      bid = biz?.[0]?.id || null;
    }

    if (bid) {
      const [{ count: prodCount }, { count: platCount }] = await Promise.all([
        supabase
          .from("brand_assets")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bid)
          .in("asset_type", ["product_image", "service_image"]),
        supabase
          .from("social_accounts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bid),
      ]);
      setProductsUsed(prodCount || 0);
      setPlatformsConnected(platCount || 0);
    } else {
      setProductsUsed(0);
      setPlatformsConnected(0);
    }

    setLoading(false);
  }, [user, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    planName,
    productLimit,
    platformLimit,
    productsUsed,
    platformsConnected,
    canAddProduct: productsUsed < productLimit,
    canAddPlatform: platformsConnected < platformLimit,
    isPro: planName === "pro",
    loading,
    refresh: load,
  };
}
