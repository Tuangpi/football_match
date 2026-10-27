import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import { AuthLayout } from '@/components/AuthLayout';
import { cn } from '@/lib/utils';
import { Building2, UserRound } from 'lucide-react';

const ROLES = [
  { value: 'PLAYER', label: 'Player', hint: 'Book courts & join teams', icon: UserRound },
  { value: 'OWNER', label: 'Court owner', hint: 'List & manage your courts', icon: Building2 },
] as const;

export function Register() {
  useLanguage();
  const location = useLocation();
  const [role, setRole] = useState<'PLAYER' | 'OWNER'>('PLAYER');

  return (
    <AuthLayout
      title={t('Create your account')}
      subtitle={t('Join FootballMatch and get on the pitch in minutes.')}
      switchPrompt={
        <>
          {t('Already have an account?')}{' '}
          <Link to="/login" state={location.state} className="font-medium text-primary hover:text-primary/80">
            {t('Sign in')}
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium">{t('Register as')}</p>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ value, label, hint, icon: Icon }) => {
            const active = role === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors',
                  active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:border-primary/40 hover:bg-accent/40',
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-semibold">{t(label)}</span>
                <span className="text-xs leading-snug text-muted-foreground">{t(hint)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <SignUp unsafeMetadata={{ role }} />
    </AuthLayout>
  );
}
