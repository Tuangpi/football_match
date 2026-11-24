import { useCallback, useState } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';
import type { OwnerScheduleResponse } from '@/lib/api-types';
import type { Block, Booking, Court } from '@/lib/ownerBookingSchedule';

type BookingStatusUpdate = 'CONFIRMED' | 'CANCELLED';

type BookingStatusResponse = {
  success: true;
  booking: Booking;
};

export function useOwnerBookingSchedule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [blocked, setBlocked] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<OwnerScheduleResponse>('/bookings/owner/schedule');
      setBookings(data.bookings);
      setCourts(data.courts);
      setBlocked(data.blocks);
      setError('');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Unable to load the schedule. Please retry.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingStatusUpdate): Promise<Booking> => {
      const { data } = await api.patch<BookingStatusResponse>(
        `/bookings/owner/${bookingId}/status`,
        { status },
      );
      setBookings((previous) =>
        previous.map((booking) => (booking.id === bookingId ? data.booking : booking)),
      );
      return data.booking;
    },
    [],
  );

  return {
    bookings,
    courts,
    blocked,
    loading,
    error,
    load,
    updateBookingStatus,
  };
}