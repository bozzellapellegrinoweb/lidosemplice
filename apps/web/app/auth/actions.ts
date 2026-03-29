"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Trova lo stabilimento dell'utente per il redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Errore durante il login." };
  }

  // Cerca stabilimento di proprietà o membro
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
    .select("establishment_id, establishments(slug)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (membership?.establishments) {
    const est = membership.establishments as unknown as { slug: string };
    redirect(`/dashboard/${est.slug}`);
  }

  // Nessuno stabilimento — redirect a creazione
  redirect("/dashboard/nuovo");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const establishmentName = formData.get("establishmentName") as string;
  const city = formData.get("city") as string;

  // 1. Registra l'utente
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Errore durante la registrazione." };
  }

  // 2. Aggiorna profilo con telefono
  await supabase
    .from("user_profiles")
    .update({ full_name: fullName, phone, role: "admin" })
    .eq("id", authData.user.id);

  // 3. Genera slug univoco
  let slug = slugify(establishmentName);
  const { data: existing } = await supabase
    .from("establishments")
    .select("slug")
    .like("slug", `${slug}%`);

  if (existing && existing.length > 0) {
    slug = `${slug}-${existing.length + 1}`;
  }

  // 4. Crea lo stabilimento
  const { error: estError } = await supabase.from("establishments").insert({
    owner_id: authData.user.id,
    name: establishmentName,
    slug,
    city,
    subscription_status: "trial",
    subscription_expires_at: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  if (estError) {
    return { error: "Errore nella creazione dello stabilimento: " + estError.message };
  }

  // 5. Aggiungi il proprietario come membro admin
  await supabase.from("establishment_members").insert({
    establishment_id: (
      await supabase
        .from("establishments")
        .select("id")
        .eq("slug", slug)
        .single()
    ).data?.id,
    user_id: authData.user.id,
    role: "admin",
    permissions: {
      check_in: true,
      bookings: true,
      bar_orders: true,
      pricing: true,
      analytics: true,
      settings: true,
    },
  });

  redirect(`/dashboard/${slug}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
