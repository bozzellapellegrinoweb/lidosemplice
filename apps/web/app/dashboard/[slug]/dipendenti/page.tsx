"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Trash2, UserPlus, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Member {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  user_profiles: {
    full_name: string;
    phone: string;
  } | null;
  user_email?: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  check_in: "Check-in",
  bookings: "Prenotazioni",
  bar_orders: "Ordini bar",
  pricing: "Prezzi",
  analytics: "Statistiche",
  settings: "Impostazioni",
};

export default function DipendentiPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadMembers() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    const { data } = await supabase
      .from("establishment_members")
      .select("*, user_profiles(full_name, phone)")
      .eq("establishment_id", est.id)
      .order("created_at");

    if (data) setMembers(data as unknown as Member[]);
    setLoading(false);
  }

  async function inviteMember() {
    if (!establishmentId || !inviteEmail) return;
    setInviting(true);
    setInviteError("");

    const supabase = createClient();

    // Cerca l'utente per email nelle auth
    // Per ora creiamo un placeholder — in produzione invieremmo un email
    // Qui cerchiamo se l'utente esiste già
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", (
        await supabase.rpc("get_user_id_by_email", { email_input: inviteEmail })
      ).data)
      .single();

    if (existingUser) {
      // Aggiungi come membro
      const { error } = await supabase.from("establishment_members").insert({
        establishment_id: establishmentId,
        user_id: existingUser.id,
        role: "employee",
        permissions: { check_in: true, bar_orders: true },
      });

      if (error) {
        if (error.code === "23505") {
          setInviteError("Questo utente è già un membro.");
        } else {
          setInviteError(error.message);
        }
      } else {
        setInviteEmail("");
        setShowInvite(false);
        loadMembers();
      }
    } else {
      // Per ora mostriamo messaggio
      setInviteError("Utente non trovato. Deve prima registrarsi su LidoFacile.");
    }

    setInviting(false);
  }

  async function toggleActive(member: Member) {
    const supabase = createClient();
    const newActive = !member.is_active;
    await supabase
      .from("establishment_members")
      .update({ is_active: newActive })
      .eq("id", member.id);

    setMembers(
      members.map((m) =>
        m.id === member.id ? { ...m, is_active: newActive } : m
      )
    );
  }

  async function removeMember(id: string) {
    const supabase = createClient();
    await supabase.from("establishment_members").delete().eq("id", id);
    setMembers(members.filter((m) => m.id !== id));
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-azure" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dipendenti</h1>
          <p className="text-muted-foreground">
            Gestisci il team del tuo stabilimento.
          </p>
        </div>
        <Button variant="brand" onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4" />
          Invita dipendente
        </Button>
      </div>

      {showInvite && (
        <Card className="border-brand-azure/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                placeholder="Email del dipendente..."
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button variant="brand" onClick={inviteMember} disabled={inviting || !inviteEmail}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Invia invito
              </Button>
              <Button variant="outline" onClick={() => { setShowInvite(false); setInviteError(""); }}>
                Annulla
              </Button>
            </div>
            {inviteError && (
              <p className="mt-2 text-sm text-destructive">{inviteError}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Il dipendente deve avere un account LidoFacile per essere aggiunto al team.
            </p>
          </CardContent>
        </Card>
      )}

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-6">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-center text-muted-foreground">
              Nessun dipendente aggiunto al team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id} className={!member.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-azure/10 text-lg font-bold text-brand-azure">
                    {(member.user_profiles?.full_name || "?").charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.user_profiles?.full_name || "Utente"}
                      </p>
                      <Badge variant={member.role === "admin" ? "available" : "outline"}>
                        {member.role === "admin" ? "Admin" : "Dipendente"}
                      </Badge>
                      {!member.is_active && <Badge variant="outline">Disattivato</Badge>}
                    </div>
                    {member.user_profiles?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {member.user_profiles.phone}
                      </div>
                    )}
                    <div className="mt-1 flex gap-1">
                      {Object.entries(member.permissions || {}).map(([key, val]) =>
                        val ? (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {PERMISSION_LABELS[key] || key}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role !== "admin" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(member)}>
                        {member.is_active ? "Disattiva" : "Attiva"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
