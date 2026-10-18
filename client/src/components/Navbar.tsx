import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar } from '@/components/ui/avatar';
import {
  Calendar,
  Users,
  Trophy,
  Building2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // close the mobile menu on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  if (loading) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl tracking-tight">FootballMatch</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            {user && (
              <>
                <Link
                  to="/bookings"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Calendar className="h-4 w-4" /> My Bookings
                </Link>
                <Link
                  to="/friends"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-4 w-4" /> Friends
                </Link>
                <Link
                  to="/teams"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Trophy className="h-4 w-4" /> Teams
                </Link>
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Profile
                </Link>
                {user.role === 'OWNER' && (
                  <>
                    <Link
                      to="/owner/courts"
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Building2 className="h-4 w-4" /> My Courts
                    </Link>
                    <Link
                      to="/owner/bookings"
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="h-4 w-4" /> Booking Mgmt
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!user ? (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Button asChild size="sm">
                  <Link to="/register">Sign up</Link>
                </Button>
              </>
            ) : (
              <Link to="/profile" className="flex items-center gap-2 pl-4 group" title="My profile">
                <Avatar
                  src={user.playerProfile?.avatarUrl}
                  name={user.playerProfile?.fullName || user.email}
                  size="sm"
                  className="group-hover:ring-primary transition"
                />
                <span className="hidden text-sm text-muted-foreground group-hover:text-foreground sm:inline">
                  {user.email}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border py-3 md:hidden">
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Home
              </Link>
              {user && (
                <>
                  <Link
                    to="/bookings"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Calendar className="h-4 w-4" /> My Bookings
                  </Link>
                  <Link
                    to="/friends"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Users className="h-4 w-4" /> Friends
                  </Link>
                  <Link
                    to="/teams"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Trophy className="h-4 w-4" /> Teams
                  </Link>
                  <Link
                    to="/events"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Calendar className="h-4 w-4" /> Events
                  </Link>
                  <Link
                    to="/profile"
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Profile
                  </Link>
                  {user.role === 'OWNER' && (
                    <>
                      <Link
                        to="/owner/courts"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Building2 className="h-4 w-4" /> My Courts
                      </Link>
                      <Link
                        to="/owner/bookings"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Calendar className="h-4 w-4" /> Booking Mgmt
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              )}
              {!user && (
                <div className="flex gap-2 px-3 pt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/register">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}