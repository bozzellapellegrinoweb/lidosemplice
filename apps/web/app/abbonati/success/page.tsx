"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B1829] to-[#1a3a5c] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#00F0B5]/20">
          <CheckCircle className="h-10 w-10 text-[#00F0B5]" />
        </div>
        <h1 className="mb-2 text-2xl font-black text-[#0B1829]">Abbonamento attivato!</h1>
        <p className="mb-8 text-gray-500">
          Grazie per aver scelto LidoFacile. Il tuo abbonamento annuale è ora attivo.
        </p>
        {slug ? (
          <Link
            href={`/dashboard/${slug}`}
            className="inline-block rounded-xl bg-[#0B1829] px-8 py-3 font-bold text-white transition hover:bg-[#0B1829]/80"
          >
            Vai alla dashboard
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="inline-block rounded-xl bg-[#0B1829] px-8 py-3 font-bold text-white transition hover:bg-[#0B1829]/80"
          >
            Accedi
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
