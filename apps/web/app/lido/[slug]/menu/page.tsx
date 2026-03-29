"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  ShoppingCart,
  Umbrella,
  Send,
  Check,
  Loader2,
  Coffee,
} from "lucide-react";

/* ---------- Types ---------- */

interface Establishment {
  id: string;
  name: string;
  slug: string;
}

interface MenuCategory {
  id: string;
  establishment_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_available: boolean;
  sort_order: number;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

/* ---------- Helpers ---------- */

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20AC";
}

/* ---------- Component ---------- */

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = createClient();

  // Data state
  const [establishment, setEstablishment] = useState<Establishment | null>(
    null,
  );
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Cart state
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);

  // Order form state
  const [guestName, setGuestName] = useState("");
  const [umbrellaLabel, setUmbrellaLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  /* ---------- Fetch data ---------- */

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // 1. Establishment
      const { data: est, error: estErr } = await supabase
        .from("establishments")
        .select("id, name, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (estErr || !est) {
        setError("Stabilimento non trovato.");
        setLoading(false);
        return;
      }
      setEstablishment(est);

      // 2. Categories
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("establishment_id", est.id)
        .eq("is_active", true)
        .order("sort_order");

      setCategories(cats ?? []);

      if (cats && cats.length > 0) {
        setActiveCategory(cats[0].id);
      }

      // 3. Items (only available)
      const categoryIds = (cats ?? []).map((c) => c.id);
      if (categoryIds.length > 0) {
        const { data: menuItems } = await supabase
          .from("menu_items")
          .select("*")
          .in("category_id", categoryIds)
          .eq("is_available", true)
          .order("sort_order");

        setItems(menuItems ?? []);
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* ---------- Cart helpers ---------- */

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, { menuItem: item, quantity: 1 });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(itemId);
      } else {
        next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      }
      return next;
    });
  }, []);

  const cartItems = Array.from(cart.values());
  const cartTotal = cartItems.reduce(
    (sum, ci) => sum + ci.menuItem.price_cents * ci.quantity,
    0,
  );
  const cartCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);

  /* ---------- Filtered items ---------- */

  const filteredItems = activeCategory
    ? items.filter((i) => i.category_id === activeCategory)
    : items;

  /* ---------- Submit order ---------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0 || !establishment) return;

    setSubmitting(true);
    setOrderError(null);

    // Create the bar_order
    const { data: order, error: orderErr } = await supabase
      .from("bar_orders")
      .insert({
        establishment_id: establishment.id,
        umbrella_label: umbrellaLabel.trim(),
        guest_name: guestName.trim(),
        status: "pending",
        total_cents: cartTotal,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      setOrderError("Errore durante l'invio dell'ordine. Riprova.");
      setSubmitting(false);
      return;
    }

    // Create bar_order_items
    const orderItems = cartItems.map((ci) => ({
      bar_order_id: order.id,
      menu_item_id: ci.menuItem.id,
      quantity: ci.quantity,
      price_cents: ci.menuItem.price_cents,
    }));

    const { error: itemsErr } = await supabase
      .from("bar_order_items")
      .insert(orderItems);

    if (itemsErr) {
      setOrderError("Errore nel salvataggio dei prodotti. Riprova.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setOrderSuccess(true);
  }

  /* ---------- Loading / Error states ---------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
          <p className="text-sm text-muted-foreground">
            Caricamento menu&hellip;
          </p>
        </div>
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <Coffee className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">
              {error ?? "Stabilimento non trovato"}
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/lido/${slug}`}>Torna alla pagina</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Success state ---------- */

  if (orderSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Ordine inviato!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Il tuo ordine &egrave; stato ricevuto. Ti porteremo tutto
              direttamente all&apos;ombrellone{" "}
              <span className="font-semibold">{umbrellaLabel}</span>.
            </p>
            <div className="mt-6 rounded-lg border bg-muted/50 p-4 text-left text-sm">
              <p>
                <span className="text-muted-foreground">Nome:</span>{" "}
                <span className="font-medium">{guestName}</span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Ombrellone:</span>{" "}
                <span className="font-medium">{umbrellaLabel}</span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Totale:</span>{" "}
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                setOrderSuccess(false);
                setCart(new Map());
                setGuestName("");
                setUmbrellaLabel("");
                setNotes("");
                setCartOpen(false);
              }}
            >
              Nuovo ordine
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Main render ---------- */

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">
              {establishment.name}
            </h1>
            <p className="text-xs text-muted-foreground">Menu Bar</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="relative shrink-0"
            onClick={() => setCartOpen(!cartOpen)}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div
            ref={tabsRef}
            className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-brand-azure text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu items */}
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <Coffee className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nessun prodotto disponibile in questa categoria.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const inCart = cart.get(item.id);
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-bold text-brand-azure">
                        {formatPrice(item.price_cents)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {inCart ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {inCart.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => addToCart(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart / Order panel (slides up from bottom) */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40">
          {/* Collapsed bar */}
          {!cartOpen && (
            <div className="border-t bg-background px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
              <button
                onClick={() => setCartOpen(true)}
                className="mx-auto flex w-full max-w-2xl items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-azure" />
                  <span className="text-sm font-medium">
                    {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"}
                  </span>
                </div>
                <span className="text-base font-bold">
                  {formatPrice(cartTotal)}
                </span>
              </button>
            </div>
          )}

          {/* Expanded panel */}
          {cartOpen && (
            <div className="max-h-[85vh] overflow-y-auto border-t bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
              <div className="mx-auto max-w-2xl px-4 pb-6 pt-4">
                {/* Cart header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Il tuo ordine</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCartOpen(false)}
                  >
                    Chiudi
                  </Button>
                </div>

                {/* Cart items */}
                <div className="mt-4 space-y-2">
                  {cartItems.map((ci) => (
                    <div
                      key={ci.menuItem.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {ci.menuItem.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(ci.menuItem.price_cents)} cad.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(ci.menuItem.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm font-semibold">
                          {ci.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => addToCart(ci.menuItem)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="ml-3 shrink-0 text-sm font-bold">
                        {formatPrice(ci.menuItem.price_cents * ci.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">Totale</span>
                  <span className="text-lg font-bold">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                {/* Order form */}
                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Il tuo nome
                    </label>
                    <Input
                      placeholder="es. Marco"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      <Umbrella className="mr-1 inline h-4 w-4" />
                      Numero ombrellone
                    </label>
                    <Input
                      placeholder="es. A12"
                      value={umbrellaLabel}
                      onChange={(e) => setUmbrellaLabel(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Note (opzionale)
                    </label>
                    <Input
                      placeholder="es. Senza ghiaccio, allergie..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {orderError && (
                    <p className="text-sm font-medium text-destructive">
                      {orderError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={
                      submitting || !guestName.trim() || !umbrellaLabel.trim()
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Invio in corso&hellip;
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Invia ordine &middot; {formatPrice(cartTotal)}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
