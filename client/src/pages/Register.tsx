import { useState, type FormEvent } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { useSignUp } from '@clerk/react/legacy';
import { Building2, Eye, EyeOff, Loader2, LockKeyhole, Mail, MailCheck, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { cn, resolvePostAuthRedirect } from '@/lib/utils';

const ROLES = [
  { value: 'PLAYER', label: 'Player', hint: 'Book courts & join teams', icon: UserRound },
  { value: 'OWNER', label: 'Court owner', hint: 'List & manage your courts', icon: Building2 },
] as const;

type Role = (typeof ROLES)[number]['value'];
type ClerkError = { errors?: Array<{ longMessage?: string; message?: string }> };

function clerkErrorMessage(error: unknown) {
  const clerkError = error as ClerkError;
  return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || t('Unable to create your account. Please try again.');
}

export function Register() {
  useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk();
  const { getToken } = useClerkAuth();
  const { refreshUser } = useAuth();
  const [role, setRole] = useState<Role>('PLAYER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const finishSignUp = async (sessionId: string) => {
    await setActive({ session: sessionId });
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    // The API provisions public Clerk accounts as PLAYER. It then permits a
    // first-time, non-admin PLAYER -> OWNER selection for a new account.
    await api.get('/auth/me', { headers });
    const response = await api.post('/auth/sync', { role }, { headers });
    await refreshUser();
    navigate(resolvePostAuthRedirect(response.data.user.role, fromPath), { replace: true });
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await signUp.create({ emailAddress: email.trim(), password });
      if (result.status === 'complete' && result.createdSessionId) {
        await finishSignUp(result.createdSessionId);
        return;
      }
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setNeedsVerification(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode.trim() });
      if (result.status !== 'complete' || !result.createdSessionId) {
        setError(t('That verification code is not valid. Please try again.'));
        return;
      }
      await finishSignUp(result.createdSessionId);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={needsVerification ? t('Verify your email') : t('Create your account')}
      subtitle={needsVerification ? t('Enter the six-digit code we sent to {email}.').replace('{email}', email) : t('Join FootballMatch and get on the pitch in minutes.')}
      switchPrompt={
        <>
          {t('Already have an account?')}{' '}
          <Link to="/login" state={location.state} className="font-medium text-primary hover:text-primary/80">
            {t('Sign in')}
          </Link>
        </>
      }
    >
      {needsVerification ? (
        <form className="space-y-5" onSubmit={handleVerifyEmail} noValidate>
          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <MailCheck className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
            {t('Check your inbox and enter the code to finish creating your account.')}
          </div>
          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-sm font-medium">{t('Verification code')}</label>
            <Input id="verification-code" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className="h-12 text-center text-lg tracking-[0.45em]" required disabled={submitting} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={!isLoaded || submitting || verificationCode.length !== 6}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting ? t('Verifying...') : t('Verify email')}
          </Button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleCreateAccount} noValidate>
          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('Register as')}</legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, label, hint, icon: Icon }) => {
                const active = role === value;
                return (
                  <button key={value} type="button" onClick={() => setRole(value)} disabled={submitting} className={cn('flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:border-primary/40 hover:bg-accent/40')}>
                    <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                    <span className="text-sm font-semibold">{t(label)}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{t(hint)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="register-email" className="text-sm font-medium">{t('Email address')}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" required disabled={submitting} />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="register-password" className="text-sm font-medium">{t('Password')}</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="pl-10 pr-11" required minLength={8} disabled={submitting} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('Hide password') : t('Show password')} className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={submitting}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('Use at least 8 characters.')}</p>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={!isLoaded || submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting ? t('Creating account...') : t('Create account')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
