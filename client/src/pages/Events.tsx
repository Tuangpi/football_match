import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Calendar, Trophy, Percent, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type Event = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  startDate: string;
  endDate: string;
  court: { id: string; name: string; city: string };
};

const typeIcon: Record<string, any> = {
  TOURNAMENT: Trophy,
  COMPETITION: Calendar,
  DISCOUNT: Percent,
  PRICE_CHANGE: Building2,
};

export function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, []);

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Court Events</h1>
          {user && user.role === 'OWNER' && (
            <Link to="/owner/events/create" className="px-4 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700">
              + Create Event
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No events at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const Icon = typeIcon[e.type] || Calendar;
              return (
                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{e.type}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{e.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{e.description || 'No description'}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(e.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Building2 className="h-4 w-4" />
                    <span>{e.court.name}, {e.court.city}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}