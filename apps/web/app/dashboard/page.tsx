import { redirect } from "next/navigation";

// Redirect alla dashboard del primo stabilimento dell'utente
// Per ora redirect a una pagina placeholder
export default function DashboardIndex() {
  // TODO: fetch stabilimenti dell'utente e redirect al primo
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Benvenuto su LidoFacile</h1>
        <p className="mt-2 text-muted-foreground">
          Seleziona il tuo stabilimento per iniziare.
        </p>
      </div>
    </div>
  );
}
