import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { resolvePostAuthRedirect } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { success, user } = await login(data.email, data.password);
      if (success) {
        toast.success(t("Welcome back!"));
        navigate(resolvePostAuthRedirect(user?.role, fromPath), { replace: true });
      }
    } catch {
      toast.error(t("Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("Welcome back")}
      subtitle={t("Sign in to book courts, join teams, and manage your matches.")}
      switchPrompt={
        <> {t("Don't have an account?")}{' '}
          <Link to="/register" state={location.state} className="font-medium text-primary hover:text-primary/80"> {t("Create one")} </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input
            id="email"
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 rounded-lg"
          />
          {errors.email && <p className="mt-1 text-sm text-destructive">{t(errors.email.message)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("Password")}</Label>
          <div className="relative">
            <Input
              id="password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-lg pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("Hide password") : t("Show password")}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{t(errors.password.message)}</p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full rounded-lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t("Sign in")} </Button>
      </form>
    </AuthLayout>
  );
}
