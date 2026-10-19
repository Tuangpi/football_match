import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn, defaultRouteForRole } from '@/lib/utils';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Check, Eye, EyeOff, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PLAYER', 'OWNER']),
});

type FormData = z.infer<typeof schema>;

const ROLES = [
  {
    value: 'PLAYER',
    label: 'Player',
    hint: 'Book courts & join teams',
    icon: UserRound,
  },
  {
    value: 'OWNER',
    label: 'Court owner',
    hint: 'List & manage your courts',
    icon: Building2,
  },
] as const;

export function Register() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PLAYER' },
  });

  const selectedRole = useWatch({ control, name: 'role' });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { success, user } = await authRegister(data.email, data.password, data.role);
      if (success) {
        toast.success('Account created!');
        navigate(defaultRouteForRole(user?.role), { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join FootballMatch and get on the pitch in minutes."
      switchPrompt={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 rounded-lg"
          />
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="h-11 rounded-lg pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label id="role-label">Register as</Label>
          <div role="radiogroup" aria-labelledby="role-label" className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, label, hint, icon: Icon }) => {
              const active = selectedRole === value;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-colors',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-input hover:border-primary/40 hover:bg-accent/40',
                  )}
                >
                  <input type="radio" value={value} {...register('role')} className="sr-only" />
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
                  <span
                    className={cn(
                      'absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {active && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.role && <p className="mt-1 text-sm text-destructive">{errors.role.message}</p>}
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full rounded-lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
