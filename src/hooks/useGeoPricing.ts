import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PricingData {
  plan_name: string;
  region: string;
  currency: string;
  currency_symbol: string;
  monthly_price: number;
  yearly_price: number | null;
}

interface GeoPricingResult {
  region: string;
  currency: string;
  currencySymbol: string;
  basicPrice: number;
  proPrice: number;
  loading: boolean;
  prices: PricingData[];
}

export function useGeoPricing(): GeoPricingResult {
  const [region, setRegion] = useState<string>("global");
  const [prices, setPrices] = useState<PricingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectRegion();
    fetchPrices();
  }, []);

  const detectRegion = async () => {
    // Check localStorage first
    const cached = localStorage.getItem("sp_region");
    if (cached) {
      setRegion(cached);
      return;
    }

    try {
      const res = await fetch("https://ip-api.com/json/?fields=countryCode");
      const data = await res.json();
      const detected = data.countryCode === "IN" ? "india" : "global";
      setRegion(detected);
      localStorage.setItem("sp_region", detected);
    } catch {
      setRegion("global");
    }
  };

  const fetchPrices = async () => {
    const { data } = await supabase
      .from("geo_pricing")
      .select("*");
    if (data) setPrices(data as PricingData[]);
    setLoading(false);
  };

  const regionPrices = prices.filter(p => p.region === region);
  const basicPrice = regionPrices.find(p => p.plan_name === "basic")?.monthly_price || 0;
  const proPrice = regionPrices.find(p => p.plan_name === "pro")?.monthly_price || 0;
  const currency = regionPrices[0]?.currency || (region === "india" ? "INR" : "USD");
  const currencySymbol = regionPrices[0]?.currency_symbol || (region === "india" ? "₹" : "$");

  return { region, currency, currencySymbol, basicPrice, proPrice, loading, prices };
}
