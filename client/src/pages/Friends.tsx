import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Check, CheckCheck, Clock, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

type Player = {
  id: string;
  email: string;
  playerProfile?: {
    fullName?: string | null;
    avatarUrl?: string | null;
    position?: string | null;
    skillLevel?: string | null;
  } | null;
};
type Friend = { id: string; sender: Player; receiver: Player };
type Request = { id: string; sender: Player };
type Section = "friends" | "requests" | "discover";
const nameOf = (player: Player) => player.playerProfile?.fullName || player.email.split("@")[0];
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

function PlayerDetails({ player }: { player: Player }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={nameOf(player)} src={player.playerProfile?.avatarUrl} size="lg" />
      <div className="min-w-0">
        <h3 className="truncate font-semibold" title={nameOf(player)}>
          {nameOf(player)}
        </h3>
        <p className="truncate text-sm text-muted-foreground" title={player.email}>
          {player.email}
        </p>
        {(player.playerProfile?.position || player.playerProfile?.skillLevel) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {player.playerProfile.position && (
              <Badge variant="secondary">{player.playerProfile.position}</Badge>
            )}
            {player.playerProfile.skillLevel && (
              <Badge variant="secondary">{player.playerProfile.skillLevel}</Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [section, setSection] = useState<Section>("friends");
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const busyRef = useRef(new Set<string>());
  const searchVersion = useRef(0);
  const discoverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const [f, p] = await Promise.all([
        api.get("/players/friends", { signal }),
        api.get("/players/friends/pending", { signal }),
      ]);
      if (signal?.aborted) return;
      setFriends(f.data.friends);
      setRequests(p.data.requests);
    } catch (error: unknown) {
      if (!signal?.aborted)
        setLoadError(errorMessage(error, "Unable to load your friends. Please try again."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      searchVersion.current += 1;
    };
  }, [load, user?.id]);

  function changeSection(next: Section) {
    setSection(next);
    if (next === "discover") window.setTimeout(() => discoverInput.current?.focus(), 0);
  }
  function changeQuery(value: string) {
    searchVersion.current += 1;
    setQuery(value);
    setResults([]);
    setSearchedQuery("");
    setSearchError("");
    setSearching(false);
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    const version = ++searchVersion.current;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSearchedQuery(q);
    try {
      const res = await api.get("/players/search", { params: { q } });
      if (version === searchVersion.current)
        setResults(res.data.users.filter((p: Player) => p.id !== user?.id));
    } catch (error: unknown) {
      if (version === searchVersion.current)
        setSearchError(errorMessage(error, "Search failed. Please try again."));
    } finally {
      if (version === searchVersion.current) setSearching(false);
    }
  }
  async function perform(key: string, work: () => Promise<void>) {
    if (busyRef.current.has(key)) return;
    busyRef.current.add(key);
    setBusy(new Set(busyRef.current));
    try {
      await work();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to update this request. Please try again."));
    } finally {
      busyRef.current.delete(key);
      setBusy(new Set(busyRef.current));
    }
  }
  function send(player: Player) {
    void perform(player.id, async () => {
      await api.post("/players/friends/request", { receiverId: player.id });
      setSent((previous) => new Set(previous).add(player.id));
      toast.success(`Friend request sent to ${nameOf(player)}`);
    });
  }
  function respond(request: Request, accept: boolean) {
    void perform(request.id, async () => {
      const res = await api.put(`/players/friends/${request.id}/respond`, { accept });
      setRequests((previous) => previous.filter((r) => r.id !== request.id));
      if (accept)
        setFriends((previous) =>
          previous.some((f) => f.id === res.data.friend.id)
            ? previous
            : [...previous, res.data.friend],
        );
      toast.success(
        accept ? `You and ${nameOf(request.sender)} are now friends` : "Friend request declined",
      );
    });
  }

  const players = friends
    .map((f) => (f.sender.id === user?.id ? f.receiver : f.sender))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const visible = players.filter((p) =>
    `${nameOf(p)} ${p.email}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const friendIds = new Set(players.map((p) => p.id));
  const incomingIds = new Set(requests.map((r) => r.sender.id));
  const tabs: { id: Section; title: string; count?: number; icon: typeof Users }[] = [
    { id: "friends", title: "My friends", count: friends.length, icon: Users },
    { id: "requests", title: "Requests", count: requests.length, icon: Clock },
    { id: "discover", title: "Find players", icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Your football community
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Find your people. Build your next match together.
            </p>
          </div>
          <Button onClick={() => changeSection("discover")} className="self-start">
            <UserPlus className="h-4 w-4" /> Find players
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Better football starts with good teammates</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Connect with players you know, respond to requests, and keep your football circle in
                one place.
              </p>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1"
          role="tablist"
          aria-label="Friends sections"
        >
          {tabs.map(({ id, title, count, icon: Icon }) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={section === id}
              aria-controls={`panel-${id}`}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 py-3 text-xs font-medium transition-colors sm:text-sm ${section === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => changeSection(id)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const index = tabs.findIndex((t) => t.id === id);
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                changeSection(tabs[next].id);
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              }}
              tabIndex={section === id ? 0 : -1}
            >
              <Icon className="hidden h-4 w-4 sm:block" />
              {title}
              {count !== undefined && !loading && !loadError && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            role="status"
            aria-label="Loading friends"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2].map((n) => (
              <Card key={n}>
                <CardContent className="flex gap-3 p-5">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="space-y-3 p-6" role="alert">
              <h2 className="font-semibold">Couldn’t load your community</h2>
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section
            role="tabpanel"
            id={`panel-${section}`}
            aria-labelledby={`tab-${section}`}
            className="space-y-4"
          >
            {section === "friends" && (
              <>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Your friends</h2>
                    <p className="text-sm text-muted-foreground">
                      {friends.length} {friends.length === 1 ? "player" : "players"} in your circle
                    </p>
                  </div>
                  <div className="relative sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Filter friends"
                      placeholder="Search your friends"
                      className="pl-9"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                </div>
                {!players.length ? (
                  <Card>
                    <EmptyState
                      icon={Users}
                      title="Your team starts here"
                      description="Find players you know and send your first friend request."
                      action={
                        <Button onClick={() => changeSection("discover")}>
                          <UserPlus className="h-4 w-4" /> Find players
                        </Button>
                      }
                    />
                  </Card>
                ) : !visible.length ? (
                  <Card>
                    <EmptyState
                      icon={Search}
                      title="No matching friends"
                      description="Try another name or email address."
                      action={
                        <Button variant="outline" onClick={() => setFilter("")}>
                          Clear search
                        </Button>
                      }
                    />
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((player) => (
                      <Card key={player.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="space-y-4 p-5">
                          <PlayerDetails player={player} />
                          <div className="flex items-center gap-1.5 border-t pt-3 text-xs font-medium text-primary">
                            <CheckCheck className="h-4 w-4" /> Friends
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {section === "requests" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Friend requests</h2>
                  <p className="text-sm text-muted-foreground">
                    Players who would like to connect with you.
                  </p>
                </div>
                {!requests.length ? (
                  <Card>
                    <EmptyState
                      icon={CheckCheck}
                      title="You’re all caught up"
                      description="New friend requests will appear here."
                    />
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {requests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="space-y-4 p-5">
                          <PlayerDetails player={request.sender} />
                          <div className="flex gap-2 border-t pt-4">
                            <Button
                              className="flex-1"
                              disabled={busy.has(request.id)}
                              onClick={() => respond(request, true)}
                              aria-label={`Accept request from ${nameOf(request.sender)}`}
                            >
                              {busy.has(request.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}{" "}
                              Accept
                            </Button>
                            <Button
                              className="flex-1"
                              variant="outline"
                              disabled={busy.has(request.id)}
                              onClick={() => respond(request, false)}
                              aria-label={`Decline request from ${nameOf(request.sender)}`}
                            >
                              <X className="h-4 w-4" /> Decline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {section === "discover" && (
              <>
                <Card>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div>
                      <h2 className="text-lg font-semibold">Find your next teammate</h2>
                      <p id="player-search-hint" className="mt-1 text-sm text-muted-foreground">
                        Search accounts by email address. Showing up to 10 matches.
                      </p>
                    </div>
                    <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={discoverInput}
                          aria-label="Search players by email"
                          aria-describedby="player-search-hint"
                          placeholder="Enter an email address"
                          value={query}
                          onChange={(e) => changeQuery(e.target.value)}
                          className="pl-9"
                          maxLength={254}
                        />
                      </div>
                      <Button type="submit" disabled={!query.trim() || searching}>
                        {searching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}{" "}
                        {searching ? "Searching…" : "Search"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                <div aria-live="polite">
                  {searchError ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm"
                    >
                      {searchError} Submit your search again to retry.
                    </div>
                  ) : searching ? (
                    <p role="status" className="py-6 text-center text-sm text-muted-foreground">
                      Searching players…
                    </p>
                  ) : !searchedQuery ? (
                    <EmptyState
                      icon={Search}
                      title="Good teammates are a search away"
                      description="Enter an email address above to find someone you know."
                    />
                  ) : !results.length ? (
                    <Card>
                      <EmptyState
                        icon={Search}
                        title="No players found"
                        description={`No accounts matched “${searchedQuery}”. Check the email and try again.`}
                      />
                    </Card>
                  ) : (
                    <>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {results.length} {results.length === 1 ? "match" : "matches"} for “
                        {searchedQuery}”
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {results.map((player) => (
                          <Card key={player.id}>
                            <CardContent className="space-y-4 p-5">
                              <PlayerDetails player={player} />
                              <div className="border-t pt-4">
                                {friendIds.has(player.id) ? (
                                  <Button variant="secondary" className="w-full" disabled>
                                    <CheckCheck className="h-4 w-4" /> Already friends
                                  </Button>
                                ) : incomingIds.has(player.id) ? (
                                  <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => changeSection("requests")}
                                  >
                                    <Clock className="h-4 w-4" /> Respond to request
                                  </Button>
                                ) : sent.has(player.id) ? (
                                  <Button variant="secondary" className="w-full" disabled>
                                    <Check className="h-4 w-4" /> Request sent
                                  </Button>
                                ) : (
                                  <Button
                                    className="w-full"
                                    disabled={busy.has(player.id)}
                                    onClick={() => send(player)}
                                    aria-label={`Add ${nameOf(player)} as a friend`}
                                  >
                                    {busy.has(player.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <UserPlus className="h-4 w-4" />
                                    )}{" "}
                                    Add friend
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
