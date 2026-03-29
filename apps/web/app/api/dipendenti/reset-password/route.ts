import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const body = await req.json();
    const { establishment_id, user_id, new_password } = body;

    if (!establishment_id || !user_id || !new_password) {
      return NextResponse.json({ error: "Campi obbligatori mancanti." }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "La password deve essere di almeno 6 caratteri." },
        { status: 400 }
      );
    }

    // Controlla autorizzazione: proprietario O membro admin
    const { data: establishment } = await supabase
      .from("establishments")
      .select("id, owner_id")
      .eq("id", establishment_id)
      .single();

    if (!establishment) {
      return NextResponse.json({ error: "Stabilimento non trovato." }, { status: 404 });
    }

    const isOwner = establishment.owner_id === user.id;

    if (!isOwner) {
      const { data: membership } = await supabase
        .from("establishment_members")
        .select("role")
        .eq("establishment_id", establishment_id)
        .eq("user_id", user.id)
        .single();

      if (!membership || membership.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
      }
    }

    // Controlla che il target sia un membro dello stesso stabilimento
    const { data: targetMembership } = await supabase
      .from("establishment_members")
      .select("role")
      .eq("establishment_id", establishment_id)
      .eq("user_id", user_id)
      .single();

    if (!targetMembership) {
      return NextResponse.json({ error: "Dipendente non trovato." }, { status: 404 });
    }

    // Non puoi resettare la password di un altro admin
    if (targetMembership.role === "admin" && user_id !== user.id) {
      return NextResponse.json(
        { error: "Non puoi modificare la password di un altro admin." },
        { status: 403 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminSupabase.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
