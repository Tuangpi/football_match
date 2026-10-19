import { message } from '../lib/language';
import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { EventCard, type EventSummary } from '@/components/EventCard';

export function OwnerEvents() {
  useLanguage();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get('/events/owner/me');
        if (active) setEvents(res.data.events);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [reloadKey, user?.id]);

  async function deleteEvent(event: EventSummary) {
    if (!window.confirm(message('Delete "{name}"? This cannot be undone.', { name: event.title }))) return;
    setDeletingId(event.id);
    try {
      await api.delete(`/events/${event.id}`);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      toast.success(t("Event deleted"));
    } catch {
      toast.error(t("Failed to delete event. Please try again."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("Event Management")}</h1>
          <p className="mt-2 text-muted-foreground">
            {user?.role === 'ADMIN' ? t("Manage events across all courts.") : t("Create, edit and delete events for your courts only.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/events">{t("Browse public events")}</Link></Button>
          <Button asChild><Link to="/owner/events/create"><Plus className="h-4 w-4" /> {t("Create event")}</Link></Button>
        </div>
      </div>

      {loading ? (
        <div role="status" className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /><span className="sr-only">{t("Loading events")}</span></div>
      ) : error ? (
        <Card><CardContent className="space-y-4 p-8 text-center">
          <p role="alert">{t("Unable to load your events.")}</p>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>{t("Try again")}</Button>
        </CardContent></Card>
      ) : events.length === 0 ? (
        <EmptyState icon={Calendar} title={t("No events yet")} description={t("Publish an event for one of your courts to get started.")} action={<Button asChild><Link to="/owner/events/create">{t("Create event")}</Link></Button>} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="space-y-3">
              <EventCard event={event} />
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1"><Link to={`/owner/events/${event.id}/edit`}><Pencil className="h-4 w-4" /> {t("Edit")}</Link></Button>
                <Button variant="destructive" disabled={deletingId !== null} onClick={() => deleteEvent(event)} aria-label={message("Delete {name}", { name: event.title })}>
                  {deletingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {t("Delete")} </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}