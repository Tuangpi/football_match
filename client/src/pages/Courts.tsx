import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { FadeIn } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourtCard, type CourtSummary } from "@/components/CourtCard";
import { EmptyState } from "@/components/EmptyState";
import { MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";

const SPORTS = [
  { value: "", label: "All sports" },
  { value: "FUTSAL", label: "Futsal (5v5)" },
  { value: "ELEVEN_A_SIDE", label: "11-a-side" },
];

export function Courts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city") ?? "";
  const sport = searchParams.get("sportType") ?? "";

  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [loading, setLoading] = useState(true);

  function setFilter(key: "city" | "sportType", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Replace so typing in the search box does not flood the history stack.
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function fetchCourts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (sport) params.set("sportType", sport);
      const res = await api.get(`/courts?${params.toString()}`);
      setCourts(res.data.courts);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load courts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, [city, sport]);

  const filtersActive = city !== "" || sport !== "";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              Futsal · 11-a-side · All cities
            </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Find a court near you
            </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              Browse every active court, filter by city or format, and choose your booking hours.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative z-10 -mt-6 rounded-2xl border border-border bg-card p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="City or area"
                value={city}
                onChange={(e) => setFilter("city", e.target.value)}
                aria-label="Filter courts by city"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => setFilter("city", "")}
                  aria-label="Clear city filter"
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={sport}
              onChange={(e) => setFilter("sportType", e.target.value)}
              aria-label="Filter by sport type"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button type="button" onClick={fetchCourts} className="rounded-full">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Available courts</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${courts.length} court${courts.length === 1 ? "" : "s"} found`}
              {!loading && city && <span> · {city}</span>}
              {!loading && sport && (
                <span> · {sport === "ELEVEN_A_SIDE" ? "11-a-side" : "Futsal"}</span>
              )}
            </p>
          </div>
          {filtersActive && !loading && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full rounded-none" />
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No courts found"
            description={
              filtersActive
                ? "Try a different city or sport, or clear the filters."
                : "No courts are listed yet. Check back soon."
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((court, i) => (
              <FadeIn key={court.id} delay={Math.min(i, 6) * 0.05}>
                <CourtCard court={court} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
