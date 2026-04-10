"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface OrderItem {
  menu_item_id: string;
  quantity: number;
  price_cents: number;
}

export async function submitBarOrder(params: {
  establishment_id: string;
  umbrella_label: string;
  guest_name: string;
  notes: string | null;
  total_cents: number;
  items: OrderItem[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: order, error: orderErr } = await supabase
    .from("bar_orders")
    .insert({
      establishment_id: params.establishment_id,
      umbrella_label: params.umbrella_label,
      guest_name: params.guest_name,
      status: "pending",
      total_cents: params.total_cents,
      notes: params.notes,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { success: false, error: "Errore durante l'invio dell'ordine." };
  }

  const { error: itemsErr } = await supabase
    .from("bar_order_items")
    .insert(params.items.map(item => ({
      bar_order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price_cents: item.price_cents,
    })));

  if (itemsErr) {
    return { success: false, error: "Errore nel salvataggio dei prodotti." };
  }

  return { success: true };
}
