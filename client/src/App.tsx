import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Courts } from '@/pages/Courts';
import { CourtDetail } from '@/pages/CourtDetail';
import { MyBookings } from '@/pages/MyBookings';
import { MyProfile } from '@/pages/MyProfile';
import { CreateCourt } from '@/pages/CreateCourt';
import { OwnerCourts } from '@/pages/OwnerCourts';
import { OwnerBookings } from '@/pages/OwnerBookings';
import { Events } from '@/pages/Events';
import { EventDetail } from '@/pages/EventDetail';
import { CreateEvent } from '@/pages/CreateEvent';
import { OwnerEvents } from '@/pages/OwnerEvents';
import { Friends } from '@/pages/Friends';
import { Teams } from '@/pages/Teams';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Footer } from '@/components/ui/footer';

// Public pages that show the footer. Signed-in app pages (bookings, profile, teams,
// friends, owner, admin) render without it, and so do /login and /register.
const PUBLIC_FOOTER_PATHS = ['/', '/about', '/contact', '/events', '/courts'];

export function App() {
  const { resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  // Wait for the session before mounting pages that may fetch public data.
  if (loading) return <div className="p-8 text-center">Loading...</div>;
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
      </AnimatePresence>
      {showFooter && <Footer />}
    </div>
  );
}