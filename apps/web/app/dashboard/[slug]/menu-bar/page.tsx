"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Coffee,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MenuCategory {
  id: string;
  establishment_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_available: boolean;
  sort_order: number;
  image_url: string | null;
  created_at: string;
}

export default function MenuBarPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active category tab
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Add category form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySortOrder, setNewCategorySortOrder] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemAvailable, setNewItemAvailable] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadData() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    const [catResult, itemResult] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .eq("establishment_id", est.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*")
        .eq("category_id", est.id) // will be filtered client-side
        .order("sort_order", { ascending: true }),
    ]);

    // Load items via categories
    const cats = catResult.data || [];
    setCategories(cats);

    if (cats.length > 0) {
      setActiveCategoryId(cats[0].id);

      // Fetch all items for all categories of this establishment
      const categoryIds = cats.map((c) => c.id);
      const { data: allItems } = await supabase
        .from("menu_items")
        .select("*")
        .in("category_id", categoryIds)
        .order("sort_order", { ascending: true });

      if (allItems) setItems(allItems);
    }

    setLoading(false);
  }

  // --- Category CRUD ---

  async function addCategory() {
    if (!establishmentId || !newCategoryName.trim()) return;
    setAddingCategory(true);

    const supabase = createClient();
    const sortOrder = newCategorySortOrder
      ? parseInt(newCategorySortOrder, 10)
      : categories.length;

    const { data, error } = await supabase
      .from("menu_categories")
      .insert({
        establishment_id: establishmentId,
        name: newCategoryName.trim(),
        sort_order: sortOrder,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      const updated = [...categories, data].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      setCategories(updated);
      if (!activeCategoryId) setActiveCategoryId(data.id);
      setNewCategoryName("");
      setNewCategorySortOrder("");
      setShowAddCategory(false);
    }
    setAddingCategory(false);
  }

  async function deleteCategory(categoryId: string) {
    const categoryItems = items.filter((i) => i.category_id === categoryId);
    if (categoryItems.length > 0) {
      const ok = window.confirm(
        `Questa categoria contiene ${categoryItems.length} articoli che verranno eliminati. Continuare?`
      );
      if (!ok) return;
    }

    const supabase = createClient();
    // Delete items in this category first
    await supabase.from("menu_items").delete().eq("category_id", categoryId);
    await supabase.from("menu_categories").delete().eq("id", categoryId);

    const updatedCats = categories.filter((c) => c.id !== categoryId);
    setCategories(updatedCats);
    setItems(items.filter((i) => i.category_id !== categoryId));

    if (activeCategoryId === categoryId) {
      setActiveCategoryId(updatedCats.length > 0 ? updatedCats[0].id : null);
    }
  }

  // --- Item CRUD ---

  async function addItem() {
    if (!activeCategoryId || !newItemName.trim() || !newItemPrice) return;
    setAddingItem(true);
    setAddItemError("");

    const supabase = createClient();
    const priceCents = Math.round(parseFloat(newItemPrice) * 100);
    const categoryItems = items.filter(
      (i) => i.category_id === activeCategoryId
    );

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        establishment_id: establishmentId,
        category_id: activeCategoryId,
        name: newItemName.trim(),
        description: newItemDescription.trim() || null,
        price_cents: priceCents,
        is_available: newItemAvailable,
        sort_order: categoryItems.length,
      })
      .select()
      .single();

    if (error) {
      setAddItemError(error.message);
    } else if (data) {
      setItems([...items, data]);
      setNewItemName("");
      setNewItemDescription("");
      setNewItemPrice("");
      setNewItemAvailable(true);
      setAddItemError("");
      setShowAddItem(false);
    }
    setAddingItem(false);
  }

  async function toggleAvailability(item: MenuItem) {
    const supabase = createClient();
    const newAvailable = !item.is_available;
    await supabase
      .from("menu_items")
      .update({ is_available: newAvailable })
      .eq("id", item.id);

    setItems(
      items.map((i) =>
        i.id === item.id ? { ...i, is_available: newAvailable } : i
      )
    );
  }

  async function deleteItem(itemId: string) {
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", itemId);
    setItems(items.filter((i) => i.id !== itemId));
  }

  // --- Derived data ---

  const activeItems = items.filter((i) => i.category_id === activeCategoryId);
  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  // --- Loading state ---

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu bar</h1>
          <p className="text-muted-foreground">
            Gestisci le categorie e gli articoli del menu bar.
          </p>
        </div>
        <Button variant="brand" onClick={() => setShowAddCategory(true)}>
          <Plus className="h-4 w-4" />
          Nuova categoria
        </Button>
      </div>

      {/* Add category form */}
      {showAddCategory && (
        <Card className="border-brand-azure/30">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Aggiungi categoria</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nome categoria
                </label>
                <Input
                  placeholder="Es. Bevande, Snack, Gelati..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ordine visualizzazione
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder={String(categories.length)}
                  value={newCategorySortOrder}
                  onChange={(e) => setNewCategorySortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="brand"
                onClick={addCategory}
                disabled={addingCategory || !newCategoryName.trim()}
              >
                {addingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Aggiungi
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddCategory(false)}
              >
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state: no categories */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-6">
            <Coffee className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-center text-muted-foreground">
              Nessuna categoria nel menu. Crea la prima categoria per iniziare
              ad aggiungere articoli.
            </p>
            <Button
              variant="brand"
              size="sm"
              className="mt-4"
              onClick={() => setShowAddCategory(true)}
            >
              <Plus className="h-4 w-4" />
              Crea la prima categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count = items.filter(
                (i) => i.category_id === cat.id
              ).length;
              return (
                <Button
                  key={cat.id}
                  variant={activeCategoryId === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="gap-1.5"
                >
                  {cat.name}
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Active category card */}
          {activeCategory && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">{activeCategory.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => setShowAddItem(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi articolo
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteCategory(activeCategory.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add item form */}
                {showAddItem && (
                  <Card className="border-brand-azure/30">
                    <CardContent className="space-y-3 p-4">
                      <p className="text-sm font-medium">Nuovo articolo</p>
                      {addItemError && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {addItemError}
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Nome
                          </label>
                          <Input
                            placeholder="Es. Coca Cola, Panino..."
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Descrizione
                          </label>
                          <Input
                            placeholder="Descrizione opzionale"
                            value={newItemDescription}
                            onChange={(e) =>
                              setNewItemDescription(e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Prezzo (&euro;)
                          </label>
                          <Input
                            type="number"
                            step="0.10"
                            min="0"
                            placeholder="3.50"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newItemAvailable}
                            onChange={(e) =>
                              setNewItemAvailable(e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Disponibile subito
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="brand"
                          onClick={addItem}
                          disabled={
                            addingItem ||
                            !newItemName.trim() ||
                            !newItemPrice
                          }
                        >
                          {addingItem ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Aggiungi
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddItem(false)}
                        >
                          Annulla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Items list */}
                {activeItems.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center py-8">
                    <Coffee className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-center text-sm text-muted-foreground">
                      Nessun articolo in questa categoria.
                    </p>
                    <Button
                      variant="brand"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowAddItem(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi il primo articolo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          !item.is_available ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground/30" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.name}</p>
                              {!item.is_available && (
                                <Badge variant="outline" className="text-xs">
                                  Non disponibile
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold">
                            {(item.price_cents / 100).toFixed(2)}&euro;
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleAvailability(item)}
                            title={
                              item.is_available
                                ? "Segna come non disponibile"
                                : "Segna come disponibile"
                            }
                          >
                            {item.is_available ? (
                              <Eye className="h-4 w-4 text-available" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
