import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FadeIn } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  CalendarCheck,
  UsersRound,
  ArrowRight,
  Building2,
  Trophy,
} from "lucide-react";
import { courtImage } from "@/lib/images";
import { suggestCourts } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Autocomplete } from "@/components/Autocomplete";
import { CourtCard, type CourtSummary } from "@/components/CourtCard";
import { EventCard, type EventSummary } from "@/components/EventCard";

const BOOKING_STEPS = ["Find a court", "Choose your hours", "Request booking"];

const COURT_PREVIEW_COUNT = 6;

export function Home() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [courtSuggestions, setCourtSuggestions] = useState<any[]>([]);
  const [courtSuggestionsLoading, setCourtSuggestionsLoading] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Home only previews courts; the full, filterable list lives on /courts.
  async function fetchCourts() {
    try {
      const res = await api.get("/courts");
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(t(err.response?.data?.message || t("Failed to load courts")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, []);

  // Debounced typeahead suggestions for the city input.
  useEffect(() => {
    if (suggestDebounce.current) {
      clearTimeout(suggestDebounce.current);
    }
    const hasQuery = city.trim().length > 0;
    suggestDebounce.current = setTimeout(async () => {
      if (!hasQuery) {
        setCourtSuggestions([]);
        setCourtSuggestionsLoading(false);
        return;
      }
      setCourtSuggestionsLoading(true);
      try {
        const data = await suggestCourts(city);
        setCourtSuggestions(data.items ?? []);
      } catch {
        setCourtSuggestions([]);
      } finally {
        setCourtSuggestionsLoading(false);
      }
    }, hasQuery ? 150 : 0);
    return () => {
      if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    };
  }, [city]);

  /** Hero search hands off to the courts page so the URL carries the filters. */
  function goToCourts() {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (sport) params.set("sportType", sport);
    const qs = params.toString();
    navigate(qs ? `/courts?${qs}` : "/courts");
  }

  function searchCourts(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    goToCourts();
  }

  function selectCourtSuggestion(item: any) {
    const nextCity = item.city as string;
    setCity(nextCity);
    const params = new URLSearchParams();
    if (nextCity.trim()) params.set("city", nextCity.trim());
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
      {/* Hero: search and guidance stay together. */}
      <section
        aria-labelledby="home-heading"
        className="relative overflow-hidden border-b bg-accent/30"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
          <FadeIn className="min-w-0">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" /> {t("Less planning. More playing.")} </p>
            <h1
              id="home-heading"
              className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            > {t("Your next game")} <br />
              <span className="text-primary">{t("starts here.")}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"> {t("Find your court, bring your people, and make time for the game. Explore futsal and 11-a-side courts near you.")} </p>
          </FadeIn>
          <FadeIn delay={0.06} className="min-w-0 lg:order-3 lg:col-span-2">
            <form
              onSubmit={searchCourts}
              aria-label={t("Find a court")}
              className="w-full rounded-2xl border bg-card p-4 shadow-soft sm:p-6"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <label htmlFor="home-city" className="mb-2 block px-2 text-xs font-semibold"> {t("Where to play")} </label>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3">
                    <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                    <Autocomplete
                      id="home-city"
                      value={city}
                      onChange={setCity}
                      items={courtSuggestions}
                      itemToLabel={(item: any) => `${item.name} (${item.city})`}
                      itemToValue={(item: any) => item.city}
                      onSelect={selectCourtSuggestion}
                      loading={courtSuggestionsLoading}
                      ariaLabel={t("Search courts by city and sport")}
                      placeholder={t("City or area")}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label htmlFor="home-sport" className="mb-2 block px-2 text-xs font-semibold"> {t("Your game")} </label>
                  <select
                    id="home-sport"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="h-11 w-full rounded-lg bg-muted/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">{t("All sports")}</option>
                    <option value="FUTSAL">{t("Futsal (5v5)")}</option>
                    <option value="ELEVEN_A_SIDE">{t("11-a-side")}</option>
                  </select>
                </div>
                <Button type="submit" className="h-11 w-full rounded-lg sm:px-8">
                  <Search aria-hidden="true" className="h-4 w-4" /> {t("Search")} </Button>
              </div>
            </form>
            <div className="mt-6" aria-label={t("How booking works")}>
              <ol className="flex flex-col gap-3 text-xs font-medium sm:flex-row sm:flex-wrap sm:gap-x-5">
                {BOOKING_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/25 text-[10px] text-primary">
                      {i + 1}
                    </span>
                    {t(step)}
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> {t("Requests are confirmed by the court owner. Track yours in My Bookings.")} </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.12} className="relative min-w-0 lg:order-2">
            <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[2rem] bg-emerald-950 shadow-xl lg:aspect-[4/3]">
              <img
                src={courtImage("home-hero")}
                alt={t("Football players competing on a grass pitch")}
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/20 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-6 rounded-xl border border-white/30"
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-white/30" />
                <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white sm:p-9">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs backdrop-blur-sm">
                  <Trophy aria-hidden="true" className="h-3.5 w-3.5" /> {t("For the love of the game")} </span>
                <p className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl"> {t("More than a court.")} <br /> {t("Your next great game.")} </p>
                <p className="mt-3 text-sm text-white/80">{t("Futsal · 11-a-side · Your team")}</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Explore courts */}
      <section
        aria-labelledby="courts-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"> {t("Find your pitch")} </p>
            <h2 id="courts-heading" className="text-3xl font-bold tracking-tight sm:text-4xl"> {t("Explore courts")} </h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : t("A place for every squad. Find the right court for your next match.")}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/courts"> {t("View all courts")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: COURT_PREVIEW_COUNT }).map((_, i) => (
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
            <p className="text-lg font-semibold">{t("No courts listed yet")}</p>
            <p className="mt-1 text-sm text-muted-foreground"> {t("Check back soon — or contact us if you own a court.")} </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/contact">{t("List your court")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.slice(0, COURT_PREVIEW_COUNT).map((court, i) => (
              <FadeIn key={court.id} delay={Math.min(i, COURT_PREVIEW_COUNT) * 0.05}>
                <CourtCard court={court} />
              </FadeIn>
            ))}
          </div>
        )}
      </section>

      {/* Community: a visual break, not another card grid. */}
      <section
        aria-labelledby="community-heading"
        className="overflow-hidden bg-emerald-950 text-white"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:gap-16">
          <div
            aria-hidden="true"
            className="relative mx-auto aspect-[4/3] w-full max-w-sm rounded-3xl border border-white/15 bg-emerald-900/50 p-6 sm:p-8"
          >
            <div className="relative h-full rounded-lg border-2 border-emerald-300/30">
              <div className="absolute inset-x-0 top-1/2 border-t-2 border-emerald-300/30" />
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300/30" />
              <div className="absolute left-1/2 top-0 h-10 w-24 -translate-x-1/2 border-2 border-t-0 border-emerald-300/30" />
              <div className="absolute bottom-0 left-1/2 h-10 w-24 -translate-x-1/2 border-2 border-b-0 border-emerald-300/30" />
              {[
                "left-1/2 top-[12%]",
                "left-[22%] top-[38%]",
                "left-[78%] top-[38%]",
                "left-[30%] top-[72%]",
                "left-[70%] top-[72%]",
              ].map((position, i) => (
                <span
                  key={position}
                  className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-emerald-950 bg-lime-300 text-xs font-bold text-emerald-950 shadow-lg ${position}`}
                >
                  {[1, 4, 7, 9, 10][i]}
                </span>
              ))}
            </div>
          </div>
          <FadeIn>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"> {t("Better together")} </p>
            <h2
              id="community-heading"
              className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            > {t("A great game needs")} <br />{t("a great team.")} </h2>
            <p className="mt-5 max-w-md leading-relaxed text-emerald-100/80"> {t("The court is just the beginning. Connect with friends, build your squad, and make your next match a team effort.")} </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-100">
              <span className="inline-flex items-center gap-2">
                <UsersRound aria-hidden="true" className="h-4 w-4 text-emerald-300" /> {t("Connect with friends")} </span>
              <span className="inline-flex items-center gap-2">
                <Trophy aria-hidden="true" className="h-4 w-4 text-emerald-300" /> {t("Build your team")} </span>
            </div>
            {user?.role !== "OWNER" && (
              <Button
                asChild
                className="mt-8 rounded-full bg-lime-300 text-emerald-950 hover:bg-lime-200"
              >
                <Link to={user ? "/teams" : "/register"}>
                  {user ? t("Explore teams") : t("Join the community")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </FadeIn>
        </div>
      </section>

      {/* Upcoming events are secondary to finding a court. */}
      {events.length > 0 && (
        <section
          aria-labelledby="events-heading"
          className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"> {t("Beyond the match")} </p>
              <h2 id="events-heading" className="text-3xl font-bold tracking-tight sm:text-4xl"> {t("What’s happening")} </h2>
              <p className="text-sm text-muted-foreground"> {t("Tournaments, discounts and promos from court owners")} </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/events"> {t("View all events")} <ArrowRight className="h-4 w-4" />
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
        </section>
      )}

      <section aria-labelledby="owner-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border bg-accent/40 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Building2 aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <h2 id="owner-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
                {user?.role === "OWNER"
                  ? t("Your courts. Your next booking.")
                  : t("Own a court? Let’s get it in the game.")}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground"> {t("List your venue and manage opening hours, booking requests, and events in one place.")} </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full">
            <Link to={user?.role === "OWNER" ? "/owner/courts" : user ? "/contact" : "/register"}>
              {user?.role === "OWNER"
                ? t("Manage your courts")
                : user
                  ? t("Contact us")
                  : t("Get started as an owner")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
