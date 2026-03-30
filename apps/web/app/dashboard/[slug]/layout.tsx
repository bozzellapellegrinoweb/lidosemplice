import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { AIChat } from "@/components/chat/ai-chat";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function EstablishmentLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verifica che lo stabilimento esista
  const { data: establishment } = await supabase
    .from("establishments")
    .select("id, name, slug, owner_id")
    .eq("slug", slug)
    .single();

  if (!establishment) {
    notFound();
  }

  // Leggi ruolo e permessi dell'utente per questo stabilimento
  const { data: membership } = await supabase
    .from("establishment_members")
    .select("role, permissions, is_active")
    .eq("establishment_id", establishment.id)
    .eq("user_id", user.id)
    .single();

  const isOwner = establishment.owner_id === user.id;

  // Se non è proprietario e non è membro attivo → fuori
  if (!isOwner && (!membership || !membership.is_active)) {
    redirect("/dashboard");
  }

  const role = membership?.role || (isOwner ? "admin" : "employee");
  const permissions = membership?.permissions as Record<string, boolean> | null;

  return (
    <>
      <DashboardSidebar role={role} permissions={permissions ?? {}} />
      <main className="min-h-screen transition-all duration-300 lg:ml-[260px]">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:pt-6">
          {children}
        </div>
      </main>
      <AIChat establishmentId={establishment.id} userRole="admin" />
    </>
  );
}
