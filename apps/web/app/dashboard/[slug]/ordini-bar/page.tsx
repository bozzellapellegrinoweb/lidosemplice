"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

interface BarOrder {
  id: string;
  orderNumber: number;
  umbrella: string;
  clientName: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

const MOCK_ORDERS: BarOrder[] = [
  {
    id: "1", orderNumber: 42, umbrella: "A3", clientName: "Mario Rossi",
    items: [
      { name: "Spritz Aperol", qty: 2, price: 8 },
      { name: "Insalata mista", qty: 1, price: 12 },
    ],
    total: 28, status: "pending", createdAt: "5 min fa",
  },
  {
    id: "2", orderNumber: 43, umbrella: "B7", clientName: "Giulia Bianchi",
    items: [
      { name: "Acqua naturale 1L", qty: 3, price: 3 },
      { name: "Gelato cono", qty: 1, price: 5 },
    ],
    total: 14, status: "pending", createdAt: "12 min fa",
  },
  {
    id: "3", orderNumber: 41, umbrella: "C5", clientName: "Luca Verdi",
    items: [
      { name: "Birra Moretti", qty: 2, price: 5 },
      { name: "Patatine fritte", qty: 1, price: 6 },
    ],
    total: 16, status: "preparing", createdAt: "18 min fa",
  },
  {
    id: "4", orderNumber: 40, umbrella: "A8", clientName: "Anna Colombo",
    items: [
      { name: "Panino prosciutto", qty: 2, price: 7 },
      { name: "Coca-Cola", qty: 2, price: 3 },
    ],
    total: 20, status: "ready", createdAt: "25 min fa",
  },
  {
    id: "5", orderNumber: 39, umbrella: "D2", clientName: "Paolo Ferrari",
    items: [
      { name: "Caffe freddo", qty: 1, price: 3 },
    ],
    total: 3, status: "delivered", createdAt: "35 min fa",
  },
];

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
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [soundOn, setSoundOn] = useState(true);

  function advanceStatus(orderId: string) {
    setOrders(orders.map(o => {
      if (o.id !== orderId) return o;
      const next = NEXT_STATUS[o.status];
      return next ? { ...o, status: next } : o;
    }));
  }

  const filtered = filter === "all"
    ? orders
    : orders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const preparingCount = orders.filter(o => o.status === "preparing").length;
  const readyCount = orders.filter(o => o.status === "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordini bar</h1>
          <p className="text-muted-foreground">
            Gestisci gli ordini in tempo reale.
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
                        <span className="font-mono text-sm font-bold">
                          #{order.orderNumber}
                        </span>
                        <Badge variant="outline" className="gap-1">
                          <Umbrella className="h-3 w-3" />
                          {order.umbrella}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {order.clientName}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-sm">
                            {item.qty}x {item.name}{" "}
                            <span className="text-muted-foreground">
                              ({item.price * item.qty}&euro;)
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
                      {order.createdAt}
                    </div>
                    <span className="text-xl font-bold">{order.total}&euro;</span>
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
              <p className="text-muted-foreground">Nessun ordine trovato.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
