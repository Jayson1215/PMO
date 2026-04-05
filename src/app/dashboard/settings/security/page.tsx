import { getCurrentUser } from '@/actions/auth';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { ShieldCheck, Smartphone, Key } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Settings | PMO Booking System',
  description: 'Manage your account security and two-factor authentication.',
};

export default async function SecuritySettingsPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">Please sign in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8 font-sans">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-fsuu-blue-800">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and protect your data.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="h-5 w-5 text-fsuu-blue-600" />
              Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Your password is the first line of defense for your account.
            </p>
            <p className="text-sm font-medium text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
              Password management coming soon.
            </p>
          </section>

          <div className="p-6 bg-fsuu-blue-50 rounded-xl border border-fsuu-blue-100 flex items-start gap-4">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <ShieldCheck className="h-6 w-6 text-fsuu-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-fsuu-blue-900">Security Recommendation</h3>
              <p className="text-sm text-fsuu-blue-700/80 mt-1">
                Enable Two-factor authentication (2FA) to significantly increase the security of your account.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-fsuu-blue-600" />
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account by using an authenticator app.
            </p>
            
            <TwoFactorSetup isTwoFactorEnabled={profile.two_factor_enabled} />
          </section>
        </div>
      </div>
    </div>
  );
}
