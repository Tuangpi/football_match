import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  atHour,
  courtDate,
  hourLabel,
  overlaps,
  type OpeningDay,
  type TimeRange,
} from "@/lib/bookingTime";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function FlexibleBooking({
  courtId,
  price,
  canBook,
  teamId,
}: {
  courtId: string;
  price: number;
  canBook: boolean;
  teamId: string;
}) {
  const [date, setDate] = useState(courtDate());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [availability, setAvailability] = useState<{
    openingHours: OpeningDay[];
    busy: TimeRange[];
    isActive: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setStart("");
      setEnd("");
      api
        .get(`/courts/${courtId}/availability`, { params: { date } })
        .then((res) => {
          if (active) setAvailability(res.data);
        })
        .catch(() => {
          if (active) setError("Unable to load availability. Please retry.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [courtId, date, refresh]);
  const day = availability?.openingHours.find(
    (d) => d.day === new Date(`${date}T12:00:00+06:30`).getUTCDay(),
  );
  function free(from: number, to: number) {
    const range = { startsAt: atHour(date, from), endsAt: atHour(date, to) };
    return (
      new Date(range.startsAt) > new Date() && !availability?.busy.some((b) => overlaps(range, b))
    );
  }
  const hours =
    day && !day.closed && availability?.isActive
      ? Array.from({ length: day.close - day.open }, (_, i) => day.open + i)
      : [];
  const ends =
    start !== "" && day
      ? Array.from({ length: day.close - Number(start) }, (_, i) => Number(start) + i + 1).filter(
          (h) => free(Number(start), h),
        )
      : [];
  const total = (Number(end) - Number(start)) * price;
  async function submit() {
    if (start === "" || end === "" || booking) return;
    if (
      !window.confirm(
        `Request ${hourLabel(Number(start))}–${hourLabel(Number(end))} on ${date} for ${formatPrice(total)}?`,
      )
    )
      return;
    setBooking(true);
    try {
      await api.post("/bookings", {
        courtId,
        startsAt: atHour(date, Number(start)),
        endsAt: atHour(date, Number(end)),
        teamId: teamId || undefined,
      });
      toast.success("Booking requested. Pending owner confirmation.");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Booking failed",
      );
    } finally {
      setBooking(false);
      setRefresh((v) => v + 1);
    }
  }
  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="text-xl font-bold">Choose your booking time</h2>
      <p className="text-sm text-muted-foreground">
        All times are Myanmar time (Asia/Yangon). Whole hours only, minimum one hour.
      </p>
      <label className="block text-sm">
        Date
        <Input
          aria-label="Booking date"
          type="date"
          min={courtDate()}
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      {loading ? (
        <p role="status">Loading availability…</p>
      ) : error ? (
        <div role="alert">
          {error}{" "}
          <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
            Retry
          </Button>
        </div>
      ) : !hours.length ? (
        <p>This court is closed on this date.</p>
      ) : (
        <>
          <p className="text-sm">
            Opening hours: {hourLabel(day!.open)}–{hourLabel(day!.close)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              Start time
              <select
                aria-label="Start time"
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setEnd("");
                }}
              >
                <option value="">Choose start</option>
                {hours.map((h) => (
                  <option key={h} value={h} disabled={!free(h, h + 1)}>
                    {hourLabel(h)}
                    {!free(h, h + 1) ? " — unavailable" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              End time
              <select
                aria-label="End time"
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={end}
                disabled={start === ""}
                onChange={(e) => setEnd(e.target.value)}
              >
                <option value="">Choose end</option>
                {ends.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {start !== "" && end !== "" && (
            <p className="font-medium">
              {Number(end) - Number(start)} hour(s) · Total: {formatPrice(total)}
            </p>
          )}
          {canBook ? (
            <Button disabled={start === "" || end === "" || booking} onClick={submit}>
              {booking ? "Requesting…" : "Request booking"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in as a player to request a booking.
            </p>
          )}
        </>
      )}
    </section>
  );
}
