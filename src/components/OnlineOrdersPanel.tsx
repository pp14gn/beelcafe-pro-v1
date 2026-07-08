import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Bike, ShoppingBag, Clock, DollarSign } from "lucide-react";

type OnlineOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment_type: "pickup" | "delivery";
  pickup_time: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  items: any[];
  subtotal: number;
  total: number;
  payment_method: "counter" | "online_card";
  payment_status: string;
  status: string;
  source: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  accepted: "bg-indigo-500",
  preparing: "bg-yellow-500",
  ready: "bg-green-500",
  completed: "bg-stone-500",
  cancelled: "bg-red-500",
};

const NEXT: Record<string, { label: string; status: string } | null> = {
  new: { label: "Accept", status: "accepted" },
  accepted: { label: "Start preparing", status: "preparing" },
  preparing: { label: "Mark ready", status: "ready" },
  ready: { label: "Complete", status: "completed" },
  completed: null,
  cancelled: null,
};

export default function OnlineOrdersPanel({ shiftId }: { shiftId?: string }) {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const load = async () => {
    const { data, error } = await supabase
      .from("online_orders")
      .select("*")
      .in("status", ["new", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setOrders((data as any[]) as OnlineOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("online_orders_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast({ title: "New online order!", description: (payload.new as any).customer_name });
            try { new Audio("/notification.mp3").play().catch(() => {}); } catch { /* noop */ }
          }
          load();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const advance = async (o: OnlineOrder) => {
    const next = NEXT[o.status];
    if (!next) return;
    setBusy(o.id);
    try {
      // On completion: record a sale and deduct inventory
      if (next.status === "completed") {
        if (!user) throw new Error("Not signed in");

        const saleItems = o.items.map((it: any) => ({
          id: it.recipe_id,
          name: it.name,
          quantity: it.quantity,
          price: it.unit_price,
          selectedSize: it.selectedSize || null,
        }));

        const { error: salesErr } = await supabase.from("sales").insert({
          user_id: user.id,
          shift_id: shiftId ?? null,
          total_amount: o.total,
          payment_method: o.payment_method === "online_card" ? "card" : "cash",
          items: saleItems,
        });
        if (salesErr) throw salesErr;

        try {
          await supabase.functions.invoke("process-sale-inventory", { body: { items: saleItems } });
        } catch (e) {
          console.error("inventory error", e);
        }
      }

      const { error } = await supabase
        .from("online_orders")
        .update({
          status: next.status,
          fulfilled_by: next.status === "completed" ? user?.id : undefined,
          fulfilled_at: next.status === "completed" ? new Date().toISOString() : undefined,
        })
        .eq("id", o.id);
      if (error) throw error;

      toast({ title: `Order ${next.status}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (o: OnlineOrder) => {
    if (!confirm("Cancel this order?")) return;
    setBusy(o.id);
    const { error } = await supabase
      .from("online_orders")
      .update({ status: "cancelled" })
      .eq("id", o.id);
    setBusy(null);
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
  };

  if (loading) return <div className="p-6 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Loading online orders…</div>;
  if (!orders.length) return <div className="p-6 text-muted-foreground text-sm">No active online orders.</div>;

  return (
    <div className="p-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => {
        const next = NEXT[o.status];
        return (
          <Card key={o.id} className="p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-semibold">{o.customer_name}</div>
                <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`${STATUS_COLORS[o.status]} text-white capitalize`}>{o.status}</Badge>
                <Badge variant={o.payment_status === "paid" ? "default" : "outline"} className="capitalize text-xs">
                  <DollarSign className="h-3 w-3 mr-0.5" />{o.payment_status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {o.fulfillment_type === "delivery" ? <Bike className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
              <span className="capitalize">{o.fulfillment_type}</span>
              {o.pickup_time && (<><Clock className="h-3 w-3 ml-1" /><span>{new Date(o.pickup_time).toLocaleString()}</span></>)}
            </div>

            {o.delivery_address && <div className="text-xs">📍 {o.delivery_address}</div>}
            {o.delivery_notes && <div className="text-xs italic">"{o.delivery_notes}"</div>}

            <div className="border-t pt-2 space-y-1">
              {o.items.map((it: any, i: number) => (
                <div key={i} className="text-sm flex justify-between">
                  <span>{it.quantity}× {it.name}{it.selectedSize ? ` (${it.selectedSize.name})` : ""}</span>
                  <span>${Number(it.line_total ?? it.unit_price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span><span>${Number(o.total).toFixed(2)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              {next && (
                <Button size="sm" className="flex-1" disabled={busy === o.id} onClick={() => advance(o)}>
                  {busy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : next.label}
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => cancel(o)}>
                Cancel
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}