import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and NextAuth routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/test') ||
    pathname.startsWith('/api/debug') ||
    pathname.startsWith('/api/loyalty') ||
    pathname.startsWith('/api/upload') ||  // Skip authentication for upload API
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  try {
    // Get token with proper error handling for Vercel
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      // Add cookieName for better compatibility
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      // Add secure flag for production
      secureCookie: process.env.NODE_ENV === 'production',
    });

    const isAuthPage = pathname === "/login";
    const isHomePage = pathname === "/";
    
    // Define protected pages (everything except login and home)
    const isProtectedPage = !isAuthPage && !isHomePage;

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("Middleware Debug:", {
        path: pathname,
        hasToken: !!token,
        isAuthPage,
        isProtectedPage,
        userAgent: request.headers.get('user-agent')?.slice(0, 50),
      });
    }

    // If user is authenticated and trying to access login page
    if (token && isAuthPage) {
      console.log("Redirecting authenticated user from login to home");
      return NextResponse.redirect(new URL("/", request.url));
    }

    // If user is not authenticated and trying to access protected page
    if (!token && isProtectedPage) {
      console.log("Redirecting unauthenticated user to login from:", pathname);
      const loginUrl = new URL("/login", request.url);
      // Optionally add a return URL parameter
      if (pathname !== "/") {
        loginUrl.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Allow the request to continue
    return NextResponse.next();

  } catch (error) {
    console.error("Middleware error:", error);
    
    // If there's an error getting the token and it's a protected page, redirect to login
    if (pathname !== "/login" && pathname !== "/") {
      console.log("Token error, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, and other static assets
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
