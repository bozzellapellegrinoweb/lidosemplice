"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  UserPlus,
  Loader2,
  Users,
  KeyRound,
  Pencil,
  Phone,
  Eye,
  EyeOff,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Member {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  user_profiles: {
    full_name: string;
    phone: string | null;
  } | null;
}

const PERMISSIONS: { key: string; label: string; description: string }[] = [
  { key: "bookings", label: "Prenotazioni", description: "Vede e gestisce le prenotazioni" },
  { key: "check_in", label: "Check-in QR", description: "Può fare check-in con QR code" },
  { key: "bar_orders", label: "Ordini bar", description: "Vede e gestisce gli ordini del bar" },
  { key: "analytics", label: "Statistiche e fatturato", description: "Vede incassi e statistiche" },
  { key: "pricing", label: "Prezzi e tariffe", description: "Può modificare i prezzi" },
  { key: "settings", label: "Impostazioni", description: "Accede alle impostazioni stabilimento" },
];

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  bookings: true,
  check_in: true,
  bar_orders: true,
  analytics: false,
  pricing: false,
  settings: false,
};

type ModalMode = "create" | "permissions" | "password" | null;

export default function DipendentiPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Crea dipendente
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modifica permessi
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Reset password
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState("");

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

  function closeModal() {
    setModal(null);
    setSelectedMember(null);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
    setShowPassword(false);
    setNewPermissions(DEFAULT_PERMISSIONS);
    setCreateError("");
    setResetPassword("");
    setShowResetPassword(false);
    setResetError("");
  }

  async function handleCreate() {
    if (!establishmentId || !newName || !newEmail || !newPassword) return;
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/dipendenti/crea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment_id: establishmentId,
        full_name: newName,
        email: newEmail,
        password: newPassword,
        phone: newPhone || null,
        role: "employee",
        permissions: newPermissions,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setCreateError(json.error || "Errore nella creazione.");
      setCreating(false);
      return;
    }

    closeModal();
    await loadMembers();
    setCreating(false);
  }

  function openPermissionsModal(member: Member) {
    setSelectedMember(member);
    setEditPermissions({ ...member.permissions });
    setModal("permissions");
  }

  async function savePermissions() {
    if (!selectedMember) return;
    setSavingPermissions(true);

    const supabase = createClient();
    await supabase
      .from("establishment_members")
      .update({ permissions: editPermissions })
      .eq("id", selectedMember.id);

    setMembers(
      members.map((m) =>
        m.id === selectedMember.id ? { ...m, permissions: editPermissions } : m
      )
    );
    setSavingPermissions(false);
    closeModal();
  }

  function openPasswordModal(member: Member) {
    setSelectedMember(member);
    setModal("password");
  }

  async function handleResetPassword() {
    if (!selectedMember || !establishmentId || !resetPassword) return;
    setResettingPassword(true);
    setResetError("");

    const res = await fetch("/api/dipendenti/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment_id: establishmentId,
        user_id: selectedMember.user_id,
        new_password: resetPassword,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setResetError(json.error || "Errore nel reset password.");
      setResettingPassword(false);
      return;
    }

    setResettingPassword(false);
    closeModal();
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
    if (!confirm("Sei sicuro di voler rimuovere questo dipendente?")) return;
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
        <Button variant="brand" onClick={() => setModal("create")}>
          <UserPlus className="h-4 w-4" />
          Nuovo dipendente
        </Button>
      </div>

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
                    {(member.user_profiles?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.user_profiles?.full_name || "Utente"}
                      </p>
                      <Badge variant={member.role === "admin" ? "available" : "outline"}>
                        {member.role === "admin" ? "Admin" : "Dipendente"}
                      </Badge>
                      {!member.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disattivato
                        </Badge>
                      )}
                    </div>
                    {member.user_profiles?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {member.user_profiles.phone}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {PERMISSIONS.filter((p) => member.permissions?.[p.key]).map((p) => (
                        <Badge key={p.key} variant="secondary" className="text-xs">
                          {p.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {member.role !== "admin" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPermissionsModal(member)}
                      title="Modifica permessi"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Permessi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordModal(member)}
                      title="Cambia password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(member)}
                    >
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crea Dipendente */}
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuovo dipendente</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {createError && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {createError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome e cognome *</label>
                <Input
                  placeholder="Mario Rossi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="mario@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Telefono</label>
                <Input
                  placeholder="+39 333 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Password *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caratteri"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Il dipendente userà questa password per accedere.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Permessi</label>
                <div className="space-y-2 rounded-lg border p-3">
                  {PERMISSIONS.map((p) => (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-start gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={newPermissions[p.key] ?? false}
                        onChange={(e) =>
                          setNewPermissions({ ...newPermissions, [p.key]: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-brand-azure"
                      />
                      <div>
                        <p className="text-sm font-medium leading-none">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>
                Annulla
              </Button>
              <Button
                variant="brand"
                className="flex-1"
                disabled={creating || !newName || !newEmail || !newPassword}
                onClick={handleCreate}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Crea account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Permessi */}
      {modal === "permissions" && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Permessi</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedMember.user_profiles?.full_name || "Dipendente"}
                </p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {PERMISSIONS.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={editPermissions[p.key] ?? false}
                    onChange={(e) =>
                      setEditPermissions({ ...editPermissions, [p.key]: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-brand-azure"
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>
                Annulla
              </Button>
              <Button
                variant="brand"
                className="flex-1"
                disabled={savingPermissions}
                onClick={savePermissions}
              >
                {savingPermissions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Salva
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {modal === "password" && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Cambia password</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedMember.user_profiles?.full_name || "Dipendente"}
                </p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {resetError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Nuova password *</label>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Minimo 6 caratteri"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Il dipendente potrà accedere con questa nuova password.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>
                Annulla
              </Button>
              <Button
                variant="brand"
                className="flex-1"
                disabled={resettingPassword || !resetPassword}
                onClick={handleResetPassword}
              >
                {resettingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Salva password
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
