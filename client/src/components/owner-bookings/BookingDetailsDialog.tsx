import { formatBooking } from '@/lib/bookingTime';
import { formatPrice } from '@/lib/currency';
import { t } from '@/lib/language';
import type { Booking } from '@/lib/ownerBookingSchedule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BookingDetailsDialogProps = {
  booking: Booking | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (status: 'CONFIRMED' | 'CANCELLED') => void;
};

export function BookingDetailsDialog({
  booking,
  busy,
  onOpenChange,
  onUpdateStatus,
}: BookingDetailsDialogProps) {
  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Booking details')}</DialogTitle>
          <DialogDescription>
            {booking ? `${booking.court.name} · ${formatBooking(booking)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="space-y-2 text-sm">
            <p><strong>{t('Status')}:</strong> {t(booking.status)}</p>
            <p><strong>{t('Player')}:</strong> {booking.player.email}</p>
            {booking.team && <p><strong>{t('Team')}:</strong> {booking.team.name}</p>}
            <p><strong>{t('Total')}:</strong> {formatPrice(booking.totalPrice)}</p>
            <div className="flex gap-2 pt-2">
              {booking.status === 'PENDING' && <Button disabled={busy} onClick={() => onUpdateStatus('CONFIRMED')}>{t('Confirm')}</Button>}
              {booking.status !== 'CANCELLED' && <Button variant="destructive" disabled={busy} onClick={() => onUpdateStatus('CANCELLED')}>{t('Cancel booking')}</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}