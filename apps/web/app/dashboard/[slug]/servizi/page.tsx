"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Package, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Service {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
}

export default function ServiziPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadServices() {
    const supabase = createClient();
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!est) return;
    setEstablishmentId(est.id);

    const { data } = await supabase
      .from("additional_services")
      .select("*")
      .eq("establishment_id", est.id)
      .order("sort_order", { ascending: true });

    if (data) setServices(data);
    setLoading(false);
  }

  async function addService() {
    if (!establishmentId || !newName || !newPrice) return;
    setAdding(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("additional_services")
      .insert({
        establishment_id: establishmentId,
        name: newName,
        description: newDescription,
        price_cents: Math.round(parseFloat(newPrice) * 100),
        is_active: true,
        sort_order: services.length,
      })
      .select()
      .single();

    if (!error && data) {
      setServices([...services, data]);
      setNewName("");
      setNewDescription("");
      setNewPrice("");
      setShowAdd(false);
    }
    setAdding(false);
  }

  async function toggleActive(service: Service) {
    const supabase = createClient();
    const newActive = !service.is_active;
    await supabase
      .from("additional_services")
      .update({ is_active: newActive })
      .eq("id", service.id);

    setServices(
      services.map((s) =>
        s.id === service.id ? { ...s, is_active: newActive } : s
      )
    );
  }

  async function deleteService(id: string) {
    const supabase = createClient();
    await supabase.from("additional_services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
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
          <h1 className="text-2xl font-bold">Servizi extra</h1>
          <p className="text-muted-foreground">
            Servizi aggiuntivi prenotabili dai clienti.
          </p>
        </div>
        <Button variant="brand" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Aggiungi servizio
        </Button>
      </div>

      {showAdd && (
        <Card className="border-brand-azure/30">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <Input
                  placeholder="Es. Asciugamano"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Descrizione</label>
                <Input
                  placeholder="Telo mare grande"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Prezzo (&euro;)</label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="5.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="brand" onClick={addService} disabled={adding || !newName || !newPrice}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Aggiungi
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-6">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-center text-muted-foreground">
              Nessun servizio aggiuntivo configurato.
            </p>
            <Button variant="brand" size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Aggiungi il primo servizio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <Card key={service.id} className={!service.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground/30" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{service.name}</p>
                      {!service.is_active && <Badge variant="outline">Disattivato</Badge>}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">
                    {(service.price_cents / 100).toFixed(2)}&euro;
                  </span>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(service)}>
                    {service.is_active ? "Disattiva" : "Attiva"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteService(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
