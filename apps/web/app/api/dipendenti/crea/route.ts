import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // Verifica che chi chiama sia admin dello stabilimento
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const body = await req.json();
    const { establishment_id, full_name, email, password, phone, role, permissions } = body;

    if (!establishment_id || !full_name || !email || !password) {
      return NextResponse.json({ error: "Campi obbligatori mancanti." }, { status: 400 });
    }

    // Controlla che l'utente sia admin dello stabilimento
    const { data: membership } = await supabase
      .from("establishment_members")
      .select("role")
      .eq("establishment_id", establishment_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    // Usa service role per creare l'utente
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Crea l'utente in Supabase Auth
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confermato subito, non serve email di verifica
      user_metadata: { full_name },
    });

    if (createError || !newUser.user) {
      if (createError?.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Questa email è già registrata. Usa 'Aggiungi esistente' oppure cambia email." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createError?.message || "Errore nella creazione dell'account." },
        { status: 500 }
      );
    }

    // Aggiorna il profilo utente
    await adminSupabase
      .from("user_profiles")
      .update({ full_name, phone: phone || null, role: role || "employee" })
      .eq("id", newUser.user.id);

    // Aggiungi come membro dello stabilimento
    const { error: memberError } = await adminSupabase.from("establishment_members").insert({
      establishment_id,
      user_id: newUser.user.id,
      role: role || "employee",
      permissions: permissions || { check_in: true, bookings: true, bar_orders: true },
      is_active: true,
    });

    if (memberError) {
      // Rollback: elimina l'utente appena creato
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_id: newUser.user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
