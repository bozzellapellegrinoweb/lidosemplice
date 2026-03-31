import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AIChat } from "@/components/chat/ai-chat";
import LidoPageClient from "./lido-page-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LidoPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: establishment } = await supabase
    .from("establishments")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!establishment) notFound();

  const { data: services } = await supabase
    .from("additional_services")
    .select("id, name, description, price, icon, is_daily")
    .eq("establishment_id", establishment.id)
    .eq("is_active", true)
    .order("sort_order");

  const { data: mapsData } = await supabase
    .from("beach_maps")
    .select("id, name")
    .eq("establishment_id", establishment.id)
    .eq("is_active", true)
    .order("created_at");

  // Tutte le mappe attive, ognuna con le proprie righe
  const beachMaps: { id: string; name: string; rows: { id: string; label: string; count: number; row_number: number }[] }[] = [];
  if (mapsData?.length) {
    for (const map of mapsData) {
      const { data: mapRows } = await supabase
        .from("map_rows")
        .select("id, label, row_number")
        .eq("beach_map_id", map.id)
        .order("row_number");

      if (!mapRows?.length) continue;

      const rowIds = mapRows.map((r) => r.id);
      const { data: elements } = await supabase
        .from("map_elements")
        .select("id, map_row_id")
        .in("map_row_id", rowIds)
        .eq("is_bookable", true);

      const rows = mapRows.map((row) => ({
        id: row.id,
        label: row.label,
        row_number: row.row_number,
        count: (elements || []).filter((e) => e.map_row_id === row.id).length,
      }));
      beachMaps.push({ id: map.id, name: map.name ?? "Spiaggia", rows });
    }
  }
  // Compat: rows = righe della prima mappa (usato altrove nel componente)
  const rows = beachMaps[0]?.rows ?? [];

  // Structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeachResort",
    name: establishment.name,
    description: establishment.description || `Stabilimento balneare ${establishment.name}`,
    ...(establishment.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: establishment.address,
        addressLocality: establishment.city || "",
        addressRegion: establishment.province || "",
        addressCountry: "IT",
      },
    }),
    ...(establishment.phone && { telephone: establishment.phone }),
    potentialAction: {
      "@type": "ReserveAction",
      target: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lido-facile.it"}/lido/${slug}/prenota`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LidoPageClient
        establishment={establishment}
        services={services || []}
        rows={rows}
        beachMaps={beachMaps}
        slug={slug}
      />
      <AIChat
        establishmentId={establishment.id}
        userRole="client"
        establishmentName={establishment.name}
        slug={slug}
      />
    </>
  );
}
