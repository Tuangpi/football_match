import { getLocale, t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { atHour, courtDate, formatBooking, hourLabel, type OpeningDay, type TimeRange } from "@/lib/bookingTime";
import { formatPrice } from "@/lib/currency";
import { calendarDays, calendarLabel, onCalendarDay, shiftPeriod, type CalendarView } from "@/lib/bookingCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/Autocomplete";
import { occupancyPercent } from "@/lib/occupancy";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type Booking = TimeRange & {
  id: string;
  status: string;
  totalPrice: number;
  court: { id: string; name: string };
  player: { id: string; email: string };
  team: { id: string; name: string } | null;
};
type Court = { id: string; name: string; openingHours?: OpeningDay[] };
type Block = TimeRange & { courtId: string; reason: string };

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_PX = 56;
const COURT_COLORS = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];

function courtColor(courtId: string, courts: Court[]) {
  const idx = Math.max(0, courts.findIndex((c) => c.id === courtId));
  return COURT_COLORS[idx % COURT_COLORS.length];
}
function statusStyle(s: string) {
  if (s === "CONFIRMED") return "border-green-500 bg-green-500/10 hover:bg-green-500/20";
  if (s === "CANCELLED") return "border-muted text-muted-foreground line-through";
  return "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20";
}
function toMs(v: string) { return new Date(v).getTime(); }
function yFor(ms: number, dayStartMs: number) {
  return ((ms - dayStartMs) / 3600000 - START_HOUR) * HOUR_PX;
}

