import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsPresent } from 'framer-motion';
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
  const { user, loading } = useAuth();
  const location = useLocation();
  const isPresent = useIsPresent();

  if (loading) return <div className="p-8 text-center">{t("Loading...")}</div>;
  // Exiting pages must not override navigation, especially the logout trip home.
  if (!isPresent) return null;
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
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
