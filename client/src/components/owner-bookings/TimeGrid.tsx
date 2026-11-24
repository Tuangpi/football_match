import { atHour, courtDate, hourLabel } from '@/lib/bookingTime';
import { calendarLabel } from '@/lib/bookingCalendar';
import { t } from '@/lib/language';
import {
  END_HOUR,
  HOUR_PX,
  START_HOUR,
  courtColor,
  layoutDay,
  statusStyle,
  timeChip,
  toMs,
  yFor,
  type Block,
  type Booking,
  type Court,
} from '@/lib/ownerBookingSchedule';

type TimeGridProps = {
  day: string;
  items: Booking[];
  dayBlocks: Block[];
  courts: Court[];
  nowMs: number;
  onSelect: (booking: Booking) => void;
};

export function TimeGrid({ day, items, dayBlocks, courts, nowMs, onSelect }: TimeGridProps) {
  const dayStartMs = toMs(atHour(day, 0));
  const gridHeight = (END_HOUR - START_HOUR) * HOUR_PX;
  const layout = layoutDay(items);
  const nowY = yFor(nowMs, dayStartMs);
  const showNow = day === courtDate() && nowY >= 0 && nowY <= gridHeight;

  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <div className="flex min-w-[320px]">
        <div className="w-14 shrink-0">
          <div className="h-9 border-b" />
          {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
            <div key={START_HOUR + index} className="border-b pr-1 text-right text-[11px] text-muted-foreground" style={{ height: HOUR_PX }}>
              <span className="block -translate-y-2">{hourLabel(START_HOUR + index)}</span>
            </div>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="h-9 border-b border-l px-2 text-xs font-medium text-muted-foreground">
            {calendarLabel(day, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="relative border-l" style={{ height: gridHeight }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
              <div key={START_HOUR + index} className="border-b" style={{ height: HOUR_PX }} />
            ))}
            {dayBlocks.map((block) => {
              const top = Math.max(0, yFor(toMs(block.startsAt), dayStartMs));
              const bottom = Math.min(gridHeight, yFor(toMs(block.endsAt), dayStartMs));
              if (bottom <= 0 || top >= gridHeight) return null;
              return <div key={block.id} className="absolute inset-x-1 overflow-hidden rounded border border-dashed bg-muted/70 p-1 text-[11px]" style={{ top, height: Math.max(18, bottom - top - 2) }}>{t('Blocked')} - {block.reason}</div>;
            })}
            {items.map((booking) => {
              const top = Math.max(0, yFor(toMs(booking.startsAt), dayStartMs));
              const bottom = Math.min(gridHeight, yFor(toMs(booking.endsAt), dayStartMs));
              if (bottom <= 0 || top >= gridHeight) return null;
              const column = layout.placed.get(booking.id) ?? 0;
              return (
                <button key={booking.id} onClick={() => onSelect(booking)} className={`absolute overflow-hidden rounded-lg border-l-4 border-y border-r p-1.5 text-left text-[11px] leading-tight hover:shadow-md ${statusStyle(booking.status)}`} style={{ top, height: Math.max(22, bottom - top - 3), left: `calc(${(column * 100) / layout.columns}% + 2px)`, width: `calc(${100 / layout.columns}% - 4px)` }}>
                  <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${courtColor(booking.court.id, courts)}`} /><strong className="truncate">{timeChip(booking)}</strong></span>
                  <span className="block truncate font-medium">{booking.court.name}</span>
                  <span className="block truncate text-muted-foreground">{booking.player.email}</span>
                </button>
              );
            })}
            {showNow && <div className="pointer-events-none absolute inset-x-0" style={{ top: nowY }}><div className="h-0.5 bg-red-500" /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}