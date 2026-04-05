/**
 * SUPABASE BROWSER CLIENT (supabase/client.ts)
 * -------------------------------------------
 * Functionality: Creates a connection to Supabase that runs in the user's browser (Client-side).
 * Connection: Used by 'Real-time' hooks to listen for live database changes.
 */
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * BROWSER CLIENT
 * Functionality: Returns a client instance that can be used inside 'use client' components.
 */
export function createBrowserClient() {
  return createSSRBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
