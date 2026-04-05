'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { verify2FALogin } from '@/actions/auth';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface TwoFactorVerifyProps {
  email: string;
}

export function TwoFactorVerify({ email }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verify2FALogin(email, code);
      if (result && 'error' in result) {
        toast.error(result.error);
      }
      // If result is undefined/null, it means redirect happened (success)
    } catch (error) {
       // Resulting redirect from signIn will trigger an error here, but we can ignore it if redirect happens
      // Actually, since it's a server action with redirect, it shouldn't catch unless it fails.
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/10">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Enter Security Code</CardTitle>
        <CardDescription>
          Your account is protected with Two-Factor Authentication. 
          Enter the 6-digit code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            placeholder="000 000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="text-center text-3xl h-14 tracking-[0.4em] font-mono font-bold"
            autoFocus
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button 
          className="w-full h-11 text-base font-semibold" 
          variant="fsuu"
          onClick={handleVerify}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            'Verify and Sign In'
          )}
        </Button>
        <Button 
          variant="link" 
          className="text-muted-foreground text-sm"
          onClick={() => window.location.reload()}
          disabled={isLoading}
        >
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  );
}
