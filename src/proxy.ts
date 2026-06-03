import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/director", "/admin", "/profesor", "/alumno", "/administrativo"];

// Rutas de /admin exclusivas del director — el rol 'administrativo' es bloqueado
const ADMIN_ONLY_ROUTES = [
  "/director/users",
  "/director/teachers",
  "/director/courses",
  "/director/teacher-evaluations",
  "/director/assessments",
  "/director/year-end",
  "/director/marketing",
  "/director/promotions",
  "/director/profile",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the session and refreshes the access token if needed.
  // It also clears stale/invalid tokens from the response cookies automatically.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Bloquear al rol 'administrativo' de rutas exclusivas del director
  if (user && pathname.startsWith("/director")) {
    const role = user.user_metadata?.role as string | undefined;
    if (role === "administrativo") {
      const isRestricted = ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r));
      if (isRestricted) {
        return NextResponse.redirect(new URL("/403", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
