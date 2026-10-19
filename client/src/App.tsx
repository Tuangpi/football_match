import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { CourtDetail } from '@/pages/CourtDetail';
import { MyBookings } from '@/pages/MyBookings';
import { MyProfile } from '@/pages/MyProfile';
import { CreateCourt } from '@/pages/CreateCourt';
import { OwnerCourts } from '@/pages/OwnerCourts';
import { OwnerBookings } from '@/pages/OwnerBookings';
import { Events } from '@/pages/Events';
import { CreateEvent } from '@/pages/CreateEvent';
import { Friends } from '@/pages/Friends';
import { Teams } from '@/pages/Teams';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Footer } from '@/components/ui/footer';

export function App() {
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app">
      {!isAuthRoute && <Navbar />}
      <Toaster theme={resolvedTheme} richColors position="top-center" />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/courts/:id" element={<CourtDetail />} />
        <Route path="/events" element={<Events />} />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Teams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/courts"
          element={
            <ProtectedRoute roles={['OWNER', 'ADMIN']}>
              <OwnerCourts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/courts/create"
          element={
            <ProtectedRoute roles={['OWNER', 'ADMIN']}>
              <CreateCourt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute roles={['OWNER', 'ADMIN']}>
              <OwnerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/events/create"
          element={
            <ProtectedRoute roles={['OWNER', 'ADMIN']}>
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
      {!isAuthRoute && <Footer />}
    </div>
  );
}