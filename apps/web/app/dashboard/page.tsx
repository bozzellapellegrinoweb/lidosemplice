import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardIndex() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Cerca stabilimento di proprietà
  const { data: owned } = await supabase
    .from("establishments")
    .select("slug")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (owned?.slug) {
    redirect(`/dashboard/${owned.slug}`);
  }

  // Cerca come membro
  const { data: membership } = await supabase
    .from("establishment_members")
    .select("establishments(slug)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (membership?.establishments) {
    const est = membership.establishments as unknown as { slug: string };
    redirect(`/dashboard/${est.slug}`);
  }

  // Nessuno stabilimento — pagina creazione
  redirect("/dashboard/nuovo");
}