function layoutDay(items: Booking[]) {
  const sorted = [...items].sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));
  const cols: Booking[][] = [];
  const placed = new Map<string, number>();
  for (const b of sorted) {
    let idx = cols.findIndex((col) => toMs(col[col.length - 1].endsAt) <= toMs(b.startsAt));
    if (idx < 0) { idx = cols.length; cols.push([]); }
    cols[idx].push(b);
    placed.set(b.id, idx);
  }
  return { cols: Math.max(1, cols.length), placed };
}
function timeChip(b: Booking) {
  const o = { timeZone: "Asia/Yangon", hour: "numeric", minute: "2-digit" } as const;
  return `${new Date(b.startsAt).toLocaleTimeString(getLocale(), o)} - ${new Date(b.endsAt).toLocaleTimeString(getLocale(), o)}`;
}
function TimeGrid({ day, items, dayBlocks, courts, nowMs, onSelect }: {
  day: string;
  items: Booking[];
  dayBlocks: Block[];
  courts: Court[];
  nowMs: number;
  onSelect: (b: Booking) => void;
}) {
  const dayStartMs = toMs(atHour(day, 0));
  const gridH = (END_HOUR - START_HOUR) * HOUR_PX;
  const lay = layoutDay(items);
  const nowY = yFor(nowMs, dayStartMs);
  const showNow = day === courtDate() && nowY >= 0 && nowY <= gridH;
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <div className="flex min-w-[320px]">
        <div className="w-14 shrink-0">
          <div className="h-9 border-b" />
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
            <div key={START_HOUR + i} className="border-b pr-1 text-right text-[11px] text-muted-foreground" style={{ height: HOUR_PX }}>
              <span className="block -translate-y-2">{hourLabel(START_HOUR + i)}</span>
            </div>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="h-9 border-b border-l px-2 text-xs font-medium text-muted-foreground">
            {calendarLabel(day, { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <div className="relative border-l" style={{ height: gridH }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div key={START_HOUR + i} className="border-b" style={{ height: HOUR_PX }} />
            ))}
            {dayBlocks.map((b: Block, i: number) => {
              const top = Math.max(0, yFor(toMs(b.startsAt), dayStartMs));
              const bottom = Math.min(gridH, yFor(toMs(b.endsAt), dayStartMs));
              if (bottom <= 0 || top >= gridH) return null;
              return <div key={i} className="absolute inset-x-1 overflow-hidden rounded border border-dashed bg-muted/70 p-1 text-[11px]" style={{ top, height: Math.max(18, bottom - top - 2) }}>{t("Blocked")} - {b.reason}</div>;
            })}
            {items.map((b) => {
              const top = Math.max(0, yFor(toMs(b.startsAt), dayStartMs));
              const bottom = Math.min(gridH, yFor(toMs(b.endsAt), dayStartMs));
              if (bottom <= 0 || top >= gridH) return null;
              const col = lay.placed.get(b.id) ?? 0;
              return (
                <button key={b.id} onClick={() => onSelect(b)} className={`absolute overflow-hidden rounded-lg border-l-4 border-y border-r p-1.5 text-left text-[11px] leading-tight hover:shadow-md ${statusStyle(b.status)}`} style={{ top, height: Math.max(22, bottom - top - 3), left: `calc(${(col * 100) / lay.cols}% + 2px)`, width: `calc(${100 / lay.cols}% - 4px)` }}>
                  <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${courtColor(b.court.id, courts)}`} /><strong className="truncate">{timeChip(b)}</strong></span>
                  <span className="block truncate font-medium">{b.court.name}</span>
                  <span className="block truncate text-muted-foreground">{b.player.email}</span>
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

export function OwnerBookings() {
  useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [blocked, setBlocked] = useState<Block[]>([]);
  const [date, setDate] = useState(courtDate());
  const [courtId, setCourtId] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<CalendarView | "list">("day");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
    if (!selected) return;
    const ok = next !== "CANCELLED" || window.confirm(t("Cancel this booking?"));
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/bookings/owner/${selected.id}/status`, { status: next });
      setBookings((prev) => prev.map((b) => (b.id === selected.id ? data.booking : b)));
      setSelected(data.booking);
      toast.success(t(next === "CONFIRMED" ? "Booking confirmed." : "Booking cancelled."));
    } catch {
      toast.error(t("Unable to update the booking."));
    } finally {
      setBusy(false);
    }
  }

  const days = calendarDays(date, view === "list" ? "day" : view);
  const q = query.trim().toLowerCase();
  const filtered = bookings
    .filter((b) => (!courtId || b.court.id === courtId) && (!status || b.status === status) && (!q || b.player.email.toLowerCase().includes(q) || (b.team?.name || "").toLowerCase().includes(q)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  // Cancelled bookings stay in List history; they must not cover a replacement slot on the calendar.
  const scheduled = status === "CANCELLED" ? filtered : filtered.filter((b) => b.status !== "CANCELLED");
  const daily = scheduled.filter((b) => onCalendarDay(b, date));
  const dayBlocks = blocked.filter((b) => onCalendarDay(b, date) && (!courtId || b.courtId === courtId));

  const searchSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      set.add(b.player.email);
      if (b.team?.name) set.add(b.team.name);
    }
    return [...set];
  }, [bookings]);
  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchSuggestions.filter((s) => s.toLowerCase().includes(q));
  }, [searchSuggestions, query]);

  const agenda = days.map((day) => ({
    day,
    bookings: scheduled.filter((b) => onCalendarDay(b, day)),
    blocks: blocked.filter((b) => onCalendarDay(b, day) && (!courtId || b.courtId === courtId)),
  }));
  const monthDaysList = calendarDays(date, "month");
  const schedule = view === "month" ? monthDaysList.map((day) => ({
    day,
    bookings: scheduled.filter((b) => onCalendarDay(b, day)),
    blocks: blocked.filter((b) => onCalendarDay(b, day) && (!courtId || b.courtId === courtId)),
  })) : agenda;
  const pendingList = bookings.filter((b) => b.status === "PENDING").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayStr = courtDate();
  const todayCount = bookings.filter((b) => b.status === "CONFIRMED" && onCalendarDay(b, todayStr)).length;
  const occupancy = occupancyPercent(bookings, courts, todayStr);
  const periodLabel = view === "month"
    ? calendarLabel(date, { month: "long", year: "numeric" })
    : view === "week"
      ? `${calendarLabel(days[0], { month: "short", day: "numeric" })} - ${calendarLabel(days[days.length - 1], { month: "short", day: "numeric", year: "numeric" })}`
      : calendarLabel(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  function shift(d: number) { if (view !== "list") setDate(shiftPeriod(date, view, d)); }
  function openDay(day: string) { setDate(day); setView("day"); }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") { if (!busy) setSelected(null); return; }
      if (view === "list") return;
      if (e.key === "ArrowLeft") setDate(shiftPeriod(date, view, -1));
      else if (e.key === "ArrowRight") setDate(shiftPeriod(date, view, 1));
      else if (e.key === "t" || e.key === "T") setDate(courtDate());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, date, busy]);
  const bookingCard = (b: Booking) => (
    <button key={b.id} onClick={() => setSelected(b)} className={`w-full rounded-lg border-l-4 border-y border-r p-2 text-left text-xs hover:shadow-sm ${statusStyle(b.status)}`}>
      <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${courtColor(b.court.id, courts)}`} /><strong className="truncate">{timeChip(b)}</strong></span>
      <span className="mt-0.5 block truncate font-medium">{b.court.name}</span>
      <span className="block text-muted-foreground">{t(b.status)} - {formatPrice(b.totalPrice)}</span>
      <span className="block truncate">{b.player.email}</span>
    </button>
  );
  const blockSummary = (b: Block) => (
    <p className="rounded-lg border border-dashed bg-muted/60 p-2 text-xs break-words">{t("Blocked ·")} {courts.find((c) => c.id === b.courtId)?.name} · {formatBooking(b)} · {b.reason}</p>
  );
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("Booking Management")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("Myanmar time - select a booking for details.")}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={() => { setView("list"); setStatus("PENDING"); }} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-left hover:bg-amber-500/20">
              <div className="text-xs text-muted-foreground">{t("Pending")}</div>
              <div className="font-semibold text-amber-600">{pendingList.length}</div>
            </button>
            <div className="rounded-xl border px-4 py-2"><div className="text-xs text-muted-foreground">{t("Confirmed today")}</div><div className="font-semibold text-green-600">{todayCount}</div></div>
            <div className="rounded-xl border px-4 py-2"><div className="text-xs text-muted-foreground">{t("Occupancy")}</div><div className="font-semibold">{occupancy}%</div></div>
          </div>
        </div>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-background/95 py-2">
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <Autocomplete
              value={query}
              onChange={setQuery}
              items={filteredSuggestions}
              itemToLabel={(s: string) => s}
              itemToValue={(s: string) => s}
              onSelect={(s: string) => setQuery(s)}
              ariaLabel={t("Search player email or team")}
              placeholder={t("Search player email or team")}
            />
          </div>
          <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="rounded-md border bg-background p-2">
            <option value="">{t("Courts: All")}</option>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border bg-background p-2">
            <option value="">{t("Status: All")}</option>
            <option value="PENDING">{t("PENDING")}</option>
            <option value="CONFIRMED">{t("CONFIRMED")}</option>
            <option value="CANCELLED">{t("CANCELLED")}</option>
          </select>
          <div className="ml-auto flex gap-1 rounded-lg border p-1">
            {(["day", "week", "month", "list"] as const).map((m) => (
              <Button key={m} size="sm" variant={view === m ? "default" : "ghost"} onClick={() => setView(m)}>{m === "list" ? t("List") : t(m[0].toUpperCase() + m.slice(1))}</Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label={t("Previous")}>‹</Button>
          <Button variant="outline" size="sm" onClick={() => setDate(courtDate())}>{t("Today")}</Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label={t("Next")}>›</Button>
          <strong className="text-sm">{periodLabel}</strong>
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" aria-label={t("Choose date")} />
        </div>
        {loading ? (
          <p role="status">{t("Loading schedule…")}</p>
        ) : error ? (
          <p role="alert">{t(error)} <Button onClick={() => void load()}>{t("Retry")}</Button></p>
        ) : view === "day" ? (
          daily.length || dayBlocks.length ? (
            <TimeGrid day={date} items={daily} dayBlocks={dayBlocks} courts={courts} nowMs={nowTick} onSelect={setSelected} />
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">{t("No bookings for this day.")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("Check pending requests or manage hours in My Courts.")}</p>
            </div>
          )
        ) : view === "list" ? (
          <div className="space-y-2">
            {!filtered.length && <p>{t("No bookings found.")}</p>}
            {filtered.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.court.name} · {timeChip(b)}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.player.email}{b.team ? ` · ${b.team.name}` : ""} · {t(b.status)} · {formatPrice(b.totalPrice)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelected(b)}>{t("Details")}</Button>
              </div>
            ))}
          </div>
        ) : view === "week" ? (
          <>
            <div className="hidden gap-2 lg:grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
              {schedule.map(({ day, bookings: db }) => (
                <div key={day} className={`space-y-1 rounded-xl border p-2 ${day === courtDate() ? "border-primary" : ""}`}>
                  <button onClick={() => openDay(day)} className="w-full rounded p-1 text-center text-xs font-semibold hover:bg-muted">
                    {calendarLabel(day, { weekday: "short", month: "numeric", day: "numeric" })}
                  </button>
                  {db.slice(0, 6).map((b) => (
                    <button key={b.id} onClick={() => setSelected(b)} className={`w-full truncate rounded border-l-4 p-1 text-left text-[11px] ${statusStyle(b.status)}`}>
                      {timeChip(b)} · {b.court.name}
                    </button>
                  ))}
                  {db.length > 6 && <button onClick={() => openDay(day)} className="text-[11px] text-primary hover:underline">+{db.length - 6} {t("more")}</button>}
                  {!db.length && <p className="text-center text-[11px] text-muted-foreground">–</p>}
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:hidden">
              {schedule.map(({ day, bookings: db, blocks: bl }) => (
                <section key={day} className="space-y-2 rounded-xl border p-3">
                  <Button variant="ghost" size="sm" onClick={() => openDay(day)}>{calendarLabel(day, { weekday: "long", month: "short", day: "numeric" })}</Button>
                  <TimeGrid day={day} items={db} dayBlocks={bl} courts={courts} nowMs={nowTick} onSelect={setSelected} />
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border lg:block">
              <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="p-2">{t(d)}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {schedule.map(({ day, bookings: db }) => {
                  const inMonth = day.slice(0, 7) === date.slice(0, 7);
                  const pend = db.filter((b) => b.status === "PENDING").length;
                  return (
                    <button key={day} onClick={() => openDay(day)} className={`min-h-24 border-b border-r p-1 text-left align-top hover:bg-muted/40 ${inMonth ? "" : "bg-muted/20 text-muted-foreground"} ${day === courtDate() ? "ring-1 ring-inset ring-primary" : ""}`}>
                      <span className="text-xs font-semibold">{Number(day.slice(8, 10))}{pend > 0 && <span className="ml-1 rounded-full bg-amber-500/20 px-1 text-[10px] text-amber-700">•{pend}</span>}</span>
                      <span className="mt-1 block space-y-0.5">
                        {db.slice(0, 3).map((b) => (
                          <span key={b.id} className={`block truncate rounded px-1 text-[10px] ${b.status === "CONFIRMED" ? "bg-green-500/15" : b.status === "CANCELLED" ? "bg-muted" : "bg-amber-500/15"}`}>
                            {timeChip(b)} {b.court.name}
                          </span>
                        ))}
                        {db.length > 3 && <span className="block text-[10px] text-primary">+{db.length - 3} {t("more")}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 lg:hidden">
              {agenda.map(({ day: d, bookings: db, blocks: bl }) => (
                <section key={d} className="space-y-2 rounded-xl border p-3">
                  <Button variant="ghost" size="sm" onClick={() => openDay(d)}>{calendarLabel(d, { weekday: "long", month: "short", day: "numeric" })}</Button>
                  {db.slice(0, 5).map((b) => <div key={b.id}>{bookingCard(b)}</div>)}
                  {bl.slice(0, 2).map((b, i) => <div key={`bl-${i}`}>{blockSummary(b)}</div>)}
                  {!db.length && !bl.length && <p className="text-sm text-muted-foreground">{t("No bookings or blocked time.")}</p>}
                </section>
              ))}
              {!agenda.length && <p>{t("No bookings or blocked time this month.")}</p>}
            </div>
          </>
        )}
        <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !busy) setSelected(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("Booking details")}</DialogTitle>
              <DialogDescription>{selected ? `${selected.court.name} · ${formatBooking({ startsAt: selected.startsAt, endsAt: selected.endsAt })}` : ""}</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-2 text-sm">
                <p><strong>{t("Status")}:</strong> {t(selected.status)}</p>
                <p><strong>{t("Player")}:</strong> {selected.player.email}</p>
                {selected.team && <p><strong>{t("Team")}:</strong> {selected.team.name}</p>}
                <p><strong>{t("Total")}:</strong> {formatPrice(selected.totalPrice)}</p>
                <div className="flex gap-2 pt-2">
                  {selected.status === "PENDING" && <Button disabled={busy} onClick={() => void update("CONFIRMED")}>{t("Confirm")}</Button>}
                  {selected.status !== "CANCELLED" && <Button variant="destructive" disabled={busy} onClick={() => void update("CANCELLED")}>{t("Cancel booking")}</Button>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {pendingList.length > 0 && view !== "list" && (
          <div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-amber-500/40 bg-background/95 p-3 shadow-lg backdrop-blur">
            <p className="text-sm"><strong className="text-amber-600">{pendingList.length}</strong> {t("pending requests need review.")}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => { setView("list"); setStatus("PENDING"); }}>{t("Review pending")}</Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(pendingList[0])}>{t("Open oldest")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}