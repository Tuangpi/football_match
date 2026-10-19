import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FadeIn } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, CalendarCheck, UsersRound, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourtCard, type CourtSummary } from "@/components/CourtCard";
import { EventCard, type EventSummary } from "@/components/EventCard";

const STEPS = [
  {
    icon: Search,
    step: "1",
    title: "Find a court",
    text: "Search by city or sport and pick a court near you.",
  },
  {
    icon: CalendarCheck,
    step: "2",
    title: "Choose your time",
    text: "Choose a date and whole-hour start/end times.",
  },
  {
    icon: UsersRound,
    step: "3",
    title: "Play together",
    text: "Bring your team — or find teammates along the way.",
  },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Instant booking",
    text: "Choose your hours and request a booking. Owners confirm fast.",
  },
  {
    icon: UsersRound,
    title: "Play with friends",
    text: "Build teams, invite friends, book together.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted reviews",
    text: "Real ratings from real players for every court.",
  },
];

const FEATURED_COUNT = 6;

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");

  // Home only previews courts; the full, filterable list lives on /courts.
  async function fetchCourts() {
    try {
      const res = await api.get("/courts");
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load courts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, []);

  /** Hero search hands off to the courts page so the URL carries the filters. */
  function searchCourts(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (sport) params.set("sportType", sport);
    const qs = params.toString();
    navigate(qs ? `/courts?${qs}` : "/courts");
  }

  useEffect(() => {
    async function fetchUpcomingEvents() {
      try {
        const res = await api.get("/events?when=upcoming");
        const upcoming: EventSummary[] = res.data.events ?? [];
        setEvents(upcoming.slice(0, 3));
      } catch {
        // Non-blocking: courts are the main content; events strip just hides.
      }
    }
    fetchUpcomingEvents();
  }, []);

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
              Spin up a team, choose your time, and get on the pitch. Real-time availability for
              players — simple management for owners.
            </p>
          </FadeIn>
          <FadeIn delay={0.18}>
            <form
              onSubmit={searchCourts}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-2xl mx-auto"
            >
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
                type="submit"
                size="lg"
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </FadeIn>
          {user && user.role === "OWNER" && (
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

      {/* Upcoming events */}
      {events.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 pt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Upcoming events</h2>
              <p className="text-sm text-muted-foreground">
                Tournaments, discounts and promos from court owners
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/events">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {events.map((e, i) => (
              <FadeIn key={e.id} delay={i * 0.07}>
                <EventCard event={e} />
              </FadeIn>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mx-auto max-w-5xl px-4 pt-12">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold">How it works</h2>
          <p className="text-sm text-muted-foreground">From search to kickoff in three steps</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.07}>
              <Card className="h-full">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <s.icon className="h-4 w-4 text-muted-foreground" />
                      {s.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Featured courts */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Featured courts</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "A few courts to get you started"}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/courts">
              View all courts <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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
            <p className="text-lg font-semibold">No courts listed yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — or contact us if you own a court.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/contact">List your court</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.slice(0, FEATURED_COUNT).map((court, i) => (
              <FadeIn key={court.id} delay={Math.min(i, FEATURED_COUNT) * 0.05}>
                <CourtCard court={court} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
