import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/auth/callback']);
const AUTH_LOOKUP_TIMEOUT_MS = 2000;

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))
    .forEach(({ name }) => {
      request.cookies.delete(name);
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/',
      });
    });
}

function isRefreshTokenNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'refresh_token_not_found'
  );
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]) as Promise<T | null>;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 1. FAST PATH: Public routes don't need Supabase or Auth checks
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Safety: if Supabase env vars are missing, let the request through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    let user = null;

    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        AUTH_LOOKUP_TIMEOUT_MS
      );

      if (authResult) {
        user = authResult.data.user;
      }
    } catch (error) {
      if (isRefreshTokenNotFoundError(error)) {
        clearSupabaseAuthCookies(request, supabaseResponse);
      } else {
        throw error;
      }
    }

    // Redirect unauthenticated users to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Note: Admin/Role checks are handled in layout.tsx to keep middleware fast
    return supabaseResponse;
  } catch (e) {
    // If anything fails in middleware, let the request through
    // rather than returning a 500 error
    if (!isRefreshTokenNotFoundError(e)) {
      console.error('Middleware error:', e);
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
