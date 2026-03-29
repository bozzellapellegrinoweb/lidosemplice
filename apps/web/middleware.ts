import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Subdomain routing (non richiede auth)
  const hostname = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "lidofacile.it";
  const subdomain = hostname
    .replace(`.${baseDomain}`, "")
    .replace(`:${request.nextUrl.port}`, "");

  const isSubdomain =
    subdomain !== hostname &&
    subdomain !== "www" &&
    subdomain !== "localhost" &&
    subdomain !== "lidofacile" &&
    subdomain !== "dashboard" &&
    !hostname.includes("vercel.app") &&
    !hostname.includes("localhost");

  if (isSubdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/lido/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Auth check solo per route protette
  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin");

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Crea client Supabase per leggere la sessione dai cookie
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Admin check
  if (pathname.startsWith("/admin")) {
    const superAdmins = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it")
      .split(",")
      .map((e) => e.trim());
    if (!superAdmins.includes(user.email || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
