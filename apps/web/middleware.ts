import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Aggiorna la sessione Supabase
  const response = await updateSession(request);

  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Estrai subdomain (ignora www e il dominio base)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "lidofacile.it";
  const subdomain = hostname
    .replace(`.${baseDomain}`, "")
    .replace(`:${request.nextUrl.port}`, "");

  // Se è il dominio principale o localhost, prosegui normalmente
  if (
    subdomain === hostname ||
    subdomain === "www" ||
    subdomain === "localhost" ||
    subdomain === "dashboard"
  ) {
    return response;
  }

  // Altrimenti è un subdomain di stabilimento: riscrivi su /lido/[slug]
  const url = request.nextUrl.clone();
  url.pathname = `/lido/${subdomain}${pathname}`;

  return NextResponse.rewrite(url, {
    headers: response.headers,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
