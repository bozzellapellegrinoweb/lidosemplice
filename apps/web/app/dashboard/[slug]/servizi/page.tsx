"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Check,
  Package,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  isDaily: boolean;
  isActive: boolean;
  icon: string;
}

const MOCK_SERVICES: Service[] = [
  { id: "1", name: "Asciugamano mare", description: "Asciugamano grande in cotone", price: 15, isDaily: false, isActive: true, icon: "towel" },
  { id: "2", name: "Doccia calda", description: "Accesso alla doccia con acqua calda", price: 2, isDaily: true, isActive: true, icon: "shower" },
  { id: "3", name: "Parcheggio", description: "Posto auto riservato", price: 5, isDaily: true, isActive: true, icon: "car" },
  { id: "4", name: "Wifi Premium", description: "Connessione wifi ad alta velocita", price: 3, isDaily: true, isActive: true, icon: "wifi" },
  { id: "5", name: "Kit snorkeling", description: "Maschera e boccaglio a noleggio", price: 10, isDaily: false, isActive: false, icon: "waves" },
  { id: "6", name: "Cassaforte", description: "Cassetta di sicurezza sotto l'ombrellone", price: 5, isDaily: true, isActive: true, icon: "lock" },
];

export default function ServiziPage() {
  const [services, setServices] = useState(MOCK_SERVICES);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    name: "", description: "", price: "", isDaily: false,
  });

  function toggleActive(id: string) {
    setServices(services.map(s =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
  }

  function deleteService(id: string) {
    setServices(services.filter(s => s.id !== id));
  }

  function addService() {
    if (!newService.name || !newService.price) return;
    setServices([...services, {
      id: Date.now().toString(),
      name: newService.name,
      description: newService.description,
      price: parseFloat(newService.price),
      isDaily: newService.isDaily,
      isActive: true,
      icon: "package",
    }]);
    setNewService({ name: "", description: "", price: "", isDaily: false });
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servizi aggiuntivi</h1>
          <p className="text-muted-foreground">
            Configura i servizi extra che i clienti possono aggiungere alla prenotazione.
          </p>
        </div>
        <Button variant="brand" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Aggiungi servizio
        </Button>
      </div>

      {/* Form aggiungi */}
      {showAdd && (
        <Card className="border-brand-azure/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nuovo servizio</CardTitle>
            <button onClick={() => setShowAdd(false)} className="rounded-md p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input
                  placeholder="Es. Asciugamano mare"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prezzo (&euro;)</label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="15.00"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Descrizione</label>
                <Input
                  placeholder="Descrizione breve del servizio"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewService({ ...newService, isDaily: !newService.isDaily })}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors ${
                    newService.isDaily ? "bg-brand-azure" : "bg-muted"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      newService.isDaily ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm">Prezzo giornaliero (si applica per ogni giorno)</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
              <Button variant="brand" onClick={addService}>
                <Check className="h-4 w-4" />
                Salva servizio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista servizi */}
      <div className="space-y-3">
        {services.map((service) => (
          <Card key={service.id} className={!service.isActive ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-azure/10">
                  <Package className="h-5 w-5 text-brand-azure" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{service.name}</p>
                    {service.isDaily && (
                      <Badge variant="secondary" className="text-xs">
                        /giorno
                      </Badge>
                    )}
                    {!service.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Disattivato
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xl font-bold">{service.price}&euro;</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleActive(service.id)}
                    className={`flex h-6 w-11 items-center rounded-full transition-colors ${
                      service.isActive ? "bg-available" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        service.isActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
