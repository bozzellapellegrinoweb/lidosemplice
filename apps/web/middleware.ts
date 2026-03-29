import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
