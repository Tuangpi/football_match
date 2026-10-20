import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { defaultRouteForRole } from '@/lib/utils';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  useLanguage();
  const { user, loading, hasLoggedOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center">{t("Loading...")}</div>;
  if (!user)
    return (
      <Navigate
        to={hasLoggedOut ? '/' : '/login'}
        state={hasLoggedOut ? undefined : { from: location }}
        replace
      />
    );

  if (
    (user.role === 'ADMIN' && location.pathname.replace(/\/+$/, '') !== '/admin') ||
    (roles && !roles.includes(user.role))
  ) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
}
