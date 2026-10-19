import { message } from '../lib/language';
import { t as translate } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Loader2, Trophy, UserPlus, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';

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
  useLanguage();
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

  async function refresh() {
    try {
      const params = filter === 'ALL' ? {} : { sportType: filter };
      const res = await api.get('/teams', { params });
      setTeams(res.data.teams);
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to load teams")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const onCreate = async (data: CreateTeamFormData) => {
    try {
      await api.post('/teams', { name: data.name, sportType: data.sportType });
      toast.success(translate("Team created!"));
      reset();
      refresh();
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to create team")));
    }
  };

  async function join(teamId: string) {
    setBusyId(teamId);
    try {
      await api.post(`/teams/${teamId}/join`);
      toast.success(translate("Joined the team"));
      refresh();
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to join team")));
    } finally {
      setBusyId(null);
    }
  }

  async function leave(teamId: string) {
    setBusyId(teamId);
    try {
      await api.delete(`/teams/${teamId}/leave`);
      toast.success(translate("Left the team"));
      refresh();
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to leave team")));
    } finally {
      setBusyId(null);
    }
  }

  async function removeTeam(teamId: string, name: string) {
    if (!window.confirm(message('Delete "{name}"? Members and history will be removed. This cannot be undone.', { name })))
      return;
    setBusyId(teamId);
    try {
      await api.delete(`/teams/${teamId}`);
      toast.success(translate("Team deleted"));
      refresh();
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to delete team")));
    } finally {
      setBusyId(null);
    }
  }


  if (!user) return <div className="p-8 text-center">{translate("Access denied. Login required.")}</div>;

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
        <h1 className="text-2xl font-bold text-foreground mb-6">{translate("Teams")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> {translate("Create a Team")} </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
                  <div>
                    <Label className="mb-1 block">{translate("Team name")}</Label>
                    <Input {...register('name')} placeholder={translate("e.g. Sunset Strikers")} />
                    {errors.name && <p className="text-destructive text-sm">{translate(errors.name.message)}</p>}
                  </div>
                  <div>
                    <Label className="mb-1 block">{translate("Sport")}</Label>
                    <select {...register('sportType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="FUTSAL">{translate("Futsal (5 vs 5)")}</option>
                      <option value="ELEVEN_A_SIDE">{translate("11-a-side")}</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : translate("Create Team")}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-3">{translate("You become the captain and are added as a member automatically.")}</p>
              </CardContent>
            </Card>

            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-lg">{translate("Filter")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(['ALL', 'FUTSAL', 'ELEVEN_A_SIDE'] as const).map((f) => (
                    <Button
                      key={f}
                      onClick={() => setFilter(f)}
                      variant={filter === f ? 'default' : 'secondary'}
                      size="sm"
                    >
                      {f === 'ALL' ? translate("All") : f === 'FUTSAL' ? translate("Futsal") : translate("11-a-side")}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> {translate("All Teams (")}{teams.length})
            </h3>
            {teams.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title={translate("No teams yet")}
                description={translate("Create the first one — you'll become its captain.")}
              />
            ) : (
              teams.map((t) => {
                const isMember = t.members.some((m) => m.user.id === user.id);
                const isCaptain = t.captainId === user.id;
                return (
                  <Card key={t.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-foreground">{t.name}</p>
                            <Badge variant="secondary">
                              {t.sportType === 'ELEVEN_A_SIDE' ? translate("11-a-side") : translate("Futsal")}
                            </Badge>
                            {isMember && (
                              <Badge>
                                {isCaptain ? translate("Captain") : translate("Member")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1"> {translate("Captain:")} {t.captain.email} · {t._count?.members ?? t.members.length} {translate("member(s)")} </p>
                        </div>
                        {isMember ? (
                          isCaptain ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground/70">{translate("Captains can't leave")}</span>
                              <Button
                                onClick={() => removeTeam(t.id, t.name)}
                                disabled={busyId === t.id}
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                {busyId === t.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}{' '} {translate("Delete")} </Button>
                            </span>
                          ) : (
                            <Button
                              onClick={() => leave(t.id)}
                              disabled={busyId === t.id}
                              variant="secondary"
                              size="sm"
                            >
                              {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} {translate("Leave")} </Button>
                          )
                        ) : (
                          <Button
                            onClick={() => join(t.id)}
                            disabled={busyId === t.id}
                            size="sm"
                          >
                            {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} {translate("Join")} </Button>
                        )}
                      </div>
                      {t.members.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/60">
                          <p className="text-xs text-muted-foreground mb-1">{translate("Members:")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.members.map((m) => (
                              <Badge key={m.id} variant="secondary">
                                {m.user.email}
                                {m.role === 'CAPTAIN' ? ' (c)' : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

