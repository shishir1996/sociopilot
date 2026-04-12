import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Globe, IndianRupee, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PricingRow {
  id: string;
  plan_name: string;
  region: string;
  currency: string;
  currency_symbol: string;
  monthly_price: number;
}

export function GeoPricingPanel() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<PricingRow[]>([]);
  const [editing, setEditing] = useState<PricingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    const { data } = await supabase.from("geo_pricing").select("*").order("plan_name");
    if (data) setPrices(data as PricingRow[]);
    setLoading(false);
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("geo_pricing")
      .update({ monthly_price: editing.monthly_price, currency_symbol: editing.currency_symbol })
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pricing updated ✓" });
      fetchPrices();
      setEditing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Geo-Based Pricing</h3>
        <Badge variant="outline" className="text-xs">
          <Globe className="h-3 w-3 mr-1" /> India + Global
        </Badge>
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan</Label>
                <Input value={editing.plan_name} disabled />
              </div>
              <div>
                <Label>Region</Label>
                <Input value={editing.region} disabled />
              </div>
              <div>
                <Label>Currency Symbol</Label>
                <Input value={editing.currency_symbol} onChange={e => setEditing({ ...editing, currency_symbol: e.target.value })} />
              </div>
              <div>
                <Label>Monthly Price</Label>
                <Input type="number" value={editing.monthly_price} onChange={e => setEditing({ ...editing, monthly_price: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Price</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prices.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium capitalize">{p.plan_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {p.region === "india" ? <><IndianRupee className="h-3 w-3 mr-1" /> India</> : <><DollarSign className="h-3 w-3 mr-1" /> Global</>}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">
                {p.currency_symbol}{p.monthly_price}/mo
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
