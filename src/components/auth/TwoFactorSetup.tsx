'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generate2FASecret, enable2FA, disable2FA } from '@/actions/auth';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, Loader2, QrCode } from 'lucide-react';

interface TwoFactorSetupProps {
  isTwoFactorEnabled: boolean;
}

export function TwoFactorSetup({ isTwoFactorEnabled }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'initial' | 'setup' | 'enabled'>(
    isTwoFactorEnabled ? 'enabled' : 'initial'
  );
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const result = await generate2FASecret();
      if ('error' in result) {
        toast.error(result.error);
      } else {
        setSecret(result.secret);
        setQrCodeUrl(result.qrCodeUrl);
        setStep('setup');
      }
    } catch (error) {
      toast.error('Failed to generate security secret');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await enable2FA(secret, verificationCode);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Two-factor authentication enabled successfully!');
        setStep('enabled');
      }
    } catch (error) {
      toast.error('Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await disable2FA();
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Two-factor authentication disabled.');
        setStep('initial');
        setSecret('');
        setQrCodeUrl('');
        setVerificationCode('');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'enabled') {
    return (
      <Card className="border-green-100 bg-green-50/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-700">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle className="text-lg">Two-Factor Authentication is ON</CardTitle>
          </div>
          <CardDescription>
            Your account is protected with an additional layer of security.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="outline" 
            className="text-destructive hover:text-destructive"
            onClick={handleDisable}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Disable 2FA
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'setup') {
    return (
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle>Set up Authenticator App</CardTitle>
          <CardDescription>
            Scan the QR code below using Google Authenticator, Authy, or any TOTP app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-white rounded-lg border">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secret Key</p>
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono break-all">{secret}</code>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm font-medium">Verification Code</label>
            <Input
              id="otp"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-12"
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your app to confirm.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button 
            className="flex-1" 
            variant="fsuu"
            onClick={handleVerifyAndEnable}
            disabled={isLoading || verificationCode.length !== 6}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify and Enable
          </Button>
          <Button variant="ghost" onClick={() => setStep('initial')} disabled={isLoading}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
          <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Protect your account from unauthorized access by requiring a security code whenever you sign in.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="fsuu" onClick={handleStartSetup} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
          Setup Authenticator
        </Button>
      </CardFooter>
    </Card>
  );
}
