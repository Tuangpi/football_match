import { useState, type FormEvent } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { resolvePostAuthRedirect } from '@/lib/utils';

type ClerkError = { errors?: Array<{ longMessage?: string; message?: string }> };

function clerkErrorMessage(error: unknown) {
  const clerkError = error as ClerkError;
  return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || t('Unable to sign in. Please try again.');
}

export function Login() {
  useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, signIn } = useSignIn();
  const { setActive } = useClerk();
  const { getToken } = useClerkAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const finishSignIn = async (sessionId: string) => {
    await setActive({ session: sessionId });
    const token = await getToken();
    const response = await api.get('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    navigate(resolvePostAuthRedirect(response.data.user.role, fromPath), { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setError('');
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status !== 'complete' || !result.createdSessionId) {
        setError(t('This sign-in needs an additional verification step. Please use the account recovery flow or contact support.'));
        return;
      }
      await finishSignIn(result.createdSessionId);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('Welcome back')}
      subtitle={t('Sign in to book courts, join teams, and manage your matches.')}
      switchPrompt={
        <>
          {t("Don't have an account?")}{' '}
          <Link to="/register" state={location.state} className="font-medium text-primary hover:text-primary/80">
            {t('Create one')}
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium">{t('Email address')}</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" required disabled={submitting} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium">{t('Password')}</label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="pl-10 pr-11" required disabled={submitting} />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('Hide password') : t('Show password')} className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={submitting}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={!isLoaded || submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? t('Signing in...') : t('Sign in')}
        </Button>
      </form>
    </AuthLayout>
  );
}
