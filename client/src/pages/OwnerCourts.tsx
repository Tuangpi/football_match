import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, MapPin, Plus, Pencil, Trash2, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';

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

  async function deleteSlot(slotId: string) {
    if (!window.confirm('Delete this slot? Cancelled bookings on it will be removed too.')) return;
    try {
      await api.delete(`/courts/${court.id}/slots/${slotId}`);
      toast.success('Slot deleted');
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete slot');
    }
  }

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

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-lg">{court.name}</h3>
              <Badge variant={court.isActive ? 'default' : 'secondary'}>
                {court.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
              <Badge variant="secondary">
                {court.sportType}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 inline mr-1" />
              {court.address}, {court.city}
            </p>
            <p className="text-sm text-muted-foreground mt-1">${court.basePricePerHour}/hour</p>
            <Link to={`/courts/${court.id}`} className="text-sm text-primary hover:underline mt-1 inline-block">
              View public page →
            </Link>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={() => {
                setEditing(!editing);
                setAddingSlot(false);
              }}
              variant="secondary"
              size="sm"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              onClick={toggleActive}
              variant="secondary"
              size="sm"
            >
              {court.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              onClick={onDelete}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

      {editing && (
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="mt-4 pt-4 border-t border-border/60 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-foreground">Edit court</h4>
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Court Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-destructive text-sm">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-1 block">Sport Type</Label>
              <select {...editForm.register('sportType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="FUTSAL">Futsal (5v5)</option>
                <option value="ELEVEN_A_SIDE">11-a-side</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Address</Label>
            <Input {...editForm.register('address')} />
            {editForm.formState.errors.address && (
              <p className="text-destructive text-sm">{editForm.formState.errors.address.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">City</Label>
              <Input {...editForm.register('city')} />
              {editForm.formState.errors.city && (
                <p className="text-destructive text-sm">{editForm.formState.errors.city.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-1 block">Price per Hour ($)</Label>
              <Input {...editForm.register('basePricePerHour')} type="number" />
              {editForm.formState.errors.basePricePerHour && (
                <p className="text-destructive text-sm">{editForm.formState.errors.basePricePerHour.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Dimensions</Label>
              <Input {...editForm.register('dimensions')} />
            </div>
            <div>
              <Label className="mb-1 block">Surface Type</Label>
              <Input {...editForm.register('surfaceType')} />
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            size="sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </form>
      )}

      <div className="mt-4 pt-4 border-t border-border/60">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-foreground">
            Recent slots <span className="text-sm font-normal text-muted-foreground">({court.slots.length} shown)</span>
          </h4>
          <Button
            onClick={() => {
              setAddingSlot(!addingSlot);
              setEditing(false);
            }}
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Slot
          </Button>
        </div>
        {court.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots yet.</p>
        ) : (
          <ul className="space-y-1">
            {court.slots.map((slot) => (
              <li key={slot.id} className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                {new Date(slot.date).toLocaleDateString()}, {slot.startTime} - {slot.endTime} (${slot.pricePerHour}/hr)
                <Badge variant={slot.isAvailable ? 'default' : 'destructive'}>
                  {slot.isAvailable ? 'Available' : 'Booked'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteSlot(slot.id)}
                  aria-label="Delete slot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {addingSlot && (
          <form onSubmit={slotForm.handleSubmit(onSlotSubmit)} className="mt-4 bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-foreground">Add time slot</h4>
              <Button type="button" variant="ghost" size="icon" onClick={() => setAddingSlot(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="mb-1 block">Date</Label>
                <Input {...slotForm.register('date')} type="date" />
                {slotForm.formState.errors.date && (
                  <p className="text-destructive text-sm">{slotForm.formState.errors.date.message}</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block">Start Time</Label>
                <Input {...slotForm.register('startTime')} type="time" />
                {slotForm.formState.errors.startTime && (
                  <p className="text-destructive text-sm">{slotForm.formState.errors.startTime.message}</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block">End Time</Label>
                <Input {...slotForm.register('endTime')} type="time" />
                {slotForm.formState.errors.endTime && (
                  <p className="text-destructive text-sm">{slotForm.formState.errors.endTime.message}</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block">Price/Hour ($) — optional</Label>
                <Input
                  {...slotForm.register('pricePerHour')}
                  type="number"
                  placeholder="Court default"
                />
                {slotForm.formState.errors.pricePerHour && (
                  <p className="text-destructive text-sm">{slotForm.formState.errors.pricePerHour.message}</p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={saving}
              size="sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Slot'}
            </Button>
          </form>
        )}
      </div>
      </CardContent>
    </Card>
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
          <h1 className="text-2xl font-bold text-foreground">My Courts</h1>
          <Button asChild size="sm">
            <Link to="/owner/courts/create">
              <Plus className="h-4 w-4" /> Add Court
            </Link>
          </Button>
        </div>
        {courts.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="You have no courts yet"
            description="List your first court so players can find and book it."
            action={
              <Button asChild size="sm">
                <Link to="/owner/courts/create">List your first court</Link>
              </Button>
            }
          />
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
