import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';

type Booking = {
  id: string;
  status: string;
  totalPrice: number;
  bookedAt: string;
  court: { id: string; name: string };
  courtSlot: { date: string; startTime: string; endTime: string };
  player: { id: string; email: string };
  team: { id: string; name: string } | null;
};

export function OwnerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchBookings() {
    try {
      const res = await api.get('/bookings/owner');
      setBookings(res.data.bookings);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/bookings/owner/${id}/status`, { status });
      toast.success(`Booking ${status.toLowerCase()}`);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Booking Management</h1>
        {bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Bookings for your courts will appear here once players reserve slots."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-5 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={b.status === 'CONFIRMED' ? 'default' : b.status === 'CANCELLED' ? 'destructive' : 'secondary'}>{b.status}</Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{b.court.name}</h3>
                    <p className="text-sm text-muted-foreground">Player: {b.player.email}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground/70" />
                      <span>{new Date(b.courtSlot.date).toLocaleDateString()}, {b.courtSlot.startTime} - {b.courtSlot.endTime}</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">Total: {formatPrice(b.totalPrice)}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {b.status === 'PENDING' && (
                      <>
                        <Button
                          onClick={() => updateStatus(b.id, 'CONFIRMED')}
                          size="sm"
                        >
                          Confirm
                        </Button>
                        <Button
                          onClick={() => updateStatus(b.id, 'CANCELLED')}
                          variant="destructive"
                          size="sm"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}