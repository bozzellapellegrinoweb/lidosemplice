import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Verifica che l'utente sia proprietario o membro
  const isOwner = establishment.owner_id === user.id;

  if (!isOwner) {
    const { data: membership } = await supabase
      .from("establishment_members")
      .select("id")
      .eq("establishment_id", establishment.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      redirect("/dashboard");
    }
  }

  return (
    <>
      {children}
      <AIChat establishmentId={establishment.id} userRole="admin" />
    </>
  );
}
