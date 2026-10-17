import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Loader2, Trophy, UserPlus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type TeamMember = {
  id: string;
  role: string;
  user: { id: string; email: string };
};

type Team = {
  id: string;
  name: string;
  sportType: 'FUTSAL' | 'ELEVEN_A_SIDE';
  captainId: string;
  captain: { id: string; email: string };
  members: TeamMember[];
  _count?: { members: number };
};

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

export function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'FUTSAL' | 'ELEVEN_A_SIDE'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', sportType: 'FUTSAL' },
  });

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  async function refresh() {
    try {
      const params = filter === 'ALL' ? {} : { sportType: filter };
      const res = await api.get('/teams', { params });
      setTeams(res.data.teams);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  const onCreate = async (data: CreateTeamFormData) => {
    try {
      await api.post('/teams', { name: data.name, sportType: data.sportType });
      toast.success('Team created!');
      reset();
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    }
  };

  async function join(teamId: string) {
    setBusyId(teamId);
    try {
      await api.post(`/teams/${teamId}/join`);
      toast.success('Joined the team');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join team');
    } finally {
      setBusyId(null);
    }
  }

  async function leave(teamId: string) {
    setBusyId(teamId);
    try {
      await api.delete(`/teams/${teamId}/leave`);
      toast.success('Left the team');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave team');
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-600" /> Create a Team
              </h3>
              <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                  <input {...register('name')} placeholder="e.g. Sunset Strikers" className={inputClass} />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                  <select {...register('sportType')} className={inputClass}>
                    <option value="FUTSAL">Futsal (5 vs 5)</option>
                    <option value="ELEVEN_A_SIDE">11-a-side</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Team'}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-3">You become the captain and are added as a member automatically.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm self-start">
              <h3 className="font-bold text-lg mb-3">Filter</h3>
              <div className="flex gap-2">
                {(['ALL', 'FUTSAL', 'ELEVEN_A_SIDE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      filter === f ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All' : f === 'FUTSAL' ? 'Futsal' : '11-a-side'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-600" /> All Teams ({teams.length})
            </h3>
            {teams.length === 0 ? (
              <p className="text-gray-500 text-sm">No teams yet. Create the first one!</p>
            ) : (
              teams.map((t) => {
                const isMember = t.members.some((m) => m.user.id === user.id);
                const isCaptain = t.captainId === user.id;
                return (
                  <div key={t.id} className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{t.name}</p>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            {t.sportType === 'ELEVEN_A_SIDE' ? '11-a-side' : 'Futsal'}
                          </span>
                          {isMember && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                              {isCaptain ? 'Captain' : 'Member'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Captain: {t.captain.email} · {t._count?.members ?? t.members.length} member(s)
                        </p>
                      </div>
                      {isMember ? (
                        isCaptain ? (
                          <span className="text-xs text-gray-400">Captains can't leave</span>
                        ) : (
                          <button
                            onClick={() => leave(t.id)}
                            disabled={busyId === t.id}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium disabled:opacity-50 hover:bg-gray-200 flex items-center gap-1"
                          >
                            {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Leave
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => join(t.id)}
                          disabled={busyId === t.id}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs font-medium disabled:opacity-50 hover:bg-orange-700 flex items-center gap-1"
                        >
                          {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Join
                        </button>
                      )}
                    </div>
                    {t.members.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Members:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.members.map((m) => (
                            <span key={m.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {m.user.email}
                              {m.role === 'CAPTAIN' ? ' (c)' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

