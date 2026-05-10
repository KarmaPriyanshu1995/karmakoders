import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow login page
    if (pathname === "/admin/login") return NextResponse.next();

    // Must be authenticated admin
    const isAdmin = token?.role === "ADMIN" || token?.role === "SUPER_ADMIN";
    if (!token || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Login page is always accessible
        if (pathname === "/admin/login") return true;
        // All other /admin/* routes require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
