import type { ReactNode } from 'react';
import { ShieldCheck, UsersRound, Zap } from 'lucide-react';
import { Brand } from '@/components/Brand';

const BENEFITS = [
  {
    icon: Zap,
    title: 'Instant booking',
    text: 'Pick an open slot and lock it in — no phone calls.',
  },
  {
    icon: UsersRound,
    title: 'Play with friends',
    text: 'Build a team, invite friends, and book together.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted reviews',
    text: 'Real ratings from players who showed up.',
  },
];

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Prompt shown under the form, e.g. "Already have an account? Sign in". */
  switchPrompt?: ReactNode;
};

/**
 * Shared full-height layout for /login and /register.
 * Brand panel on the left (large screens), form column on the right.
 */
export function AuthLayout({ title, subtitle, children, switchPrompt }: AuthLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 p-10 text-white lg:flex xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative">
          <Brand variant="onGradient" />
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Futsal · 11-a-side
          </p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Your next match starts here.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            Find courts near you, bring your team, and keep every booking in one place.
          </p>

          <ul className="mt-10 space-y-5">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          Secure sign-in · your session stays in an httpOnly cookie.
        </p>
      </aside>

      {/* Form panel */}
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="mt-8">{children}</div>

          {switchPrompt && (
            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              {switchPrompt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
