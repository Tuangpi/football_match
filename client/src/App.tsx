import { lazy, Suspense } from 'react';
import { t } from './lib/language';
import { useLanguage } from './context/LanguageContext';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })))
const About = lazy(() => import('@/pages/About').then(m => ({ default: m.About })))
const Contact = lazy(() => import('@/pages/Contact').then(m => ({ default: m.Contact })))
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const Register = lazy(() => import('@/pages/Register').then(m => ({ default: m.Register })))
const Courts = lazy(() => import('@/pages/Courts').then(m => ({ default: m.Courts })))
const CourtDetail = lazy(() => import('@/pages/CourtDetail').then(m => ({ default: m.CourtDetail })))
const MyBookings = lazy(() => import('@/pages/MyBookings').then(m => ({ default: m.MyBookings })))
const MyProfile = lazy(() => import('@/pages/MyProfile').then(m => ({ default: m.MyProfile })))
const CreateCourt = lazy(() => import('@/pages/CreateCourt').then(m => ({ default: m.CreateCourt })))
const OwnerCourts = lazy(() => import('@/pages/OwnerCourts').then(m => ({ default: m.OwnerCourts })))
const OwnerBookings = lazy(() => import('@/pages/OwnerBookings').then(m => ({ default: m.OwnerBookings })))
const Events = lazy(() => import('@/pages/Events').then(m => ({ default: m.Events })))
const EventDetail = lazy(() => import('@/pages/EventDetail').then(m => ({ default: m.EventDetail })))
const CreateEvent = lazy(() => import('@/pages/CreateEvent').then(m => ({ default: m.CreateEvent })))
const OwnerEvents = lazy(() => import('@/pages/OwnerEvents').then(m => ({ default: m.OwnerEvents })))
const Friends = lazy(() => import('@/pages/Friends').then(m => ({ default: m.Friends })))
const Teams = lazy(() => import('@/pages/Teams').then(m => ({ default: m.Teams })))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
import { Footer } from '@/components/ui/footer';

// Public pages that show the footer. Signed-in app pages (bookings, profile, teams,
// friends, owner, admin) render without it, and so do /login and /register.
const PUBLIC_FOOTER_PATHS = ['/', '/about', '/contact', '/events', '/courts'];

export function App() {
  useLanguage();
  const { resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  // Wait for the session before mounting pages that may fetch public data.
  if (loading) return <div className="p-8 text-center">{t("Loading...")}</div>;
  if (user?.role === 'ADMIN' && pathname !== '/admin') {
    return <Navigate to="/admin" replace />;
  }
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const showFooter =
    !isAuthRoute &&
    (PUBLIC_FOOTER_PATHS.includes(pathname) ||
      pathname.startsWith('/courts/') ||
      pathname.startsWith('/events/'));

  return (
    <div className="app">
      {!isAuthRoute && <Navbar />}
      <Toaster
        theme={resolvedTheme}
        richColors
        position="top-right"
        offset={isAuthRoute ? 16 : 80}
      />
      <AnimatePresence mode="wait">
        <Suspense fallback={<div className="p-8 text-center">{t("Loading...")}</div>}>
        <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/courts" element={<Courts />} />
        <Route path="/courts/:id" element={<CourtDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute roles={['PLAYER']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute roles={['PLAYER']}>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute roles={['PLAYER']}>
              <Teams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/courts"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <OwnerCourts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/courts/create"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <CreateCourt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <OwnerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/events"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <OwnerEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/events/:id/edit"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/events/create"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AnimatePresence>
      {showFooter && <Footer />}
    </div>
  );
}