import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import MenuClient from "./menu-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: establishment } = await supabase
    .from("establishments")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!establishment) notFound();

  const { data: cats } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("establishment_id", establishment.id)
    .order("sort_order");

  const categories = cats ?? [];

  let items: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price_cents: number;
    sort_order: number;
  }[] = [];

  if (categories.length > 0) {
    const categoryIds = categories.map((c) => c.id);
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, category_id, name, description, price_cents, sort_order")
      .in("category_id", categoryIds)
      .order("sort_order");

    items = menuItems ?? [];
  }

  return (
    <MenuClient
      establishment={establishment}
      categories={categories}
      items={items}
    />
  );
}
