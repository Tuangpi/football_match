import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  atHour,
  courtDate,
  formatBooking,
  hourLabel,
  overlaps,
  type TimeRange,
} from "@/lib/bookingTime";
import { formatPrice } from "@/lib/currency";
import {
  calendarDays,
  calendarLabel,
  onCalendarDay,
  shiftPeriod,
  type CalendarView,
} from "@/lib/bookingCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Booking = TimeRange & {
  id: string;
  status: string;
  totalPrice: number;
  court: { id: string; name: string };
  player: { id: string; email: string };
  team: { id: string; name: string } | null;
};
type Court = { id: string; name: string };
type Block = TimeRange & { courtId: string; reason: string };
export function OwnerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [date, setDate] = useState(courtDate());
  const [courtId, setCourtId] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<CalendarView | "list">("day");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<Block[]>([]);
  async function load() {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.get("/bookings/owner"), api.get("/courts/owner/me")]);
      const blocks = await Promise.all(
        c.data.courts.map(async (court: Court) => {
          const res = await api.get(`/courts/${court.id}/blocks`);
          return res.data.blocks;
        }),
      );
      setBookings(b.data.bookings);
      setCourts(c.data.courts);
      setBlocked(blocks.flat());
      setError("");
    } catch {
      setError("Unable to load the schedule. Please retry.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function update(next: string) {
    if (!selected || busy) return;
    if (next === "CANCELLED" && !window.confirm("Cancel this booking and release its time?"))
      return;
    setBusy(true);
    try {
      await api.patch(`/bookings/owner/${selected.id}/status`, { status: next });
      toast.success("Booking updated");
      setSelected(null);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Update failed",
      );
    } finally {
      setBusy(false);
    }
  }
  const shownCourts = courts.filter((c) => !courtId || courtId === c.id);
  const filtered = bookings
    .filter((b) => (!courtId || b.court.id === courtId) && (!status || b.status === status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayRange = { startsAt: atHour(date, 0), endsAt: atHour(date, 24) };
  // Keep cancellation history in List; do not cover a replacement booking on the calendar.
  const daily = filtered.filter(
    (b) => overlaps(b, dayRange) && (status || b.status !== "CANCELLED"),
  );
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const days = calendarDays(date, view === "list" ? "day" : view);
  const calendarBookings = filtered.filter((b) => status || b.status !== "CANCELLED");
  const calendarBlocks = blocked.filter((b) => !courtId || b.courtId === courtId);
  const schedule = days.map((day) => ({
    day,
    bookings: calendarBookings.filter((b) => onCalendarDay(b, day)),
    blocks: calendarBlocks.filter((b) => onCalendarDay(b, day)),
  }));
  const agenda = schedule.filter(
    (s) =>
      view !== "month" ||
      (s.day.slice(0, 7) === date.slice(0, 7) && (s.bookings.length || s.blocks.length)),
  );
  const periodLabel =
    view === "month"
      ? calendarLabel(date, { month: "long", year: "numeric" })
      : view === "week"
        ? `${calendarLabel(days[0], { month: "short", day: "numeric", year: "numeric" })} – ${calendarLabel(days[6], { month: "short", day: "numeric", year: "numeric" })}`
        : calendarLabel(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  function shift(direction: number) {
    if (view !== "list") setDate(shiftPeriod(date, view, direction));
  }
  function openDay(day: string) {
    setDate(day);
    setView("day");
  }
  const bookingButton = (b: Booking, compact = false) => (
    <button
      key={b.id}
      onClick={() => setSelected(b)}
      className={`w-full rounded border p-2 text-left text-xs ${b.status === "CONFIRMED" ? "border-green-500 bg-green-500/10" : b.status === "CANCELLED" ? "border-muted text-muted-foreground line-through" : "border-amber-500 bg-amber-500/10"}`}
    >
      <strong>{b.status}</strong>
      <span className="block font-medium">{b.court.name}</span>
      <span className="block">
        {compact
          ? `${new Date(b.startsAt).toLocaleTimeString(undefined, { timeZone: "Asia/Yangon", hour: "numeric", minute: "2-digit" })} – ${new Date(b.endsAt).toLocaleTimeString(undefined, { timeZone: "Asia/Yangon", hour: "numeric", minute: "2-digit" })}`
          : formatBooking(b)}
      </span>
      {!compact && <span className="block truncate">{b.player.email}</span>}
    </button>
  );
  const blockSummary = (b: Block, compact = false) => (
    <p className="rounded border bg-muted p-2 text-xs break-words">
      Blocked · {courts.find((c) => c.id === b.courtId)?.name} ·{" "}
      {compact ? b.reason : `${formatBooking(b)} · ${b.reason}`}
    </p>
  );
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <h1 className="text-2xl font-bold">Booking Management</h1>
        <p className="text-sm text-muted-foreground">
          Myanmar time · Select a booking for details. Manage opening hours and blocked time in My
          Courts.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? "default" : "outline"}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </Button>
          ))}
          <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
            List / history
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setView("list");
              setStatus("PENDING");
            }}
          >
            Pending ({pending})
          </Button>
          <select
            aria-label="Filter court"
            className="rounded border bg-background p-2"
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
          >
            <option value="">All courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter status"
            className="rounded border bg-background p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["PENDING", "CONFIRMED", "CANCELLED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {view !== "list" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" aria-label={`Previous ${view}`} onClick={() => shift(-1)}>
              ←
            </Button>
            <Button variant="outline" onClick={() => setDate(courtDate())}>
              Today
            </Button>
            <Input
              aria-label="Schedule date"
              className="w-auto"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <Button variant="outline" aria-label={`Next ${view}`} onClick={() => shift(1)}>
              →
            </Button>
            <h2 className="font-semibold" aria-live="polite">
              {periodLabel}
            </h2>
          </div>
        )}
        {loading ? (
          <p role="status">Loading schedule…</p>
        ) : error ? (
          <p role="alert">
            {error} <Button onClick={load}>Retry</Button>
          </p>
        ) : view === "list" ? (
          <div className="space-y-3">
            {!filtered.length && <p>No bookings match these filters.</p>}
            {filtered.map((b) => (
              <div key={b.id} className="rounded-xl border p-4">
                <h2 className="font-semibold">{b.court.name}</h2>
                {bookingButton(b)}
              </div>
            ))}
          </div>
        ) : view === "week" || view === "month" ? (
          <>
            {!shownCourts.length ? (
              <p>No courts to display.</p>
            ) : (
              <>
                <div className="space-y-4 md:hidden" aria-label={`${view} agenda`}>
                  {agenda.map(({ day, bookings: dayBookings, blocks: dayBlocks }) => (
                    <section key={day} className="space-y-2 rounded-xl border p-3">
                      <Button
                        variant="ghost"
                        onClick={() => openDay(day)}
                        aria-label={`Open day ${day}`}
                      >
                        {calendarLabel(day, { weekday: "long", month: "short", day: "numeric" })}
                      </Button>
                      {dayBookings.map((b) => bookingButton(b))}
                      {dayBlocks.map((b, i) => (
                        <div key={i}>{blockSummary(b)}</div>
                      ))}
                      {!dayBookings.length && !dayBlocks.length && (
                        <p className="text-sm text-muted-foreground">
                          No bookings or blocked time.
                        </p>
                      )}
                    </section>
                  ))}
                  {!agenda.length && <p>No bookings or blocked time this month.</p>}
                </div>
                <div
                  className="hidden overflow-x-auto rounded-xl border md:block"
                  aria-label={`${view} calendar`}
                >
                  <div className="grid min-w-[980px] grid-cols-7">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div
                        key={day}
                        className="border-b bg-muted/50 p-3 text-center text-sm font-semibold"
                      >
                        {day}
                      </div>
                    ))}
                    {schedule.map(({ day, bookings: bookingsForDay, blocks: blocksForDay }) => {
                      const entries = [
                        ...bookingsForDay.map((booking) => ({
                          startsAt: booking.startsAt,
                          booking,
                          block: null,
                        })),
                        ...blocksForDay.map((block) => ({
                          startsAt: block.startsAt,
                          booking: null,
                          block,
                        })),
                      ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                      const visible = view === "month" ? entries.slice(0, 3) : entries;
                      return (
                        <section
                          key={day}
                          className={`min-w-0 space-y-2 border-b border-r p-2 ${view === "month" ? "min-h-44" : "min-h-64"} ${view === "month" && day.slice(0, 7) !== date.slice(0, 7) ? "bg-muted/40" : ""}`}
                        >
                          <button
                            onClick={() => openDay(day)}
                            aria-label={`Open day ${day}`}
                            aria-current={day === courtDate() ? "date" : undefined}
                            className={`rounded px-2 py-1 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${day === courtDate() ? "bg-primary text-primary-foreground" : ""}`}
                          >
                            {calendarLabel(day, { month: "short", day: "numeric" })}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {bookingsForDay.length} bookings · {blocksForDay.length} blocks
                          </p>
                          {visible.map((entry, i) =>
                            entry.booking ? (
                              bookingButton(entry.booking, view === "month")
                            ) : (
                              <div key={`block-${i}`}>
                                {entry.block && blockSummary(entry.block, view === "month")}
                              </div>
                            ),
                          )}
                          {entries.length > visible.length && (
                            <button
                              className="rounded p-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => openDay(day)}
                            >
                              +{entries.length - visible.length} more
                            </button>
                          )}
                          {!entries.length && (
                            <p className="text-xs text-muted-foreground">
                              No bookings or blocked time.
                            </p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {!daily.length && <p>No bookings on this date.</p>}
              {daily.map((b) => (
                <div key={b.id}>
                  <h2 className="font-semibold">{b.court.name}</h2>
                  {bookingButton(b)}
                </div>
              ))}
              {blocked
                .filter((b) => overlaps(b, dayRange) && (!courtId || courtId === b.courtId))
                .map((b, i) => (
                  <p key={i} className="rounded border p-3 text-sm">
                    Blocked · {courts.find((c) => c.id === b.courtId)?.name} · {formatBooking(b)} ·{" "}
                    {b.reason}
                  </p>
                ))}
            </div>
            {!shownCourts.length ? (
              <p>No courts to display.</p>
            ) : (
              <div className="hidden overflow-x-auto rounded-xl border md:block">
                <div style={{ minWidth: 100 + shownCourts.length * 220 }}>
                  <div
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: `100px repeat(${shownCourts.length}, minmax(220px, 1fr))`,
                    }}
                  >
                    <div className="p-3">Time</div>
                    {shownCourts.map((c) => (
                      <h2 key={c.id} className="border-l p-3 font-semibold">
                        {c.name}
                      </h2>
                    ))}
                  </div>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `100px repeat(${shownCourts.length}, minmax(220px, 1fr))`,
                    }}
                  >
                    <div>
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="h-16 border-b p-2 text-xs text-muted-foreground">
                          {hourLabel(h)}
                        </div>
                      ))}
                    </div>
                    {shownCourts.map((c) => (
                      <div key={c.id} className="relative border-l" style={{ height: 24 * 64 }}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <div
                            key={h}
                            className="absolute w-full border-b"
                            style={{ top: h * 64, height: 64 }}
                          />
                        ))}
                        {daily
                          .filter((b) => b.court.id === c.id)
                          .map((b) => {
                            const top = Math.max(
                              0,
                              (new Date(b.startsAt).getTime() -
                                new Date(dayRange.startsAt).getTime()) /
                                3_600_000,
                            );
                            const bottom = Math.min(
                              24,
                              (new Date(b.endsAt).getTime() -
                                new Date(dayRange.startsAt).getTime()) /
                                3_600_000,
                            );
                            return (
                              <div
                                key={b.id}
                                className="absolute inset-x-1 overflow-auto"
                                style={{
                                  top: top * 64,
                                  height: Math.max(32, (bottom - top) * 64 - 3),
                                }}
                              >
                                {bookingButton(b)}
                              </div>
                            );
                          })}
                        {blocked
                          .filter((b) => b.courtId === c.id && overlaps(b, dayRange))
                          .map((b, i) => (
                            <div
                              key={i}
                              className="absolute inset-x-1 overflow-auto rounded border bg-muted p-2 text-xs"
                              style={{
                                top:
                                  Math.max(
                                    0,
                                    (new Date(b.startsAt).getTime() -
                                      new Date(dayRange.startsAt).getTime()) /
                                      3_600_000,
                                  ) * 64,
                                height:
                                  ((Math.min(
                                    new Date(b.endsAt).getTime(),
                                    new Date(dayRange.endsAt).getTime(),
                                  ) -
                                    Math.max(
                                      new Date(b.startsAt).getTime(),
                                      new Date(dayRange.startsAt).getTime(),
                                    )) /
                                    3_600_000) *
                                    64 -
                                  3,
                              }}
                            >
                              Blocked · {b.reason}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open && !busy) setSelected(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Booking details</DialogTitle>
              <DialogDescription>Review the reservation and manage its status.</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-3">
                <h2 className="font-semibold">{selected.court.name}</h2>
                <p>{formatBooking(selected)} · Myanmar time</p>
                <p>Player: {selected.player.email}</p>
                <p>Team: {selected.team?.name || "Individual"}</p>
                <p>
                  {selected.status} · {formatPrice(selected.totalPrice)}
                </p>
                <div className="flex gap-2">
                  {selected.status === "PENDING" && (
                    <Button disabled={busy} onClick={() => update("CONFIRMED")}>
                      Confirm
                    </Button>
                  )}
                  {selected.status !== "CANCELLED" && (
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => update("CANCELLED")}
                    >
                      Cancel booking
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
