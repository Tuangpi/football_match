import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Loader2, Search, UserPlus, Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';

type UserLite = {
  id: string;
  email: string;
  role: string;
  playerProfile?: { fullName: string | null } | null;
};

type FriendRow = {
  id: string;
  sender: UserLite;
  receiver: UserLite;
};

type PendingRow = {
  id: string;
  sender: UserLite;
};

function displayName(u: UserLite) {
  return u.playerProfile?.fullName || u.email;
}

export function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      const [f, p] = await Promise.all([
        api.get('/players/friends'),
        api.get('/players/friends/pending'),
      ]);
      setFriends(f.data.friends);
      setPending(p.data.requests);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) refresh();
  }, [user]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.get('/players/search', { params: { q } });
      setResults(res.data.users);
      if (res.data.users.length === 0) toast('No users found');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(receiverId: string) {
    setBusyId(receiverId);
    try {
      await api.post('/players/friends/request', { receiverId });
      toast.success('Friend request sent');
      setResults((r) => r.filter((u) => u.id !== receiverId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setBusyId(null);
    }
  }

  async function respond(requestId: string, accept: boolean) {
    setBusyId(requestId);
    try {
      await api.put(`/players/friends/${requestId}/respond`, { accept });
      toast.success(accept ? 'Friend request accepted' : 'Request declined');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return <div className="p-8 text-center">Access denied. Login required.</div>;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Friends</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> Add Friends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSearch} className="flex gap-2 mb-4">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by email..."
                  />
                  <Button
                    type="submit"
                    disabled={searching}
                    size="sm"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </form>
                {results.map((u) => (
                  <div key={u.id} className="flex justify-between items-center py-2 border-b border-border/60 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{displayName(u)}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      onClick={() => sendRequest(u.id)}
                      disabled={busyId === u.id}
                      size="sm"
                    >
                      {busyId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> My Friends ({friends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No friends yet"
                    description="Search for players by email above to add some!"
                    className="py-8"
                  />
                ) : (
                  friends.map((f) => {
                    const other = f.sender.id === user.id ? f.receiver : f.sender;
                    return (
                      <div key={f.id} className="py-2 border-b border-border/60 last:border-0">
                        <p className="text-sm font-medium">{displayName(other)}</p>
                        <p className="text-xs text-muted-foreground">{other.email}</p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="self-start">
            <CardHeader>
              <CardTitle className="text-lg">Pending Requests ({pending.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending requests.</p>
              ) : (
                pending.map((r) => (
                  <div key={r.id} className="flex justify-between items-center py-2 border-b border-border/60 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{displayName(r.sender)}</p>
                      <p className="text-xs text-muted-foreground">{r.sender.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => respond(r.id, true)}
                        disabled={busyId === r.id}
                        size="sm"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button
                        onClick={() => respond(r.id, false)}
                        disabled={busyId === r.id}
                        variant="secondary"
                        size="sm"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
