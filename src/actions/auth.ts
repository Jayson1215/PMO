/**
 * AUTHENTICATION ACTIONS (auth.ts)
 * -----------------------------
 * Functionality: Handles user sessions, login/logout, and Two-Factor Authentication (2FA).
 * Connection: Integrates Supabase Auth with our custom 'profiles' database table.
 */
'use server';


import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@/lib/validations';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { generateSecret, verify, generateURI } from 'otplib';
import { generateQRCode } from '@/lib/qrcode';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Otplib v13 uses a functional API for better tree-shaking and multi-runtime support



/**
 * SIGN IN FUNCTIONality
 * Verification: Uses Supabase Auth to check email/password.
 * Connection: Redirects users to Dashboard or Admin page based on their role.
 */
export async function signIn(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const result = loginSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (user) {
    // Check if 2FA is enabled for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, two_factor_enabled')
      .eq('id', user.id)
      .single();

    if (profile?.two_factor_enabled) {
      return { mfaRequired: true, email: result.data.email };
    }

    const redirectPath = (profile as any)?.role === 'admin' ? '/admin' : '/dashboard';
    revalidatePath('/', 'layout');
    redirect(redirectPath);
  }

  redirect('/dashboard');
}

/**
 * SIGN IN WITH GOOGLE
 * Functionality: Redirects the user to Google for OAuth authentication.
 * Connection: Uses Supabase OAuth with a redirect callback.
 */
export async function signInWithGoogle() {
  const supabase = await createServerSupabaseClient();
  // Use the configured app URL, or Vercel's auto-provided URL, or fallback to localhost
  const origin = process.env.NEXT_PUBLIC_APP_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

/**
 * 2FA LOGIN VERIFICATION
 * Functionality: Validates the 6-digit TOTP code during login.
 * Connection: Fetches the 'two_factor_secret' from the 'profiles' table.
 */
export async function verify2FALogin(email: string, code: string) {
  const supabase = await createServerSupabaseClient();
  
  // Get the user profile to get the secret
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, two_factor_secret')
    .eq('email', email)
    .single();

  if (!profile || !profile.two_factor_secret) {
    return { error: 'Invalid authentication state' };
  }

  const result = await verify({
    token: code,
    secret: profile.two_factor_secret,
  });
  
  const isValid = result.valid;


  if (!isValid) {
    // If invalid, sign out the user because they were technically signed in by signInWithPassword
    await supabase.auth.signOut();
    return { error: 'Invalid security code. Please try again.' };
  }

  const redirectPath = profile.role === 'admin' ? '/admin' : '/dashboard';
  revalidatePath('/', 'layout');
  redirect(redirectPath);
}

/**
 * GENERATE 2FA SECRET
 * Functionality: Creates a unique encryption key and QR code for Google Authenticator.
 * Connection: Uses 'otplib' for TOTP generation and 'qrcode' for visualization.
 */
export async function generate2FASecret() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: 'PMO-FSUU',
    label: user.email!,
    secret: secret,
  });
  const qrCodeUrl = await generateQRCode(otpauth);

  return { secret, qrCodeUrl };
}

export async function enable2FA(secret: string, code: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const result = await verify({
    token: code,
    secret: secret,
  });
  
  const isValid = result.valid;


  if (!isValid) {
    return { error: 'Invalid verification code' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      two_factor_secret: secret,
      two_factor_enabled: true,
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/settings', 'page');
  return { success: true };
}

export async function disable2FA() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      two_factor_secret: null,
      two_factor_enabled: false,
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/settings', 'page');
  return { success: true };
}

/**
 * SIGN UP (REGISTRATION)
 * Functionality: Creates a new user account in Supabase Auth.
 * Connection: Automatically triggers a database function to create a entry in 'profiles'.
 */
export async function signUp(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    fullName: formData.get('fullName') as string,
    department: formData.get('department') as string,
    contactNumber: formData.get('contactNumber') as string,
  };

  const result = registerSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
        department: result.data.department,
        contact_number: result.data.contactNumber,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Account created! Please check your email to verify your account.' };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile;
  } catch (e) {
    console.error('getCurrentUser exception:', e);
    return null;
  }
});
