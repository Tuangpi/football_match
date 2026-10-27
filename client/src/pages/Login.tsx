import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import { AuthLayout } from '@/components/AuthLayout';

export function Login() {
  useLanguage();
  const location = useLocation();
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
      <SignIn />
    </AuthLayout>
  );
}
