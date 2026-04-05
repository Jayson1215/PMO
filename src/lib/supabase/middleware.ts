/**
 * SUPABASE MIDDLEWARE (supabase/middleware.ts)
 * -------------------------------------------
 * Functionality: Moniters every page request to keep the user's login session active.
 * Connection: Runs before any page is loaded to refresh the Supabase Auth token.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * UPDATE SESSION
 * Functionality: Checks if the user's token is about to expire and refreshes it.
 * Connection: Returns the updated Response with new session cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
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

  try {
    await supabase.auth.getUser();
  } catch (error: any) {
    if (error?.code === 'refresh_token_not_found') {
      // Clear cookies if the refresh token is missing or invalid
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-') && name.includes('auth-token')) {
          supabaseResponse.cookies.set(name, '', { maxAge: 0 });
        }
      });
    }
  }

  return supabaseResponse;
}
