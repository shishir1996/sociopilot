import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";
import { useGeoPricing } from "@/hooks/useGeoPricing";

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CreditPacks() {
  const { toast } = useToast();
  const { region, currencySymbol } = useGeoPricing();
  const [packs, setPacks] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("credit_packs").select("*").eq("is_active", true).order("price_inr")
      .then(({ data }) => setPacks(data || []));
  }, []);

  const currency = region === "india" ? "INR" : "USD";

  const buy = async (packId: string) => {
    setBuying(packId);
    const ok = await loadRazorpay();
    if (!ok) { toast({ title: "Could not load checkout", variant: "destructive" }); setBuying(null); return; }
    const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
      body: { pack_id: packId, currency },
    });
    if (error || !data?.ok) {
      toast({ title: "Order failed", description: data?.error || error?.message, variant: "destructive" });
      setBuying(null); return;
    }
    const rzp = new window.Razorpay({
      key: data.key_id,
      order_id: data.order_id,
      amount: data.amount,
      currency: data.currency,
      name: "Growvix",
      description: data.pack_name,
      handler: () => {
        toast({ title: "Payment received", description: "Credits will appear within a minute." });
        setBuying(null);
      },
      modal: { ondismiss: () => setBuying(null) },
      theme: { color: "#2563EB" },
    });
    rzp.open();
  };

  if (!packs.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">One-Time Credit Packs</CardTitle>
        </div>
        <CardDescription>Need more posts this month? Top up without changing your plan.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packs.map((p) => (
          <div key={p.id} className="border border-border rounded-lg p-4 flex flex-col gap-2">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-muted-foreground">
              +{p.posts_added} posts · +{p.credits_added} credits
            </div>
            <div className="text-xl font-bold">
              {currencySymbol}{currency === "INR" ? p.price_inr : p.price_usd}
            </div>
            <Button onClick={() => buy(p.id)} disabled={buying === p.id} className="w-full">
              {buying === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Buy pack
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}