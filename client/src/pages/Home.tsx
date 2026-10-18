import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FadeIn } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  MapPin,
  Users,
  Star,
  CalendarCheck,
  UsersRound,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { courtImage } from '@/lib/images';

type Court = {
  id: string;
  name: string;
  city: string;
  sportType: string;
  basePricePerHour: number;
  reviews?: Array<{ rating: number }>;
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Instant booking',
    text: 'Pick a slot, book in seconds. Owners confirm fast.',
  },
  {
    icon: UsersRound,
    title: 'Play with friends',
    text: 'Build teams, invite friends, book together.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted reviews',
    text: 'Real ratings from real players for every court.',
  },
];

export function Home() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');

  async function fetchCourts() {
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (sport) params.set('sportType', sport);
      const res = await api.get(`/courts?${params}`);
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load courts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, [city, sport]);

  const avgRating = (court: Court) => {
    if (!court.reviews?.length) return null;
    return court.reviews.reduce((s, r) => s + r.rating, 0) / court.reviews.length;
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative max-w-5xl mx-auto py-16 px-4 text-center sm:py-20">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              Futsal · 11-a-side · Book courts near you
            </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Find &amp; Book Futsal Courts
            </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-4 text-white/85 max-w-2xl mx-auto text-base sm:text-lg">
              Spin up a team, grab a slot, and get on the pitch. Real-time availability for
              players — simple management for owners.
            </p>
          </FadeIn>
          <FadeIn delay={0.18}>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-2xl mx-auto">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="City or area"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="rounded-full bg-white px-4 py-2 text-sm text-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Sport type"
              >
                <option value="">All sports</option>
                <option value="FUTSAL">Futsal (5v5)</option>
                <option value="ELEVEN_A_SIDE">11-a-side</option>
              </select>
              <Button
                onClick={() => fetchCourts()}
                size="lg"
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </FadeIn>
          {user && user.role === 'OWNER' && (
            <FadeIn delay={0.26}>
              <div className="mt-6 flex justify-center">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link to="/owner/courts/create">+ List Your Court</Link>
                </Button>
              </div>
            </FadeIn>
          )}
        </div>
      </div>

      {/* Feature highlights */}
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07}>
              <Card className="shadow-soft h-full">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-lg bg-accent p-2 text-accent-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Court list */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Available courts</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${courts.length} court${courts.length === 1 ? '' : 's'} found`}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full rounded-none" />
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Search className="h-8 w-8 text-accent-foreground" />
            </div>
            <p className="text-lg font-semibold">No courts found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different city or clear the filters.
            </p>
            {(city || sport) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setCity('');
                  setSport('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((court, i) => {
              const rating = avgRating(court);
              return (
                <FadeIn key={court.id} delay={Math.min(i, 6) * 0.05}>
                  <Link to={`/courts/${court.id}`} className="group block h-full">
                    <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                      <div className="relative h-40 overflow-hidden bg-muted">
                        <img
                          src={courtImage(court.id)}
                          alt={court.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge className="absolute left-3 top-3 border-transparent bg-black/60 text-white backdrop-blur">
                          {court.sportType === 'ELEVEN_A_SIDE' ? '11-a-side' : 'Futsal'}
                        </Badge>
                        <div className="absolute bottom-3 left-3 text-white">
                          <span className="text-lg font-bold drop-shadow">{court.name}</span>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{court.city}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">
                            ${court.basePricePerHour}
                            <span className="font-normal text-muted-foreground">/hr</span>
                          </span>
                          {rating ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium">
                              <Star className="h-4 w-4 fill-primary text-primary" />
                              {rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No reviews</span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>
                            {court.sportType === 'ELEVEN_A_SIDE' ? '11' : '5'} players per side
                          </span>
                          <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}