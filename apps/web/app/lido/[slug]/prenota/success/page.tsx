"use client";

import { Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const METHOD_LABELS: Record<string, string> = {
  satispay: "Satispay",
  revolut: "RevolutPay",
  stripe: "Carta di credito",
  paypal: "PayPal",
  bonifico: "Bonifico bancario",
  cash: "Contante",
};

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const bookingCode = searchParams.get("booking_code") ?? "";
  const method = searchParams.get("method") ?? "";
  const qrToken = searchParams.get("qr_token") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Check className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="mb-2 text-2xl font-black">Pagamento ricevuto!</h1>
        <p className="mb-6 text-muted-foreground">
          Il tuo pagamento tramite <strong>{METHOD_LABELS[method] ?? method}</strong> è andato a buon fine.
          Riceverai una email di conferma a breve.
        </p>

        {bookingCode && (
          <div className="mb-4 rounded-xl border bg-muted/50 p-5">
            <p className="text-sm text-muted-foreground">Codice prenotazione</p>
            <p className="mt-1 font-mono text-xl font-bold text-brand-azure">{bookingCode}</p>
          </div>
        )}

        {qrToken && (
          <div className="mb-6 text-center">
            <p className="mb-2 text-sm text-muted-foreground">Mostra questo QR al check-in</p>
            <div className="mx-auto inline-block rounded-2xl border-4 border-brand-azure bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrToken}`}
                alt="QR check-in"
                width={200}
                height={200}
                className="block"
              />
            </div>
          </div>
        )}

        <Button variant="brand" size="lg" className="w-full" asChild>
          <Link href={`/lido/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
            Torna alla pagina del lido
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PrenotaSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
