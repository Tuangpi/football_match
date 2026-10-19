import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'TOURNAMENT' },
  });

  const isAdmin = user?.role === 'ADMIN';

  async function fetchCourts() {
    try {
      // Admins can publish for any active court; owners only for their own.
      const res = await api.get(isAdmin ? '/courts' : '/courts/owner/me');
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load courts');
    } finally {
      setLoadingCourts(false);
    }
  }

  useEffect(() => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, [user]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/events', {
        courtId: data.courtId,
        title: data.title,
        type: data.type,
        description: data.description || undefined,
        // datetime-local values are local time; send full ISO (Z) as the API requires
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      toast.success('Event published!');
      navigate('/events');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return <div className="p-8 text-center">Access denied. Owner or admin role required.</div>;
  }

  if (loadingCourts) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
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
              ? 'There are no active courts to publish an event for.'
              : 'You need a court before you can create events.'}
          </p>
          {!isAdmin && (
            <Button asChild size="sm">
              <Link to="/owner/courts/create">List your first court</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Create Event</h1>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label className="mb-1 block">Court</Label>
                <select {...register('courtId')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Select a court</option>
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name} ({court.city})
                    </option>
                  ))}
                </select>
                {errors.courtId && <p className="text-destructive text-sm">{errors.courtId.message}</p>}
              </div>
              <div>
                <Label className="mb-1 block">Title</Label>
                <Input {...register('title')} placeholder="e.g. Weekend Futsal Tournament" />
                {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
              </div>
              <div>
                <Label className="mb-1 block">Type</Label>
                <select {...register('type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="TOURNAMENT">Tournament</option>
                  <option value="COMPETITION">Competition</option>
                  <option value="DISCOUNT">Discount</option>
                  <option value="PRICE_CHANGE">Price change</option>
                </select>
                {errors.type && <p className="text-destructive text-sm">{errors.type.message}</p>}
              </div>
              <div>
                <Label className="mb-1 block">Description (optional)</Label>
                <Textarea {...register('description')} rows={3} />
                {errors.description && <p className="text-destructive text-sm">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Start Date &amp; Time</Label>
                  <Input {...register('startDate')} type="datetime-local" />
                  {errors.startDate && <p className="text-destructive text-sm">{errors.startDate.message}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">End Date &amp; Time</Label>
                  <Input {...register('endDate')} type="datetime-local" />
                  {errors.endDate && <p className="text-destructive text-sm">{errors.endDate.message}</p>}
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : ''} Publish Event
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
