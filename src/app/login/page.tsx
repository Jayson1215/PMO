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
import { signIn } from "@/actions/auth";
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
