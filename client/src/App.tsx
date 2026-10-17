import { Routes, Route, Navigate } from 'react-router-dom';
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

export function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
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
          path="/owner/courts"
          element={
            <ProtectedRoute>
              <OwnerCourts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/courts/create"
          element={
            <ProtectedRoute>
              <CreateCourt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute>
              <OwnerBookings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}