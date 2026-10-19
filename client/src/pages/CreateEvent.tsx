import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Court = {
  id: string;
  name: string;
  city: string;
};

const schema = z
  .object({
    courtId: z.string().min(1, 'Select a court'),
    title: z.string().min(1, 'Title is required'),
    type: z.enum(['TOURNAMENT', 'COMPETITION', 'DISCOUNT', 'PRICE_CHANGE']),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((data) => new Date(data.endDate).getTime() > new Date(data.startDate).getTime(), {
    message: 'End must be after start',
    path: ['endDate'],
  });

type FormData = z.infer<typeof schema>;

function toLocalDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CreateEvent() {
  useLanguage();
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'TOURNAMENT' },
  });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) return;
    let active = true;
    async function load() {
      try {
        if (id) {
          const res = await api.get(`/events/owner/me/${id}`);
          if (!active) return;
          const event = res.data.event;
          setCourts([event.court]);
          reset({
            courtId: event.court.id,
            title: event.title,
            type: event.type,
            description: event.description ?? '',
            startDate: toLocalDateTime(event.startDate),
            endDate: toLocalDateTime(event.endDate),
          });
        } else {
          const res = await api.get(isAdmin ? '/courts' : '/courts/owner/me');
          if (active) setCourts(res.data.courts);
        }
      } catch {
        if (active) {
          setLoadError(true);
          toast.error(id ? t("Event not found or unavailable for management") : t("Failed to load courts"));
        }
      } finally {
        if (active) setLoadingCourts(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user, id, isAdmin, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        title: data.title,
        type: data.type,
        description: data.description ?? '',
        // datetime-local values are local time; send full ISO (Z) as the API requires
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      if (editing) await api.put(`/events/${id}`, payload);
      else await api.post('/events', { ...payload, courtId: data.courtId });
      toast.success(editing ? t("Event updated!") : t("Event published!"));
      navigate('/owner/events');
    } catch (err: any) {
      toast.error(t(err.response?.data?.message || t("Failed to save event")));
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return <div className="p-8 text-center">{t("Access denied. Owner or admin role required.")}</div>;
  }

  if (loadingCourts) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p>{editing ? t("Event not found or unavailable for management.") : t("Unable to load courts. Please try again.")}</p>
        <Button asChild variant="outline"><Link to="/owner/events">{t("Back to event management")}</Link></Button>
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {isAdmin
              ? t("There are no active courts to publish an event for.")
              : t("You need a court before you can create events.")}
          </p>
          {!isAdmin && (
            <Button asChild size="sm">
              <Link to="/owner/courts/create">{t("List your first court")}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/owner/events" className="mb-4 inline-block text-sm text-primary hover:underline">{t("← Event Management")}</Link>
        <h1 className="text-2xl font-bold text-foreground mb-6">{editing ? t("Edit Event") : t("Create Event")}</h1>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label className="mb-1 block">{t("Court")}</Label>
                {editing && <input type="hidden" {...register('courtId')} />}
                <select {...(editing ? { value: courts[0]?.id } : register('courtId'))} aria-label={t("Court")} disabled={editing} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">{t("Select a court")}</option>
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name} ({court.city})
                    </option>
                  ))}
                </select>
                {errors.courtId && <p className="text-destructive text-sm">{t(errors.courtId.message)}</p>}
              </div>
              <div>
                <Label className="mb-1 block">{t("Title")}</Label>
                <Input {...register('title')} placeholder={t("e.g. Weekend Futsal Tournament")} />
                {errors.title && <p className="text-destructive text-sm">{t(errors.title.message)}</p>}
              </div>
              <div>
                <Label className="mb-1 block">{t("Type")}</Label>
                <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="TOURNAMENT">{t("Tournament")}</option>
                  <option value="COMPETITION">{t("Competition")}</option>
                  <option value="DISCOUNT">{t("Discount")}</option>
                  <option value="PRICE_CHANGE">{t("Price change")}</option>
                </select>
                {errors.type && <p className="text-destructive text-sm">{t(errors.type.message)}</p>}
              </div>
              <div>
                <Label className="mb-1 block">{t("Description (optional)")}</Label>
                <Textarea {...register('description')} rows={3} />
                {errors.description && <p className="text-destructive text-sm">{t(errors.description.message)}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">{t("Start Date & Time")}</Label>
                  <Input {...register('startDate')} type="datetime-local" />
                  {errors.startDate && <p className="text-destructive text-sm">{t(errors.startDate.message)}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">{t("End Date & Time")}</Label>
                  <Input {...register('endDate')} type="datetime-local" />
                  {errors.endDate && <p className="text-destructive text-sm">{t(errors.endDate.message)}</p>}
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : ''} {editing ? t("Save changes") : t("Publish Event")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
