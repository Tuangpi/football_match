import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  Calendar,
  Users,
  Building2,
  User,
  LogOut,
  Plus,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-orange-600" />
            <span className="font-bold text-xl tracking-tight">FootballMatch</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            {user && (
              <>
                <Link
                  to="/bookings"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <Calendar className="h-4 w-4" /> My Bookings
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Profile
                </Link>
                {user.role === 'OWNER' && (
                  <>
                    <Link
                      to="/owner/courts"
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Building2 className="h-4 w-4" /> My Courts
                    </Link>
                    <Link
                      to="/owner/bookings"
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Calendar className="h-4 w-4" /> Booking Mgmt
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-4">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}