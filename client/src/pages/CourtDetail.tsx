import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type Court = {
  id: string;
  name: string;
  city: string;
  address: string;
  sportType: string;
  dimensions: string | null;
  surfaceType: string | null;
  basePricePerHour: number;
  owner: { id: string; email: string };
  slots: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    pricePerHour: number;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; email: string };
  }>;
};

type MyTeam = { id: string; name: string };

const reviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Pick a rating').max(5),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export function CourtDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const {
    register: registerReview,
    handleSubmit: handleReviewSubmit,
    reset: resetReview,
    formState: { errors: reviewErrors },
  } = useForm<ReviewFormData>({ resolver: zodResolver(reviewSchema) });

  useEffect(() => {
    if (id) fetchCourt();
  }, [id]);

  useEffect(() => {
    // teams the current player belongs to (for optional team booking)
    if (user && user.role === 'PLAYER') {
      api
        .get('/teams')
        .then((res) => {
          const mine = res.data.teams.filter((t: any) =>
            t.members.some((m: any) => m.user.id === user.id)
          );
          setMyTeams(mine.map((t: any) => ({ id: t.id, name: t.name })));
        })
        .catch(() => setMyTeams([]));
    }
  }, [user]);

  async function fetchCourt() {
    try {
      const res = await api.get(`/courts/${id}`);
      setCourt(res.data.court);
      if (res.data.court.slots?.[0]) {
        setSelectedDate(res.data.court.slots[0].date);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load court');
    } finally {
      setLoading(false);
    }
  }

  const onReviewSubmit = async (data: ReviewFormData) => {
    if (!court) return;
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        courtId: court.id,
        rating: data.rating,
        comment: data.comment || undefined,
      });
      toast.success('Review posted!');
      resetReview();
      fetchCourt();
    } catch (err: any) {
      // e.g. friendly duplicate error: "You have already reviewed this court"
      toast.error(err.response?.data?.message || 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const availableSlots = court?.slots.filter((s) => s.isAvailable) || [];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }
  if (!court) return <div className="p-8 text-center">Court not found</div>;

  const myReview = user ? court.reviews.find((r) => r.user.id === user.id) : undefined;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="text-sm text-gray-600 mb-4 inline-block">← Back to courts</Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{court.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
              {court.sportType}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
              {court.sportType === 'ELEVEN_A_SIDE' ? '11' : '5'} vs {court.sportType === 'ELEVEN_A_SIDE' ? '11' : '5'}
            </span>
            {court.dimensions && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                {court.dimensions}
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-500">
            <MapPin className="h-4 w-4 inline mr-1" /> {court.address}, {court.city}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {user && user.role === 'PLAYER' && myTeams.length > 0 && (
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book with team (optional)
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                >
                  <option value="">No team (individual)</option>
                  {myTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">Available Slots</h2>
            {availableSlots.length === 0 ? (
              <p className="text-gray-500">No available slots at the moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSlots.map((slot) => {
                  const isSelected = slot.date === selectedDate;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedDate(slot.date)}
                      className={`p-4 rounded-lg border text-left transition ${
                        isSelected ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="text-sm text-gray-500 mb-1">
                        {new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="font-bold text-gray-900">{slot.startTime} - {slot.endTime}</div>
                      <div className="text-sm text-gray-500 mt-1">${slot.pricePerHour}/hr</div>
                      {user && user.role === 'PLAYER' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            api.post('/bookings', {
                              courtSlotId: slot.id,
                              teamId: selectedTeamId || undefined,
                            }).then(() => {
                              toast.success('Booking created!');
                              fetchCourt();
                            }).catch((err: any) => toast.error(err.response?.data?.message || 'Booking failed'));
                          }}
                          className="mt-3 w-full py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700"
                        >
                          Book Now
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-lg mb-3">Court Info</h3>
              <p className="text-sm text-gray-600 mb-2"><strong>Price:</strong> ${court.basePricePerHour}/hour</p>
              {court.surfaceType && (
                <p className="text-sm text-gray-600 mb-2"><strong>Surface:</strong> {court.surfaceType}</p>
              )}
              <p className="text-sm text-gray-600"><strong>Owner:</strong> {court.owner.email}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-lg mb-3">Reviews ({court.reviews.length})</h3>
              {court.reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              ) : (
                court.reviews.map((r) => (
                  <div key={r.id} className="mb-4 pb-4 border-b border-gray-100 last:border-0 pb-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{r.user.email}</span>
                      <span className="text-sm text-orange-600 font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                  </div>
                ))
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                {!user ? (
                  <p className="text-sm text-gray-500">
                    <Link to="/login" className="text-orange-600 hover:underline">Login</Link> to leave a review.
                  </p>
                ) : user.role !== 'PLAYER' ? null : myReview ? (
                  <p className="text-sm text-gray-500">You've already reviewed this court.</p>
                ) : (
                  <form onSubmit={handleReviewSubmit(onReviewSubmit)} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900">Write a Review</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                      <select
                        {...registerReview('rating')}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      >
                        <option value="">Select rating</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})
                          </option>
                        ))}
                      </select>
                      {reviewErrors.rating && (
                        <p className="text-red-500 text-sm">{reviewErrors.rating.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                      <textarea
                        {...registerReview('comment')}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
                    >
                      {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post Review'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}