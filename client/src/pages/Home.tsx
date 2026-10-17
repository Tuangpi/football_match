import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

type Court = {
  id: string;
  name: string;
  city: string;
  sportType: string;
  basePricePerHour: number;
  reviews?: Array<{ rating: number }>;
};

export function Home() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  async function fetchCourts() {
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      const res = await api.get(`/courts?${params}`);
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
  }, [city]);

  const avgRating = (court: Court) => {
    if (!court.reviews?.length) return 'N/A';
    const avg = court.reviews.reduce((s, r) => s + r.rating, 0) / court.reviews.length;
    return avg.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-orange-600 py-10 px-4 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">Find & Book Futsal Courts</h1>
        <p className="text-orange-100">Play futsal with friends. Book courts near you.</p>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-end gap-4 mb-6">
          <input
            type="text"
            placeholder="City or area"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button
            onClick={() => fetchCourts()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
          >
            Search
          </button>
          {user && user.role === 'OWNER' && (
            <Link
              to="/owner/courts/create"
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300"
            >
              + List Your Court
            </Link>
          )}
        </div>

        {courts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No courts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => (
              <Link
                key={court.id}
                to={`/courts/${court.id}`}
                className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="h-40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-orange-100/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Search className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900">{court.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{court.city}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>${court.basePricePerHour}/hr</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{court.sportType}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3 w-3" />
                    <span>{court.sportType === 'ELEVEN_A_SIDE' ? '11' : '5'} players</span>
                    <span>•</span>
                    <span>{avgRating(court)} ⭐</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}