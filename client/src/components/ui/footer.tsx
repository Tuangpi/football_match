import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Mail, Facebook, Twitter, Instagram, Github } from 'lucide-react';

const COLS = [
  {
    title: 'Browse',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Find a court', to: '/' },
      { label: 'Events', to: '/events' },
    ],
  },
  {
    title: 'Play',
    links: [
      { label: 'Bookings', to: '/bookings' },
      { label: 'Teams', to: '/teams' },
      { label: 'Friends', to: '/friends' },
    ],
  },
  {
    title: 'For owners',
    links: [
      { label: 'List your court', to: '/owner/courts/create' },
      { label: 'Booking management', to: '/owner/bookings' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My profile', to: '/profile' },
      { label: 'My bookings', to: '/bookings' },
      { label: 'Sign in', to: '/login' },
    ],
  },
];

export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FootballMatch. Built for futsal players and owners.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            {user ? (
              <div className="flex items-center gap-2 pl-4 border-l border-border">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-border">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href="#contact"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  contact@footballmatch.app
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
