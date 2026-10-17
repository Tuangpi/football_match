import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

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

  async function fetchCourts() {
    try {
      const res = await api.get('/courts/owner/me');
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load your courts');
    } finally {
      setLoadingCourts(false);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'OWNER') return;
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

  if (!user || user.role !== 'OWNER') {
    return <div className="p-8 text-center">Access denied. Owner role required.</div>;
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
          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">You need a court before you can create events.</p>
          <Link
            to="/owner/courts/create"
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
          >
            List your first court
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Event</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
            <select {...register('courtId')} className={inputClass}>
              <option value="">Select a court</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name} ({court.city})
                </option>
              ))}
            </select>
            {errors.courtId && <p className="text-red-500 text-sm">{errors.courtId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input {...register('title')} placeholder="e.g. Weekend Futsal Tournament" className={inputClass} />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select {...register('type')} className={inputClass}>
              <option value="TOURNAMENT">Tournament</option>
              <option value="COMPETITION">Competition</option>
              <option value="DISCOUNT">Discount</option>
              <option value="PRICE_CHANGE">Price change</option>
            </select>
            {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea {...register('description')} rows={3} className={inputClass} />
            {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
              <input {...register('startDate')} type="datetime-local" className={inputClass} />
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
              <input {...register('endDate')} type="datetime-local" className={inputClass} />
              {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate.message}</p>}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 text-white rounded-md font-medium disabled:opacity-50 hover:bg-orange-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : ''} Publish Event
          </button>
        </form>
      </div>
    </div>
  );
}
