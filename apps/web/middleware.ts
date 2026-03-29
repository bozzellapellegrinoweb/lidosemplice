import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

export async function middleware(request: NextRequest) {
  // Se mancano le env vars di Supabase, lascia passare senza auth
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let user = null;
  let getResponse = () => NextResponse.next();

  try {
    const client = createSupabaseMiddlewareClient(request);
    getResponse = client.getResponse;
    // Usa getSession invece di getUser: legge il cookie localmente senza network call
    const { data } = await client.supabase.auth.getSession();
    user = data.session?.user ?? null;
  } catch {
    // Se qualcosa va storto, lascia passare
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Proteggi le route /admin (solo super admin)
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it").split(",");
    if (!superAdminEmails.includes(user.email || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Proteggi le route /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Se l'utente è già loggato e va su /auth/*, redirect a dashboard
  if (pathname.startsWith("/auth/")) {
    if (user) {
      const url = request.nextUrl.clone();
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it").split(",");
      if (superAdminEmails.includes(user.email || "")) {
        url.pathname = "/admin";
      } else {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }
  }

  const response = getResponse();

  // Estrai subdomain (ignora www e il dominio base)
  const hostname = request.headers.get("host") || "";
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
