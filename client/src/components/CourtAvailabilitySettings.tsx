import { message } from '../lib/language';
import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  atHour,
  courtDate,
  defaultHours,
  formatBooking,
  hourLabel,
  weekdays,
  type OpeningDay,
  type TimeRange,
} from "@/lib/bookingTime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Block = TimeRange & { id: string; reason: string };
export function CourtAvailabilitySettings({
  courtId,
  initialHours,
  onChanged,
}: {
  courtId: string;
  initialHours: OpeningDay[];
  onChanged: () => void;
}) {
  useLanguage();
  const [hours, setHours] = useState(initialHours || defaultHours);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [date, setDate] = useState(courtDate());
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(9);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function loadBlocks() {
    try {
      setBlocks((await api.get(`/courts/${courtId}/blocks`)).data.blocks);
      setError("");
    } catch {
      setError("Unable to load blocked periods.");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void loadBlocks(), 0);
    return () => window.clearTimeout(timer);
  }, [courtId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await work();
      toast.success(t(message));
      await loadBlocks();
      onChanged();
    } catch (err: unknown) {
      toast.error(t(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Update failed",
      ));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      <h4 className="font-semibold">{t("Opening hours · Myanmar time")}</h4>
      <p className="text-sm text-muted-foreground"> {t("Players choose whole-hour start/end times. No slots to create. Changes apply to new requests; existing bookings stay unchanged.")} </p>
      {hours.map((d, index) => (
        <div key={d.day} className="flex flex-wrap items-center gap-3 text-sm">
          <span className="w-24">{t(weekdays[d.day])}</span>
          <label>
            <input
              type="checkbox"
              checked={d.closed}
              onChange={(e) =>
                setHours(
                  hours.map((v, i) => (i === index ? { ...v, closed: e.target.checked } : v)),
                )
              }
            />{" "} {t("Closed")} </label>
          {(["open", "close"] as const).map((field) => (
            <label key={field} className="flex items-center gap-1">
              <span>{field === "open" ? t("From") : t("To")}</span>
              <select
                aria-label={`${t(weekdays[d.day])} ${t(field)}`}
                className="rounded border bg-background p-1"
                disabled={d.closed}
                value={d[field]}
                onChange={(e) =>
                  setHours(
                    hours.map((v, i) =>
                      i === index ? { ...v, [field]: Number(e.target.value) } : v,
                    ),
                  )
                }
              >
                {Array.from({ length: 24 }, (_, h) => (field === "close" ? h + 1 : h)).map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ))}
      <Button
        size="sm"
        disabled={busy || hours.some((h) => !h.closed && h.close <= h.open)}
        onClick={() =>
          action(
            () => api.put(`/courts/${courtId}`, { openingHours: hours }),
            "Opening hours saved",
          )
        }
      > {t("Save opening hours")} </Button>
      <h4 className="font-semibold">{t("Blocked time")}</h4>
      {error && (
        <p role="alert">
          {t(error)}{" "}
          <Button variant="outline" size="sm" onClick={loadBlocks}> {t("Retry")} </Button>
        </p>
      )}
      {blocks.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">{t("No upcoming blocked periods.")}</p>
      )}
      {blocks.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            {formatBooking(b)} — {b.reason}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("Remove this blocked period?")))
                void action(
                  () => api.delete(`/courts/${courtId}/blocks/${b.id}`),
                  "Blocked time removed",
                );
            }}
          > {t("Remove")} </Button>
        </div>
      ))}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await api.post(`/courts/${courtId}/blocks`, {
              startsAt: atHour(date, start),
              endsAt: atHour(date, end),
              reason,
            });
            setReason("");
          }, "Time blocked");
        }}
      >
        <label className="text-sm"> {t("Date")} <Input
            type="date"
            required
            min={courtDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-sm"> {t("Reason")} <Input
            required
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {(["Start", "End"] as const).map((name) => (
          <label key={name} className="text-sm">
            {t(name)}
            <select
              aria-label={message("Block {field}", { field: t(name.toLowerCase()) })}
              className="block w-full rounded border bg-background p-2"
              value={name === "Start" ? start : end}
              onChange={(e) =>
                name === "Start" ? setStart(Number(e.target.value)) : setEnd(Number(e.target.value))
              }
            >
              {Array.from({ length: 24 }, (_, h) => (name === "End" ? h + 1 : h)).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button size="sm" disabled={busy || end <= start || !reason.trim()}> {t("Block time")} </Button>
      </form>
    </div>
  );
}
