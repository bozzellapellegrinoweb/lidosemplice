import { NextResponse, type NextRequest } from "next/server";

function getEmailFromCookies(request: NextRequest): string | null {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\./);
    const projectRef = match?.[1] ?? "";
    const cookieName = `sb-${projectRef}-auth-token`;

    let raw = request.cookies.get(cookieName)?.value;
    if (!raw) {
      raw = request.cookies.get(`${cookieName}.0`)?.value ?? "";
      let i = 1;
      let chunk = request.cookies.get(`${cookieName}.${i}`)?.value;
      while (chunk) { raw += chunk; i++; chunk = request.cookies.get(`${cookieName}.${i}`)?.value; }
    }
    if (!raw) return null;

    const session = JSON.parse(decodeURIComponent(raw));
    const token = session?.access_token;
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const email = getEmailFromCookies(request);
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS || "info@lido-facile.it").split(",").map(e => e.trim());

  // Proteggi /admin
  if (pathname.startsWith("/admin")) {
    if (!email) return NextResponse.redirect(new URL("/auth/login", request.url));
    if (!superAdmins.includes(email)) return NextResponse.redirect(new URL("/", request.url));
  }

  // Proteggi /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!email) return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect da /auth se già loggato
  if (pathname.startsWith("/auth/") && email) {
    return NextResponse.redirect(new URL(superAdmins.includes(email) ? "/admin" : "/dashboard", request.url));
  }

  // Subdomain routing
  const hostname = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "lidofacile.it";
  const subdomain = hostname.replace(`.${baseDomain}`, "").replace(`:${request.nextUrl.port}`, "");

  if (subdomain === hostname || subdomain === "www" || subdomain === "localhost" || subdomain === "lidofacile" || subdomain === "dashboard") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/lido/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
