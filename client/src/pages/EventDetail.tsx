import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { FadeIn } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import {
  EVENT_STATUS_CLASSES,
  eventDateRange,
  eventDurationHours,
  eventStatus,
  formatEventDate,
  formatEventTime,
  getEventMeta,
} from '@/components/EventCard';
import { ArrowLeft, ArrowRight, Calendar, CalendarX, Clock, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type EventDetailData = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  startDate: string;
  endDate: string;
  court: {
    id: string;
    name: string;
    city: string;
    address: string;
    sportType: string;
    basePricePerHour: number;
  };
};

export function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function fetchEvent() {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to load event');
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState
          icon={CalendarX}
          title="Event not found"
          description="This event may have been removed, or the link is incorrect."
          action={
            <Button variant="outline" asChild>
              <Link to="/events">Back to all events</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const status = eventStatus(event.startDate, event.endDate);
  const duration = eventDurationHours(event.startDate, event.endDate);
  const durationLabel = Number.isInteger(duration) ? `${duration}` : duration.toFixed(1);
  const sportLabel = event.court.sportType === 'ELEVEN_A_SIDE' ? '11-a-side' : 'Futsal';

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className={cn('relative overflow-hidden bg-gradient-to-br text-white', meta.gradient)}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <FadeIn>
            <Link
              to="/events"
              className="inline-flex items-center gap-1 text-sm text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> All events
            </Link>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {meta.label}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  EVENT_STATUS_CLASSES[status.tone]
                )}
              >
                {status.label}
              </span>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              {event.title}
            </h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-4 flex flex-col gap-2 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <span className="inline-flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {eventDateRange(event)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {event.court.name}, {event.court.city}
              </span>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {event.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 rounded-lg bg-accent p-2 text-accent-foreground">
                    <Calendar className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Starts</p>
                    <p className="text-sm text-muted-foreground">
                      {formatEventDate(event.startDate)} at {formatEventTime(event.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 rounded-lg bg-accent p-2 text-accent-foreground">
                    <Clock className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ends</p>
                    <p className="text-sm text-muted-foreground">
                      {formatEventDate(event.endDate)} at {formatEventTime(event.endDate)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                  Runs for{' '}
                  <span className="font-medium text-foreground">
                    {durationLabel} hour{duration === 1 ? '' : 's'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Venue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{event.court.name}</p>
                  <p className="text-muted-foreground">{event.court.address}</p>
                  <p className="text-muted-foreground">{event.court.city}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{sportLabel}</Badge>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" aria-hidden /> {formatPrice(event.court.basePricePerHour)}/hr
                  </span>
                </div>
                <Button asChild className="w-full">
                  <Link to={`/courts/${event.court.id}`}>
                    View court &amp; book <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Hosted by the court</p>
                <p>
                  Event details are published by the court owner. Contact the venue for late
                  changes or extra information.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-10">
          <Button variant="outline" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4" /> Back to all events
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
