import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSignAppEnabled } from "@/platform/env/flags";
import { sessionCookieName } from "@/platform/auth/constants";
import { buildLoginHref } from "@/platform/auth/redirect";
import { requiresCustomerSession, signGatedRoute } from "@/modules/sign/launch";

/** Sign launch switch: while SIGN_APP_ENABLED is not "true", app routes and auth APIs 404. */
function signLaunchGate(pathname: string): NextResponse | null {
  const gated = signGatedRoute(pathname);
  if (!gated || isSignAppEnabled()) return null;
  const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  if (gated === "api") {
    return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404, headers });
  }
  return new NextResponse("Not Found", {
    status: 404,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/tools/sign") ||
    pathname.startsWith("/api/platform") ||
    pathname.startsWith("/api/tools/sign")
  ) {
    const gated = signLaunchGate(pathname);
    if (gated) return gated;
    // Signed-out visitors to app pages go to login with a safe `next`. Cookie presence only:
    // the real session check is requireCustomer() in each page and handler.
    if (requiresCustomerSession(pathname) && !req.cookies.get(sessionCookieName())?.value) {
      return NextResponse.redirect(new URL(buildLoginHref(`${pathname}${req.nextUrl.search}`), req.url));
    }
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login" || pathname === "/login";

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!token) {
    // Server Actions POST to the page URL. Redirecting them to the HTML login
    // page makes the client throw "An unexpected response was received from the server."
    if (req.headers.has("next-action")) {
      return NextResponse.next();
    }
    const signInUrl = new URL("/admin/login", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith("/admin/platform") && !token.isSuperAdmin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/tools/sign/:path*", "/api/platform/:path*", "/api/tools/sign/:path*"],
};
