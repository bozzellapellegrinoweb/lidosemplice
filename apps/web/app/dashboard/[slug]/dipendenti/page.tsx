"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Shield, Trash2, UserPlus } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "employee";
  isActive: boolean;
  permissions: string[];
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "1", name: "Marco Bagnino", email: "marco@lidoazzurro.it", phone: "+39 333 1111111",
    role: "employee", isActive: true, permissions: ["check_in", "bar_orders"],
  },
  {
    id: "2", name: "Laura Receptionist", email: "laura@lidoazzurro.it", phone: "+39 333 2222222",
    role: "employee", isActive: true, permissions: ["check_in", "bookings", "bar_orders"],
  },
  {
    id: "3", name: "Fabio Bar", email: "fabio@lidoazzurro.it", phone: "+39 333 3333333",
    role: "employee", isActive: true, permissions: ["bar_orders"],
  },
  {
    id: "4", name: "Chiara Stagista", email: "chiara@lidoazzurro.it", phone: "+39 333 4444444",
    role: "employee", isActive: false, permissions: ["check_in"],
  },
];

const PERMISSION_LABELS: Record<string, string> = {
  check_in: "Check-in",
  bookings: "Prenotazioni",
  bar_orders: "Ordini bar",
  pricing: "Prezzi",
  analytics: "Statistiche",
  settings: "Impostazioni",
};

export default function DipendentiPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

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

      {/* Invito */}
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
              <Button variant="brand" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>
                <Mail className="h-4 w-4" />
                Invia invito
              </Button>
              <Button variant="outline" onClick={() => setShowInvite(false)}>
                Annulla
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Il dipendente ricevera un email con il link per registrarsi e accedere al gestionale.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista dipendenti */}
      <div className="space-y-3">
        {employees.map((emp) => (
          <Card key={emp.id} className={!emp.isActive ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-azure/10 text-lg font-bold text-brand-azure">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{emp.name}</p>
                    {!emp.isActive && <Badge variant="outline">Disattivato</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {emp.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {emp.phone}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    {emp.permissions.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {PERMISSION_LABELS[p]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4" />
                  Permessi
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
