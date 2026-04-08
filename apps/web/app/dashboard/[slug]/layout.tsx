import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { GlobalNotifications } from "@/components/dashboard/global-notifications";

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
    .select("id, name, slug, owner_id, subscription_status, subscription_expires_at, bar_enabled")
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

  // Paywall: controlla abbonamento (solo per admin/proprietario)
  const role = membership?.role || (isOwner ? "admin" : "employee");
  let trialDaysLeft: number | null = null;

  if (isOwner || role === "admin") {
    const status = establishment.subscription_status;
    const expiresAt = establishment.subscription_expires_at
      ? new Date(establishment.subscription_expires_at)
      : null;
    const now = new Date();
    const isBlocked =
      status === "expired" ||
      status === "cancelled" ||
      status === "past_due" ||
      (status === "trial" && expiresAt !== null && expiresAt < now);
    if (isBlocked) {
      redirect(`/abbonati?slug=${slug}&id=${establishment.id}`);
    }

    // Calcola giorni trial rimasti per il banner
    if (status === "trial" && expiresAt !== null && expiresAt >= now) {
      trialDaysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
    }
  }

  const permissions = membership?.permissions as Record<string, boolean> | null;

  const trialBannerColor =
    trialDaysLeft !== null && trialDaysLeft <= 3
      ? "bg-red-50 border-red-200 text-red-700"
      : trialDaysLeft !== null && trialDaysLeft <= 7
        ? "bg-orange-50 border-orange-200 text-orange-700"
        : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <>
      <DashboardSidebar role={role} permissions={permissions ?? {}} barEnabled={establishment.bar_enabled ?? true} />
      <main className="min-h-screen transition-all duration-300 lg:ml-[260px]">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:pt-6">
          {/* Banner giorni trial rimasti */}
          {trialDaysLeft !== null && (
            <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${trialBannerColor}`}>
              <span className="font-medium">
                ⏳ <strong>Prova gratuita</strong> —{" "}
                {trialDaysLeft === 0
                  ? "scade oggi!"
                  : `${trialDaysLeft} giorn${trialDaysLeft === 1 ? "o rimane" : "i rimangono"}`}
              </span>
              <a
                href={`/abbonati?slug=${slug}&id=${establishment.id}`}
                className="rounded-lg bg-brand-azure px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-azure/80 transition"
              >
                Attiva abbonamento →
              </a>
            </div>
          )}
          {children}
        </div>
      </main>
      <GlobalNotifications establishmentId={establishment.id} slug={slug} />
    </>
  );
}
