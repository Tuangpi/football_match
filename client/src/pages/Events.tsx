import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FadeIn } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import {
  EventCard,
  EVENT_TYPE_OPTIONS,
  getEventMeta,
  type EventSummary,
} from '@/components/EventCard';
import { CalendarX, MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WHEN_OPTIONS = [
  { value: '', label: 'All dates' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/** Split a mixed list into upcoming (soonest first) and past (newest first). */
function splitByTime(events: EventSummary[]) {
  const now = Date.now();
  return {
    upcoming: events
      .filter((e) => +new Date(e.endDate) >= now)
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)),
    past: events
      .filter((e) => +new Date(e.endDate) < now)
      .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate)),
  };
}

export function Events() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') ?? '';
  const city = searchParams.get('city') ?? '';
  const when = searchParams.get('when') ?? '';

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped by the Search button so re-submitting the same filters refetches.
  const [reloadKey, setReloadKey] = useState(0);

  function setFilter(key: 'type' | 'city' | 'when', value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Replace so typing in the search box does not flood the history stack.
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (city) params.set('city', city);
      if (when) params.set('when', when);
      const qs = params.toString();
      const res = await api.get(`/events${qs ? `?${qs}` : ''}`);
      setEvents(res.data.events ?? []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [type, city, when, reloadKey]);

  const filtersActive = type !== '' || city !== '' || when !== '';
  const canCreate = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { upcoming, past } = splitByTime(events);

  const sections =
    when === 'past'
      ? [{ id: 'past', title: 'Past events', items: events }]
      : when === 'upcoming'
        ? [{ id: 'upcoming', title: 'Upcoming events', items: events }]
        : [
            { id: 'upcoming', title: 'Upcoming events', items: upcoming },
            { id: 'past', title: 'Past events', items: past },
          ];

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
        <div className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              Tournaments · Promotions · Price changes
            </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Events &amp; tournaments
            </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              Find competitions and offers at courts near you, or see what is happening at your
              favourite venue.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative z-10 -mt-6 rounded-2xl border border-border bg-card p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="City or area"
                value={city}
                onChange={(e) => setFilter('city', e.target.value)}
                aria-label="Filter events by city"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => setFilter('city', '')}
                  aria-label="Clear city filter"
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={type}
              onChange={(e) => setFilter('type', e.target.value)}
              aria-label="Filter by event type"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All types</option>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={when}
              onChange={(e) => setFilter('when', e.target.value)}
              aria-label="Filter by date"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {WHEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)} className="rounded-full">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">All events</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${events.length} event${events.length === 1 ? '' : 's'} found`}
              {!loading && city && <span> · {city}</span>}
              {!loading && type && <span> · {getEventMeta(type).label}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filtersActive && !loading && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" /> Clear filters
              </Button>
            )}
            {canCreate && (
              <Button asChild>
                <Link to="/owner/events/create">+ Create event</Link>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-28 w-full rounded-none" />
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No events found"
            description={
              filtersActive
                ? 'Try a different city, type or date range, or clear the filters.'
                : 'Court owners have not published any events yet. Check back soon.'
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          sections
            .filter((section) => section.items.length > 0)
            .map((section, index) => (
              <section key={section.id} className={cn(index > 0 && 'mt-12')}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {section.id === 'past'
                        ? 'Events that have already finished'
                        : 'Coming up at courts near you'}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {section.items.length} event{section.items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
                    section.id === 'past' && 'opacity-80'
                  )}
                >
                  {section.items.map((event, i) => (
                    <FadeIn key={event.id} delay={Math.min(i, 6) * 0.05}>
                      <EventCard event={event} />
                    </FadeIn>
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
