import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Loader2, Search, UserPlus, Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';

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

  const inputClass = 'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none text-sm';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Friends</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-600" /> Add Friends
              </h3>
              <form onSubmit={onSearch} className="flex gap-2 mb-4">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by email..."
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-orange-700 flex items-center gap-2"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </form>
              {results.map((u) => (
                <div key={u.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{displayName(u)}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => sendRequest(u.id)}
                    disabled={busyId === u.id}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs font-medium disabled:opacity-50 hover:bg-orange-700"
                  >
                    {busyId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" /> My Friends ({friends.length})
              </h3>
              {friends.length === 0 ? (
                <p className="text-gray-500 text-sm">No friends yet. Search above to add some!</p>
              ) : (
                friends.map((f) => {
                  const other = f.sender.id === user.id ? f.receiver : f.sender;
                  return (
                    <div key={f.id} className="py-2 border-b border-gray-100 last:border-0">
                      <p className="text-sm font-medium">{displayName(other)}</p>
                      <p className="text-xs text-gray-500">{other.email}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm self-start">
            <h3 className="font-bold text-lg mb-3">Pending Requests ({pending.length})</h3>
            {pending.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending requests.</p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{displayName(r.sender)}</p>
                    <p className="text-xs text-gray-500">{r.sender.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(r.id, true)}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium disabled:opacity-50 hover:bg-green-700 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => respond(r.id, false)}
                      disabled={busyId === r.id}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs font-medium disabled:opacity-50 hover:bg-gray-300 flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
