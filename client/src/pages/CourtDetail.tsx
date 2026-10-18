import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FadeIn } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import {
  MapPin,
  Star,
  CalendarClock,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { courtImage } from '@/lib/images';

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
  const [pendingSlot, setPendingSlot] = useState<Court['slots'][number] | null>(null);
  const [booking, setBooking] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const {
    register: registerReview,
    handleSubmit: handleReviewSubmit,
    reset: resetReview,
    formState: { errors: reviewErrors },
  } = useForm<ReviewFormData>({ resolver: zodResolver(reviewSchema) });

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const startEditReview = (r: { id: string; rating: number; comment: string | null }) => {
    setEditingReviewId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment ?? '');
  };

  const saveEditReview = async () => {
    if (!editingReviewId) return;
    setReviewBusy(true);
    try {
      await api.patch(`/reviews/${editingReviewId}`, {
        rating: editRating,
        comment: editComment || null,
      });
      toast.success('Review updated');
      setEditingReviewId(null);
      fetchCourt();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to update review',
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    setReviewBusy(true);
    try {
      await api.delete(`/reviews/${id}`);
      toast.success('Review deleted');
      setEditingReviewId(null);
      fetchCourt();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to delete review',
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!pendingSlot) return;
    setBooking(true);
    try {
      await api.post('/bookings', {
        courtSlotId: pendingSlot.id,
        teamId: selectedTeamId || undefined,
      });
      toast.success('Booking created! Pending owner confirmation.');
      setPendingSlot(null);
      fetchCourt();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Booking failed',
      );
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!court)
    return (
      <div className="p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <CalendarClock className="h-8 w-8 text-accent-foreground" />
        </div>
        <p className="text-lg font-semibold">Court not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to courts</Link>
        </Button>
      </div>
    );

  const myReview = user ? court.reviews.find((r) => r.user.id === user.id) : undefined;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground mb-4 inline-block hover:text-foreground transition">← Back to courts</Link>

        {/* Hero header */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-xl mb-8 shadow-soft">
            <img
              src={courtImage(court.id)}
              alt={court.name}
              className="h-56 w-full object-cover sm:h-64"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="border-transparent bg-white/20 text-white backdrop-blur">
                  {court.sportType === 'ELEVEN_A_SIDE' ? '11-a-side' : 'Futsal'}
                </Badge>
                <Badge variant="secondary" className="bg-white/90 text-foreground">
                  {court.sportType === 'ELEVEN_A_SIDE' ? '11 vs 11' : '5 vs 5'}
                </Badge>
                {court.dimensions && (
                  <Badge variant="secondary" className="bg-white/90 text-foreground">
                    {court.dimensions}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold drop-shadow">{court.name}</h1>
              <p className="mt-1 text-sm text-white/85">
                <MapPin className="h-4 w-4 inline mr-1" />
                {court.address}, {court.city}
              </p>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {user && user.role === 'PLAYER' && myTeams.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Label className="mb-1 block">
                    Book with team (optional)
                  </Label>
                  <Select value={selectedTeamId || 'none'} onValueChange={(v) => setSelectedTeamId(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No team (individual)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team (individual)</SelectItem>
                      {myTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
            <h2 className="text-xl font-bold text-foreground">Available Slots</h2>
            {availableSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No available slots at the moment.</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later — owners add slots regularly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSlots.map((slot, i) => {
                  const isSelected = slot.date === selectedDate;
                  return (
                    <FadeIn key={slot.id} delay={Math.min(i, 6) * 0.04}>
                      <Card
                        onClick={() => setSelectedDate(slot.date)}
                        className={`cursor-pointer text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-soft ring-2 ring-primary/30'
                            : 'hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="font-bold text-foreground text-lg">{slot.startTime} - {slot.endTime}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Tag className="h-3.5 w-3.5" /> ${slot.pricePerHour}/hr
                          </div>
                          {user && user.role === 'PLAYER' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingSlot(slot);
                              }}
                              className="mt-3 w-full"
                              size="sm"
                            >
                              Book Now
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </FadeIn>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Court Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2"><strong>Price:</strong> ${court.basePricePerHour}/hour</p>
                {court.surfaceType && (
                  <p className="text-sm text-muted-foreground mb-2"><strong>Surface:</strong> {court.surfaceType}</p>
                )}
                <p className="text-sm text-muted-foreground"><strong>Owner:</strong> {court.owner.email}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reviews ({court.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {court.reviews.length === 0 ? (
                  <div className="py-6 text-center">
                    <Star className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No reviews yet. Be the first to rate this court!</p>
                  </div>
                ) : (
                  court.reviews.map((r) => {
                    const mine = user && r.user.id === user.id;
                    const editing = editingReviewId === r.id;
                    return (
                      <div key={r.id} className="mb-4 flex gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                        <Avatar name={r.user.email} size="sm" />
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{r.user.email}</span>
                            {mine && !editing && (
                              <span className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => startEditReview(r)}
                                  disabled={reviewBusy}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => deleteReview(r.id)}
                                  disabled={reviewBusy}
                                >
                                  Delete
                                </Button>
                              </span>
                            )}
                          </div>
                          {editing ? (
                            <div className="space-y-2 rounded-lg border border-border/60 p-3">
                              <select
                                value={editRating}
                                onChange={(e) => setEditRating(Number(e.target.value))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="Edit rating"
                              >
                                {[5, 4, 3, 2, 1].map((n) => (
                                  <option key={n} value={n}>
                                    {'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})
                                  </option>
                                ))}
                              </select>
                              <Textarea
                                rows={2}
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                placeholder="Comment (optional)"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingReviewId(null)}
                                  disabled={reviewBusy}
                                >
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={saveEditReview} disabled={reviewBusy}>
                                  {reviewBusy ? 'Saving…' : 'Save'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-1 text-sm text-primary font-bold">
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                              </div>
                              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="mt-4 pt-4 border-t border-border/60">
                  {!user ? (
                    <p className="text-sm text-muted-foreground">
                      <Link to="/login" className="text-primary hover:underline">Login</Link> to leave a review.
                    </p>
                  ) : user.role !== 'PLAYER' ? null : myReview ? (
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve already reviewed this court — use <strong>Edit</strong> or{' '}
                      <strong>Delete</strong> on your review above to change it.
                    </p>
                  ) : (
                    <form onSubmit={handleReviewSubmit(onReviewSubmit)} className="space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Write a Review</h4>
                      <div>
                        <Label className="mb-1 block">Rating</Label>
                        <select
                          {...registerReview('rating')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select rating</option>
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})
                            </option>
                          ))}
                        </select>
                        {reviewErrors.rating && (
                          <p className="text-destructive text-sm">{reviewErrors.rating.message}</p>
                        )}
                      </div>
                      <div>
                        <Label className="mb-1 block">Comment (optional)</Label>
                        <Textarea
                          {...registerReview('comment')}
                          rows={2}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submittingReview}
                        size="sm"
                      >
                        {submittingReview ? 'Posting…' : 'Post Review'}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Booking confirmation dialog */}
        <Dialog open={!!pendingSlot} onOpenChange={(open) => !open && setPendingSlot(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm booking</DialogTitle>
              <DialogDescription>
                You&apos;re about to book <strong>{court.name}</strong>
                {pendingSlot && (
                  <>
                    {' '}on{' '}
                    {new Date(pendingSlot.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    at {pendingSlot.startTime} – {pendingSlot.endTime}.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-accent/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">${pendingSlot?.pricePerHour}/hr</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Team</span>
                <span className="font-semibold">
                  {selectedTeamId
                    ? myTeams.find((t) => t.id === selectedTeamId)?.name || 'Team'
                    : 'Individual'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingSlot(null)} disabled={booking}>
                Cancel
              </Button>
              <Button onClick={confirmBooking} disabled={booking}>
                {booking ? 'Booking…' : 'Confirm booking'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}