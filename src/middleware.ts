import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    const isAdmin = token?.role === "ADMIN" || token?.role === "SUPER_ADMIN";
    const isLoginPage = pathname === "/admin/login" || pathname === "/login";

    // If logged in and trying to access login page, redirect to admin dashboard
    if (token && isLoginPage) {
      if (pathname !== "/admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // If NOT logged in (or not admin) and trying to access protected /admin routes
    if (!token || !isAdmin) {
      if (!isLoginPage && pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Redirect generic /login to /admin/login for consistency
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        // Always allow access to login pages so the middleware function can handle the redirect logic
        if (pathname === "/admin/login" || pathname === "/login") {
          return true;
        }
        // For all other routes in the matcher, require a token
        return !!token;
      },
    },
    pages: {
      signIn: "/admin/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
