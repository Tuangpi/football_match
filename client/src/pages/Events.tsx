import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Calendar, Trophy, Percent, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';

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
          <h1 className="text-2xl font-bold text-foreground">Court Events</h1>
          {user && user.role === 'OWNER' && (
            <Button asChild>
              <Link to="/owner/events/create">+ Create Event</Link>
            </Button>
          )}
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events at the moment"
            description="Tournaments, discounts and promos from court owners will show up here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const Icon = typeIcon[e.type] || Calendar;
              return (
                <Card key={e.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-accent text-primary rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary">{e.type}</Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{e.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{e.description || 'No description'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(e.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{e.court.name}, {e.court.city}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}