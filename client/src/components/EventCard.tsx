import { getLocale } from '../lib/language';
import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarCheck,
  MapPin,
  Percent,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type EventSummary = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  startDate: string;
  endDate: string;
  court: { id: string; name: string; city: string };
};

type EventMeta = {
  icon: LucideIcon;
  label: string;
  /** Tailwind gradient used by cards and the detail hero. */
  gradient: string;
};

const DEFAULT_META: EventMeta = {
  icon: CalendarCheck,
  label: 'Event',
  gradient: 'from-primary via-emerald-600 to-teal-700',
};

export const EVENT_META: Record<string, EventMeta> = {
  TOURNAMENT: {
    icon: Trophy,
    label: 'Tournament',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
  },
  COMPETITION: {
    icon: CalendarCheck,
    label: 'Competition',
    gradient: 'from-primary via-emerald-600 to-teal-700',
  },
  DISCOUNT: {
    icon: Percent,
    label: 'Discount',
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
  },
  PRICE_CHANGE: {
    icon: Building2,
    label: 'Price change',
    gradient: 'from-sky-500 via-blue-600 to-indigo-700',
  },
};

export const EVENT_TYPE_OPTIONS = Object.entries(EVENT_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export function getEventMeta(type: string): EventMeta {
  return EVENT_META[type] ?? DEFAULT_META;
}

export function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString(getLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatEventTime(value: string): string {
  return new Date(value).toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Sat, 25 Oct 2026 · 10:00 – 16:00" or a two-day range. */
export function eventDateRange(event: Pick<EventSummary, 'startDate' | 'endDate'>): string {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${formatEventDate(event.startDate)} · ${formatEventTime(event.startDate)} – ${formatEventTime(event.endDate)}`;
  }
  return `${formatEventDate(event.startDate)}, ${formatEventTime(event.startDate)} → ${formatEventDate(event.endDate)}, ${formatEventTime(event.endDate)}`;
}

export function eventDurationHours(startDate: string, endDate: string): number {
  return Math.max(0, (+new Date(endDate) - +new Date(startDate)) / 3_600_000);
}

export type EventStatus = {
  label: 'Upcoming' | 'Happening now' | 'Ended';
  tone: 'upcoming' | 'live' | 'ended';
};

export function eventStatus(startDate: string, endDate: string): EventStatus {
  const now = Date.now();
  if (now < +new Date(startDate)) return { label: 'Upcoming', tone: 'upcoming' };
  if (now <= +new Date(endDate)) return { label: 'Happening now', tone: 'live' };
  return { label: 'Ended', tone: 'ended' };
}

export const EVENT_STATUS_CLASSES: Record<EventStatus['tone'], string> = {
  upcoming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  live: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ended: 'bg-muted text-muted-foreground',
};

/** Public event card used on the home page and the events list. */
export function EventCard({ event }: { event: EventSummary }) {
  useLanguage();
  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const status = eventStatus(event.startDate, event.endDate);

  return (
    <Link to={`/events/${event.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <div className={cn('relative h-28 overflow-hidden bg-gradient-to-br text-white', meta.gradient)}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white/20 p-2 backdrop-blur">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
                {t(meta.label)}
              </span>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                status.tone === 'live'
                  ? 'bg-white text-amber-700'
                  : status.tone === 'upcoming'
                    ? 'bg-white/90 text-emerald-700'
                    : 'bg-black/30 text-white'
              )}
            >
              {t(status.label)}
            </span>
          </div>
          <h3 className="absolute inset-x-4 bottom-3 line-clamp-2 text-lg font-bold leading-tight drop-shadow">
            {event.title}
          </h3>
        </div>
        <CardContent className="p-5">
          <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {event.description || t("No description provided.")}
          </p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{eventDateRange(event)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {event.court.name}, {event.court.city}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <Badge variant="secondary">{t(meta.label)}</Badge>
            <span className="inline-flex items-center gap-1 font-medium text-foreground"> {t("View details")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
