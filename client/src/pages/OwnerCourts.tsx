import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, MapPin, Plus, Pencil, Trash2, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Court = {
  id: string;
  name: string;
  address: string;
  city: string;
  sportType: string;
  dimensions: string | null;
  surfaceType: string | null;
  basePricePerHour: number;
  isActive: boolean;
  slots: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    pricePerHour: number;
  }>;
};

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.coerce.number().positive('Price must be positive'),
});

type EditFormData = z.infer<typeof editSchema>;

const slotSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  pricePerHour: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === '' || Number(v) > 0, 'Price must be positive'),
});

type SlotFormData = z.infer<typeof slotSchema>;

// Send local date as local-noon ISO so the stored date shows the right day in the UI
function toIsoDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function CourtCard({ court, onChanged }: { court: Court; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [saving, setSaving] = useState(false);

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: court.name,
      address: court.address,
      city: court.city,
      sportType: court.sportType === 'ELEVEN_A_SIDE' ? 'ELEVEN_A_SIDE' : 'FUTSAL',
      dimensions: court.dimensions ?? '',
      surfaceType: court.surfaceType ?? '',
      basePricePerHour: court.basePricePerHour,
    },
  });

  const slotForm = useForm<SlotFormData>({ resolver: zodResolver(slotSchema) });

  async function onEditSubmit(data: EditFormData) {
    setSaving(true);
    try {
      await api.put(`/courts/${court.id}`, data);
      toast.success('Court updated');
      setEditing(false);
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update court');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    try {
      await api.put(`/courts/${court.id}`, { isActive: !court.isActive });
      toast.success(court.isActive ? 'Court deactivated' : 'Court activated');
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update court');
    }
  }

  async function onDelete() {
    if (!window.confirm(`Delete "${court.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/courts/${court.id}`);
      toast.success('Court deleted');
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete court');
    }
  }

  async function onSlotSubmit(data: SlotFormData) {
    setSaving(true);
    try {
      await api.post(`/courts/${court.id}/slots`, {
        date: toIsoDate(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        pricePerHour: data.pricePerHour ? Number(data.pricePerHour) : undefined,
      });
      toast.success('Slot added');
      slotForm.reset();
      setAddingSlot(false);
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add slot');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none';

  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-lg">{court.name}</h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                court.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {court.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
              {court.sportType}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            <MapPin className="h-4 w-4 inline mr-1" />
            {court.address}, {court.city}
          </p>
          <p className="text-sm text-gray-600 mt-1">${court.basePricePerHour}/hour</p>
          <Link to={`/courts/${court.id}`} className="text-sm text-orange-600 hover:underline mt-1 inline-block">
            View public page →
          </Link>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => {
              setEditing(!editing);
              setAddingSlot(false);
            }}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={toggleActive}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
          >
            {court.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200 flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Edit court</h4>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
              <input {...editForm.register('name')} className={inputClass} />
              {editForm.formState.errors.name && (
                <p className="text-red-500 text-sm">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport Type</label>
              <select {...editForm.register('sportType')} className={inputClass}>
                <option value="FUTSAL">Futsal (5v5)</option>
                <option value="ELEVEN_A_SIDE">11-a-side</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input {...editForm.register('address')} className={inputClass} />
            {editForm.formState.errors.address && (
              <p className="text-red-500 text-sm">{editForm.formState.errors.address.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input {...editForm.register('city')} className={inputClass} />
              {editForm.formState.errors.city && (
                <p className="text-red-500 text-sm">{editForm.formState.errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour ($)</label>
              <input {...editForm.register('basePricePerHour')} type="number" className={inputClass} />
              {editForm.formState.errors.basePricePerHour && (
                <p className="text-red-500 text-sm">{editForm.formState.errors.basePricePerHour.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
              <input {...editForm.register('dimensions')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surface Type</label>
              <input {...editForm.register('surfaceType')} className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </button>
        </form>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-900">
            Recent slots <span className="text-sm font-normal text-gray-500">({court.slots.length} shown)</span>
          </h4>
          <button
            onClick={() => {
              setAddingSlot(!addingSlot);
              setEditing(false);
            }}
            className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Slot
          </button>
        </div>
        {court.slots.length === 0 ? (
          <p className="text-sm text-gray-500">No slots yet.</p>
        ) : (
          <ul className="space-y-1">
            {court.slots.map((slot) => (
              <li key={slot.id} className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {new Date(slot.date).toLocaleDateString()}, {slot.startTime} - {slot.endTime} (${slot.pricePerHour}/hr)
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    slot.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {slot.isAvailable ? 'Available' : 'Booked'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {addingSlot && (
          <form onSubmit={slotForm.handleSubmit(onSlotSubmit)} className="mt-4 bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Add time slot</h4>
              <button type="button" onClick={() => setAddingSlot(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input {...slotForm.register('date')} type="date" className={inputClass} />
                {slotForm.formState.errors.date && (
                  <p className="text-red-500 text-sm">{slotForm.formState.errors.date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input {...slotForm.register('startTime')} type="time" className={inputClass} />
                {slotForm.formState.errors.startTime && (
                  <p className="text-red-500 text-sm">{slotForm.formState.errors.startTime.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input {...slotForm.register('endTime')} type="time" className={inputClass} />
                {slotForm.formState.errors.endTime && (
                  <p className="text-red-500 text-sm">{slotForm.formState.errors.endTime.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price/Hour ($) — optional</label>
                <input
                  {...slotForm.register('pricePerHour')}
                  type="number"
                  placeholder="Court default"
                  className={inputClass}
                />
                {slotForm.formState.errors.pricePerHour && (
                  <p className="text-red-500 text-sm">{slotForm.formState.errors.pricePerHour.message}</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Slot'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function OwnerCourts() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCourts() {
    try {
      const res = await api.get('/courts/owner/me');
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
  }, []);

  if (!user || user.role !== 'OWNER') {
    return <div className="p-8 text-center">Access denied. Owner role required.</div>;
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Courts</h1>
          <Link
            to="/owner/courts/create"
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Court
          </Link>
        </div>
        {courts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">You have no courts yet.</p>
            <Link
              to="/owner/courts/create"
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              List your first court
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} onChanged={fetchCourts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
