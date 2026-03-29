import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Aggiorna la sessione Supabase
  const response = await updateSession(request);

  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Proteggi le route /admin (solo super admin)
  if (pathname.startsWith("/admin")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Verifica che sia super admin (email nella lista)
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it").split(",");
    if (!superAdminEmails.includes(user.email || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Proteggi le route /dashboard
  if (pathname.startsWith("/dashboard")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Se l'utente è già loggato e va su /auth/*, redirect a dashboard
  if (pathname.startsWith("/auth/")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const url = request.nextUrl.clone();
      // Super admin? Vai a /admin
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it").split(",");
      if (superAdminEmails.includes(user.email || "")) {
        url.pathname = "/admin";
      } else {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }
  }

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
