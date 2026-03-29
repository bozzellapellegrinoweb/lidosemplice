import { NextResponse, type NextRequest } from "next/server";

/** Decodifica il payload JWT senza verifica firma (sicuro per middleware Edge) */
function decodeJwtPayload(token: string): { email?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/** Legge la sessione Supabase dai cookie senza SDK */
function getSessionFromCookies(request: NextRequest): { email?: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // Cookie name: sb-<project-ref>-auth-token
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\./);
  const projectRef = match?.[1] ?? "";
  const cookieName = `sb-${projectRef}-auth-token`;

  // Supabase può dividere il token in chunk: sb-...-auth-token.0, .1, ecc.
  let rawToken = request.cookies.get(cookieName)?.value;

  if (!rawToken) {
    // Prova con chunk 0
    rawToken = request.cookies.get(`${cookieName}.0`)?.value;
    if (rawToken) {
      // Ricomponi i chunk
      let i = 1;
      let chunk = request.cookies.get(`${cookieName}.${i}`)?.value;
      while (chunk) {
        rawToken += chunk;
        i++;
        chunk = request.cookies.get(`${cookieName}.${i}`)?.value;
      }
    }
  }

  if (!rawToken) return null;

  try {
    // Il valore è JSON: {"access_token":"...","..."}
    const session = JSON.parse(decodeURIComponent(rawToken));
    const accessToken = session?.access_token;
    if (!accessToken) return null;
    const payload = decodeJwtPayload(accessToken);
    if (!payload) return null;
    // Verifica scadenza
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const session = getSessionFromCookies(request);
  const userEmail = session?.email ?? null;
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it")
    .split(",")
    .map((e) => e.trim());

  // Proteggi le route /admin (solo super admin)
  if (pathname.startsWith("/admin")) {
    if (!userEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    if (!superAdminEmails.includes(userEmail)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Proteggi le route /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!userEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Se l'utente è già loggato e va su /auth/*, redirect a dashboard
  if (pathname.startsWith("/auth/")) {
    if (userEmail) {
      const url = request.nextUrl.clone();
      url.pathname = superAdminEmails.includes(userEmail) ? "/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Gestione subdomain: riscrivi su /lido/[slug]
  const hostname = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "lidofacile.it";
  const subdomain = hostname
    .replace(`.${baseDomain}`, "")
    .replace(`:${request.nextUrl.port}`, "");

  if (
    subdomain === hostname ||
    subdomain === "www" ||
    subdomain === "localhost" ||
    subdomain === "dashboard"
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/lido/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
