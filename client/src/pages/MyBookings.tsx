import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>
        {bookings.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No bookings yet.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{b.status}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{b.court.name}</h3>
                  <p className="text-sm text-gray-600">{b.court.city}</p>
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{new Date(b.courtSlot.date).toLocaleDateString()}, {b.courtSlot.startTime} - {b.courtSlot.endTime}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Total: ${b.totalPrice}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {b.status !== 'CANCELLED' && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}