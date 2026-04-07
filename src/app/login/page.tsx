/**
 * LOGIN PAGE (login/page.tsx)
 * --------------------------
 * Functionality: Main entry port for borrowers and admins to access the system.
 * Connection: Submits user credentials to 'signIn' in auth.ts.
 */
/**
 * REGISTRATION PAGE (register/page.tsx)
 * ------------------------------------
 * Functionality: Allows new users (Students/Faculty) to create an account.
 * Connection: Connects to 'signUp' in auth.ts and uses 'registerSchema' for validation.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signInWithGoogle } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Monitor, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { TwoFactorVerify } from "@/components/auth/TwoFactorVerify";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");

  /**
   * LOGIN SUBMISSION
   * Functionality: Sends user email and password to the server.
   * Connection: Calls 'signIn' action in auth.ts.
   */
  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(formData);
      
      if (result && 'mfaRequired' in result) {
        setMfaRequired(true);
        setMfaEmail(result.email || "");
        return;
      }

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (e) {
      // redirect() from server action throws NEXT_REDIRECT — that's expected on success
      const message = e instanceof Error ? e.message : 'Something went wrong';
      if (!message.includes('NEXT_REDIRECT') && !message.includes('NEXT_JS_REDIRECT')) {
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (mfaRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fsuu-blue-900 via-fsuu-blue-800 to-fsuu-blue-700 p-4 font-sans">
        <TwoFactorVerify email={mfaEmail} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fsuu-blue-900 via-fsuu-blue-800 to-fsuu-blue-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-fsuu-blue-600 shadow-lg">
            <Monitor className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-fsuu-blue-800">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Sign in to the PMO Equipment Booking System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">FSUU Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.name@fsuu.edu.ph"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" variant="fsuu" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-6" 
              onClick={() => {
                setLoading(true);
                signInWithGoogle();
              }}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-fsuu-blue-600 hover:underline">
              Register here
            </Link>
          </p>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            &larr; Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
