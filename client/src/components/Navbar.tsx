import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Brand } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PlusCircle,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );

export function Navbar() {
  useLanguage();
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  const closeMenu = () => setMenuOpen(false);

  const displayName = user?.playerProfile?.fullName || user?.email.split('@')[0] || '';
  // Admins have a separate dashboard; activity links belong to players.
  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const showPlayerLinks = user?.role === 'PLAYER';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl transition-shadow',
        scrolled ? 'border-border shadow-sm' : 'border-border/60',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-2 py-2">
          <Link
            to={isAdmin ? '/admin' : '/'}
            aria-label={isAdmin ? t("FootballMatch admin dashboard") : t("FootballMatch home")}
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span>span:last-child]:hidden sm:[&>span>span:last-child]:inline"
          >
            <Brand />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t("Main")}>
            {!isAdmin && (
              <>
                <NavLink to="/" end className={navLinkClass}> {t("Home")} </NavLink>
                <NavLink to="/courts" className={navLinkClass}> {t("Courts")} </NavLink>
                <NavLink to="/events" className={navLinkClass}> {t("Events")} </NavLink>
              </>
            )}

            {showPlayerLinks && (
              <>
                <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                <NavLink to="/teams" className={navLinkClass}> {t("Teams")} </NavLink>
                {user?.role === 'PLAYER' && (
                  <NavLink to="/friends" className={navLinkClass}> {t("Friends")} </NavLink>
                )}
              </>
            )}

            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={navLinkClass}> {t("Dashboard")} </NavLink>
            )}

            {user?.role === 'OWNER' && (
              <>
                <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                <NavLink to="/owner/bookings" className={navLinkClass}> {t("Booking Management")} </NavLink>
              </>
            )}
          </nav>

          {/* Account / actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />

            {loading ? (
              <div
                className="hidden h-9 w-28 animate-pulse rounded-full bg-muted sm:block"
                aria-hidden
              />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("Open account menu")}
                    className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 py-1 pl-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar
                      src={user.playerProfile?.avatarUrl}
                      name={user.playerProfile?.fullName || user.email}
                      size="sm"
                      className="h-7 w-7 ring-1 ring-border"
                    />
                    <span className="hidden max-w-[9rem] truncate text-sm font-medium xl:block">
                      {displayName}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground xl:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {t(user.role)}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        <UserRound className="mr-2 h-4 w-4" /> {t("Profile")} </Link>
                    </DropdownMenuItem>
                  )}
                  {showPlayerLinks && (
                    <DropdownMenuItem asChild>
                      <Link to="/bookings">
                        <CalendarCheck className="mr-2 h-4 w-4" /> {t("My bookings")} </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> {t("Admin dashboard")} </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'OWNER' && (
                    <DropdownMenuItem asChild>
                      <Link to="/owner/courts">
                        <Building2 className="mr-2 h-4 w-4" /> {t("My courts")} </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'OWNER' && (
                    <DropdownMenuItem asChild>
                      <Link to="/owner/courts/create">
                        <PlusCircle className="mr-2 h-4 w-4" /> {t("Add a court")} </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t("Log out")} </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden rounded-full sm:inline-flex"
                >
                  <Link to="/login">{t("Sign in")}</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-4">
                  <Link to="/register">{t("Get started")}</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? t("Close menu") : t("Open menu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="animate-in fade-in slide-in-from-top-1 border-t border-border/60 duration-200 lg:hidden"
          >
            <div className="max-h-[calc(100vh-4rem)] space-y-6 overflow-y-auto pb-6 pt-4">
              {loading ? null : user ? (
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3"
                >
                  <Avatar
                    src={user.playerProfile?.avatarUrl}
                    name={user.playerProfile?.fullName || user.email}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {t(user.role)}
                  </span>
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/login" onClick={closeMenu}> {t("Sign in")} </Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-full">
                    <Link to="/register" onClick={closeMenu}> {t("Get started")} </Link>
                  </Button>
                </div>
              )}

              {!isAdmin && (
                <div>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"> {t("Explore")} </p>
                  <div className="space-y-1">
                    <NavLink to="/" end className={mobileLinkClass} onClick={closeMenu}>
                      <Home className="h-4 w-4" /> {t("Home")} </NavLink>
                    <NavLink to="/courts" className={mobileLinkClass} onClick={closeMenu}>
                      <MapPin className="h-4 w-4" /> {t("Courts")} </NavLink>
                    <NavLink to="/events" className={mobileLinkClass} onClick={closeMenu}>
                      <CalendarCheck className="h-4 w-4" /> {t("Events")} </NavLink>
                  </div>
                </div>
              )}

              {user && !isAdmin && (
                <div>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"> {t("My activity")} </p>
                  <div className="space-y-1">
                    {showPlayerLinks && (
                      <>
                        <NavLink to="/teams" className={mobileLinkClass} onClick={closeMenu}>
                          <Trophy className="h-4 w-4" /> {t("Teams")} </NavLink>
                        {user.role === 'PLAYER' && (
                          <NavLink to="/friends" className={mobileLinkClass} onClick={closeMenu}>
                            <Users className="h-4 w-4" /> {t("Friends")} </NavLink>
                        )}
                      </>
                    )}
                    <NavLink to="/profile" className={mobileLinkClass} onClick={closeMenu}>
                      <UserRound className="h-4 w-4" /> {t("Profile")} </NavLink>
                  </div>
                </div>
              )}

              {user && (user.role === 'OWNER' || user.role === 'ADMIN') && (
                <div>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"> {t("Manage")} </p>
                  <div className="space-y-1">
                    {user.role === 'ADMIN' && (
                      <NavLink to="/admin" className={mobileLinkClass} onClick={closeMenu}>
                        <LayoutDashboard className="h-4 w-4" /> {t("Admin dashboard")} </NavLink>
                    )}
                    {isOwner && (
                      <NavLink to="/owner/events" className={mobileLinkClass} onClick={closeMenu}>
                        <CalendarCheck className="h-4 w-4" /> {t("Event Management")} </NavLink>
                    )}
                    {user.role === 'OWNER' && (
                      <>
                        <NavLink to="/owner/courts" className={mobileLinkClass} onClick={closeMenu}>
                          <Building2 className="h-4 w-4" /> {t("My Courts")} </NavLink>
                        <NavLink
                          to="/owner/bookings"
                          className={mobileLinkClass}
                          onClick={closeMenu}
                        >
                          <ClipboardList className="h-4 w-4" /> {t("Booking Management")} </NavLink>
                        <NavLink
                          to="/owner/courts/create"
                          className={mobileLinkClass}
                          onClick={closeMenu}
                        >
                          <PlusCircle className="h-4 w-4" /> {t("Add a court")} </NavLink>
                      </>
                    )}
                  </div>
                </div>
              )}

              {user && (
                <div className="border-t border-border/60 pt-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> {t("Log out")} </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
