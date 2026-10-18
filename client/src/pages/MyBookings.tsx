import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Clock, Calendar, Loader2 } from 'lucide-react';
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
  cancelledAt: string | null;
  court: { id: string; name: string; city: string };
  courtSlot: { date: string; startTime: string; endTime: string };
  team: { id: string; name: string } | null;
};

export function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchBookings() {
    try {
      const res = await api.get('/bookings/me');
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

  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Bookings</h1>
        {bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Find a court and grab your first slot."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/">Browse courts</Link>
              </Button>
            }
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
                    <p className="text-sm text-muted-foreground">{b.court.city}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground/70" />
                      <span>{new Date(b.courtSlot.date).toLocaleDateString()}, {b.courtSlot.startTime} - {b.courtSlot.endTime}</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Total: ${b.totalPrice}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {b.status !== 'CANCELLED' && (
                      <Button
                        onClick={() => cancelBooking(b.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Cancel
                      </Button>
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