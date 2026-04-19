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
    // Timezone check (works offline, no CORS, no rate limits)
    const tzIsIndia = (() => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
      } catch { return false; }
    })();

    // Check cache (v2 — invalidates old "global" entries that may have been wrong)
    const CACHE_KEY = "sp_region_v2";
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setRegion(cached);
      return;
    }
    // Clean up old cache key
    localStorage.removeItem("sp_region");

    // Timezone is the most reliable signal for India — trust it immediately
    if (tzIsIndia) {
      setRegion("india");
      localStorage.setItem(CACHE_KEY, "india");
      return;
    }

    // Try multiple geo IP services in order; first success wins.
    const services = [
      { url: "https://ipapi.co/json/", key: "country_code" },
      { url: "https://ipwho.is/", key: "country_code" },
      { url: "https://get.geojs.io/v1/ip/country.json", key: "country" },
    ];

    for (const svc of services) {
      try {
        const res = await fetch(svc.url);
        if (!res.ok) continue;
        const data = await res.json();
        const cc = (data?.[svc.key] || "").toString().toUpperCase();
        if (cc) {
          const detected = cc === "IN" ? "india" : "global";
          setRegion(detected);
          localStorage.setItem("sp_region", detected);
          return;
        }
      } catch { /* try next */ }
    }

    // All services failed → fall back to timezone heuristic
    const detected = tzIsIndia ? "india" : "global";
    setRegion(detected);
    localStorage.setItem("sp_region", detected);
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
