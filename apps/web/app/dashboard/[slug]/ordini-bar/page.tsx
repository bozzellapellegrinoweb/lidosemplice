"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Umbrella,
  Clock,
  Check,
  ChefHat,
  Truck,
  X,
  Bell,
  Volume2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

interface BarOrder {
  id: string;
  umbrella_label: string;
  guest_name: string;
  status: OrderStatus;
  total_cents: number;
  notes: string | null;
  created_at: string;
  items: { name: string; qty: number; price_cents: number }[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  pending: { label: "Nuovo", icon: Bell, color: "text-partial", bgColor: "bg-partial/10 border-partial/30" },
  preparing: { label: "In preparazione", icon: ChefHat, color: "text-brand-azure", bgColor: "bg-brand-azure/10 border-brand-azure/30" },
  ready: { label: "Pronto", icon: Check, color: "text-available", bgColor: "bg-available/10 border-available/30" },
  delivered: { label: "Consegnato", icon: Truck, color: "text-muted-foreground", bgColor: "bg-muted border-border" },
  cancelled: { label: "Annullato", icon: X, color: "text-occupied", bgColor: "bg-occupied/10 border-occupied/30" },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
  cancelled: null,
};

export default function OrdiniBarPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [orders, setOrders] = useState<BarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [soundOn, setSoundOn] = useState(true);
  const establishmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Supabase Realtime subscription for new orders
  useEffect(() => {
    if (!establishmentIdRef.current) return;
    const supabase = createClient();
    const channel = supabase
      .channel("bar-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bar_orders",
          filter: `establishment_id=eq.${establishmentIdRef.current}`,
        },
        () => {
          // Reload orders when a new one comes in
          loadOrders();
          if (soundOn) {
            try { new Audio("/notification.mp3").play(); } catch {}
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bar_orders",
          filter: `establishment_id=eq.${establishmentIdRef.current}`,
        },
        () => { loadOrders(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, soundOn]);

  async function loadOrders() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    establishmentIdRef.current = est.id;

    const { data } = await supabase
      .from("bar_orders")
      .select(`
        id, umbrella_label, guest_name, status, total_cents, notes, created_at,
        bar_order_items(quantity, price_cents, menu_items(name))
      `)
      .eq("establishment_id", est.id)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped: BarOrder[] = data.map((o) => ({
        id: o.id,
        umbrella_label: o.umbrella_label || "?",
        guest_name: o.guest_name || "Cliente",
        status: o.status as OrderStatus,
        total_cents: o.total_cents,
        notes: o.notes,
        created_at: o.created_at,
        items: ((o.bar_order_items as unknown as { quantity: number; price_cents: number; menu_items: { name: string } | null }[]) || []).map((item) => ({
          name: item.menu_items?.name || "Articolo",
          qty: item.quantity,
          price_cents: item.price_cents,
        })),
      }));
      setOrders(mapped);
    }
    setLoading(false);
  }

  async function advanceStatus(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    const supabase = createClient();
    await supabase.from("bar_orders").update({ status: next }).eq("id", orderId);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: next } : o)));
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ora";
    if (mins < 60) return `${mins} min fa`;
    const hours = Math.floor(mins / 60);
    return `${hours}h fa`;
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordini bar</h1>
          <p className="text-muted-foreground">
            {orders.length === 0
              ? "Nessun ordine ancora. Appariranno qui in tempo reale."
              : "Gestisci gli ordini in tempo reale."}
          </p>
        </div>
        <Button
          variant={soundOn ? "default" : "outline"}
          onClick={() => setSoundOn(!soundOn)}
        >
          <Volume2 className="h-4 w-4" />
          Suono {soundOn ? "attivo" : "disattivato"}
        </Button>
      </div>

      {/* Contatori status */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-partial/30 bg-partial/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-partial">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Nuovi ordini</p>
          </CardContent>
        </Card>
        <Card className="border-brand-azure/30 bg-brand-azure/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-brand-azure">{preparingCount}</p>
            <p className="text-sm text-muted-foreground">In preparazione</p>
          </CardContent>
        </Card>
        <Card className="border-available/30 bg-available/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-available">{readyCount}</p>
            <p className="text-sm text-muted-foreground">Pronti</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex gap-2">
        {(["all", "pending", "preparing", "ready", "delivered"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Tutti" : STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {/* Lista ordini */}
      <div className="space-y-3">
        {filtered.map((order) => {
          const config = STATUS_CONFIG[order.status];
          const StatusIcon = config.icon;
          const nextStatus = NEXT_STATUS[order.status];

          return (
            <Card key={order.id} className={`border ${config.bgColor}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
                      <StatusIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Umbrella className="h-3 w-3" />
                          {order.umbrella_label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {order.guest_name}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-sm">
                            {item.qty}x {item.name}{" "}
                            <span className="text-muted-foreground">
                              ({((item.price_cents * item.qty) / 100).toFixed(2)}&euro;)
                            </span>
                          </p>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          Nota: {order.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(order.created_at)}
                    </div>
                    <span className="text-xl font-bold">
                      {(order.total_cents / 100).toFixed(2)}&euro;
                    </span>
                    {nextStatus && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => advanceStatus(order.id)}
                      >
                        {nextStatus === "preparing" && "Prepara"}
                        {nextStatus === "ready" && "Pronto!"}
                        {nextStatus === "delivered" && "Consegnato"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center p-6">
              <p className="text-muted-foreground">
                {orders.length === 0
                  ? "Nessun ordine bar ancora. Gli ordini dai clienti appariranno qui."
                  : "Nessun ordine trovato con questo filtro."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
