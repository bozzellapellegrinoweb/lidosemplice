import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Mail, Phone, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUtenti() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Per ogni utente, prendi i suoi stabilimenti
  const enriched = await Promise.all(
    (users || []).map(async (user) => {
      const { data: memberships } = await supabase
        .from("establishment_members")
        .select("role, establishments(name, slug)")
        .eq("user_id", user.id);

      return { ...user, memberships: memberships || [] };
    })
  );

  const roleLabels: Record<string, { label: string; variant: "available" | "partial" | "outline" }> = {
    admin: { label: "Admin", variant: "available" },
    employee: { label: "Dipendente", variant: "partial" },
    owner: { label: "Proprietario", variant: "available" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utenti</h1>
          <p className="text-muted-foreground">
            Tutti gli utenti registrati sulla piattaforma.
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {enriched.length} totali
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {enriched.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">Nessun utente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Utente</th>
                    <th className="px-5 py-3 font-medium">Contatto</th>
                    <th className="px-5 py-3 font-medium">Stabilimenti</th>
                    <th className="px-5 py-3 font-medium">Registrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enriched.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-azure/10 text-sm font-semibold text-brand-azure">
                            {(user.first_name?.[0] || "?").toUpperCase()}
                            {(user.last_name?.[0] || "").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.first_name || ""} {user.last_name || ""}
                            </p>
                            {user.fiscal_code && (
                              <p className="text-xs text-muted-foreground">
                                CF: {user.fiscal_code}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          {user.email && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {user.email}
                            </p>
                          )}
                          {user.phone && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {user.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {user.memberships.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.memberships.map((m: { role: string; establishments: unknown }, i: number) => {
                              const est = m.establishments as { name: string; slug: string } | null;
                              const r = roleLabels[m.role] || roleLabels.employee;
                              return (
                                <Badge key={i} variant={r.variant} className="gap-1 text-xs">
                                  <Building2 className="h-2.5 w-2.5" />
                                  {est?.name || "?"} ({r.label})
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString("it-IT")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
