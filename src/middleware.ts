import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';

  // Define protected paths that should be blocked in waitlist mode
  const protectedPaths = [
    '/dashboard',
    '/sign-in',
    '/sign-up',
    '/auth',
    '/forgot-password',
    '/flashcards',
    '/upload',
    '/quiz',
    '/pricing',
    '/success'
  ];

  // Define protected API routes that should be blocked in waitlist mode
  const protectedApiRoutes = [
    '/api/ai',
    '/api/documents',
    '/api/study',
    '/api/enhanced-generate',
    '/api/dashboard',
    '/api/voice',
    '/api/chat',
    '/api/modules',
    '/api/youtube'
  ];

  const currentPath = req.nextUrl.pathname;

  // If we're in waitlist mode, block access to protected paths and APIs
  if (isWaitlistMode) {
    // Check if current path is a protected path
    const isProtectedPath = protectedPaths.some(path => 
      currentPath.startsWith(path)
    );

    // Check if current path is a protected API route
    const isProtectedApiRoute = protectedApiRoutes.some(route => 
      currentPath.startsWith(route)
    );

    if (isProtectedPath) {
      // Redirect to home page with waitlist
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (isProtectedApiRoute) {
      // Return 403 Forbidden for API calls
      return NextResponse.json(
        { 
          error: "Service unavailable - We're in waitlist mode. Join our waitlist to be notified when we launch!",
          code: "WAITLIST_MODE_ACTIVE"
        },
        { status: 403 }
      );
    }
  }

  // If not in waitlist mode, proceed with normal authentication logic
  if (!isWaitlistMode) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(({ name, value }) => ({
              name,
              value,
            }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value);
              res.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // Protected premium routes
    const premiumRoutes = ["/flashcards", "/upload", "/quiz"];

    // Check if the current path is a premium route
    const isPremiumRoute = premiumRoutes.some((route) =>
      req.nextUrl.pathname.startsWith(route),
    );

    if (isPremiumRoute) {
      // For premium routes, check if user is authenticated and has premium access
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to sign in if not authenticated
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }

      // Check if user has premium status
      const isPremium = user.user_metadata?.is_pro === true;

      if (!isPremium) {
        // Redirect to pricing page if not premium
        return NextResponse.redirect(new URL("/pricing", req.url));
      }
    }

    // Regular auth protection for dashboard
    if (req.nextUrl.pathname.startsWith("/dashboard") && error) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Redirect authenticated users from home page to dashboard
    if (req.nextUrl.pathname === "/" && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api/payments/webhook (webhook endpoints)
     * - api/waitlist (allow waitlist API)
     * - api/contact (allow contact API)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/payments/webhook|api/waitlist|api/contact).*)",
  ],
};
