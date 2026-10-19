import { message, getLocale } from '../lib/language';
import { t as translate } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { FadeIn } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Users, Building2, CalendarCheck, Trophy, ShieldAlert, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { ownedCourts: number; bookings: number };
};

type AdminCourt = {
  id: string;
  name: string;
  city: string;
  sportType: string;
  basePricePerHour: number;
  isActive: boolean;
  createdAt: string;
  owner: { id: string; email: string };
  _count: { bookings: number; reviews: number };
};

type RecentBooking = {
  id: string;
  status: string;
  totalPrice: number;
  bookedAt: string;
  player: { email: string };
  court: { name: string; city: string };
};

type Stats = {
  users: number;
  courts: number;
  bookings: number;
  events: number;
  activeCourts: number;
  pendingBookings: number;
  recentBookings: RecentBooking[];
};

type Tab = 'overview' | 'users' | 'courts';

export function AdminDashboard() {
  useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courts, setCourts] = useState<AdminCourt[]>([]);
  const [filter, setFilter] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [s, u, c] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/courts'),
      ]);
      setStats(s.data.stats);
      setUsers(u.data.users);
      setCourts(c.data.courts);
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to load admin data")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, []);

  async function toggleUser(u: AdminUser) {
    if (toggling) return;
    const action = u.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(message("Really {action} {name}?", { action: translate(action), name: u.email }))) return;
    setToggling(u.id);
    try {
      const res = await api.patch(`/admin/users/${u.id}/toggle`);
      toast.success(translate(res.data.message || `User ${action}d`));
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, isActive: res.data.user.isActive } : x))
      );
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to update user")));
    } finally {
      setToggling(null);
    }
  }

  async function toggleCourt(c: AdminCourt) {
    if (toggling) return;
    const action = c.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(message("Really {action} {name}?", { action: translate(action), name: c.name }))) return;
    setToggling(c.id);
    try {
      const res = await api.patch(`/admin/courts/${c.id}/toggle`);
      toast.success(translate(res.data.message || `Court ${action}d`));
      setCourts((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isActive: res.data.court.isActive } : x))
      );
      setStats((prev) =>
        prev ? { ...prev, activeCourts: prev.activeCourts + (res.data.court.isActive ? 1 : -1) } : prev
      );
    } catch (err: any) {
      toast.error(translate(err.response?.data?.message || translate("Failed to update court")));
    } finally {
      setToggling(null);
    }
  }

  const q = filter.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter((u) => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
    : users;
  const filteredCourts = q
    ? courts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.owner.email.toLowerCase().includes(q)
      )
    : courts;

  const statCards = stats
    ? [
        { icon: Users, label: 'Users', value: String(stats.users) },
        { icon: Building2, label: 'Courts', value: message("{active}/{total} active", { active: stats.activeCourts, total: stats.courts }) },
        { icon: CalendarCheck, label: 'Bookings', value: String(stats.bookings) },
        { icon: Trophy, label: 'Events', value: String(stats.events) },
      ]
    : [];

  if (loading) return <AdminSkeleton />;

  return (
    <AdminView
      tab={tab}
      setTab={setTab}
      stats={stats}
      statCards={statCards}
      filter={filter}
      setFilter={setFilter}
      filteredUsers={filteredUsers}
      filteredCourts={filteredCourts}
      toggling={toggling}
      toggleUser={toggleUser}
      toggleCourt={toggleCourt}
    />
  );
}

function AdminSkeleton() {
  useLanguage();
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

type ViewProps = {
  tab: Tab;
  setTab: (t: Tab) => void;
  stats: Stats | null;
  statCards: Array<{ icon: typeof Users; label: string; value: string }>;
  filter: string;
  setFilter: (v: string) => void;
  filteredUsers: AdminUser[];
  filteredCourts: AdminCourt[];
  toggling: string | null;
  toggleUser: (u: AdminUser) => void;
  toggleCourt: (c: AdminCourt) => void;
};

function AdminView(p: ViewProps) {
  useLanguage();
  const { tab, setTab } = p;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <FadeIn>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldAlert className="h-6 w-6 text-primary" /> {translate("Admin dashboard")} </h1>
            <p className="text-sm text-muted-foreground"> {translate("Moderate users and courts. Deactivation takes effect immediately.")} </p>
          </div>
          <div className="flex gap-2">
            {(['overview', 'users', 'courts'] as Tab[]).map((t) => (
              <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
                {t === 'overview' ? translate("Overview") : t === 'users' ? translate("Users") : translate("Courts")}
              </Button>
            ))}
          </div>
        </div>
      </FadeIn>

      {tab === 'overview' && p.stats && <Overview stats={p.stats} statCards={p.statCards} />}

      {tab !== 'overview' && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={p.filter}
            onChange={(e) => p.setFilter(e.target.value)}
            placeholder={tab === 'users' ? translate("Filter by email or role") : translate("Filter by court, city, owner")}
            className="pl-9"
          />
        </div>
      )}

      {tab === 'users' && <UserList {...p} />}
      {tab === 'courts' && <CourtList {...p} />}
    </div>
  );
}

function UserList(p: ViewProps) {
  useLanguage();
  if (p.filteredUsers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={translate("No users found")}
        description={p.filter ? translate("No users match your filter.") : translate("No users registered yet.")}
      />
    );
  }
  return (
    <div className="space-y-3">
      {p.filteredUsers.map((u, i) => (
        <FadeIn key={u.id} delay={Math.min(i, 6) * 0.04}>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u._count.ownedCourts} {translate("courts,")} {u._count.bookings} {translate("bookings, joined")}{' '}
                  {new Date(u.createdAt).toLocaleDateString(getLocale())}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{translate(u.role)}</Badge>
                <Badge variant={u.isActive ? 'default' : 'destructive'}>
                  {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                <Button variant="outline" size="sm" disabled={p.toggling === u.id} onClick={() => p.toggleUser(u)}>
                  {u.isActive ? translate("Deactivate") : translate("Activate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

function CourtList(p: ViewProps) {
  useLanguage();
  if (p.filteredCourts.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={translate("No courts found")}
        description={p.filter ? translate("No courts match your filter.") : translate("No courts listed yet.")}
      />
    );
  }
  return (
    <div className="space-y-3">
      {p.filteredCourts.map((c, i) => (
        <FadeIn key={c.id} delay={Math.min(i, 6) * 0.04}>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  <span>{c.name}</span>{' '}
                  <span className="font-normal text-muted-foreground">· {c.city}</span>
                </p>
                <p className="text-xs text-muted-foreground"> {translate("Owner:")} {c.owner.email} · {c._count.bookings} {translate("bookings ·")} {c._count.reviews}{' '} {translate("reviews ·")} {formatPrice(c.basePricePerHour)}{translate("/hr")} </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.isActive ? 'default' : 'secondary'}>
                  {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                <Button variant="outline" size="sm" disabled={p.toggling === c.id} onClick={() => p.toggleCourt(c)}>
                  {c.isActive ? translate("Deactivate") : translate("Activate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

function Overview({
  stats,
  statCards,
}: {
  stats: Stats;
  statCards: Array<{ icon: typeof Users; label: string; value: string }>;
}) {
  useLanguage();
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-lg bg-accent p-2 text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{translate(s.label)}</p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      {stats.pendingBookings > 0 && (
        <Card className="mt-4 border-amber-500/40">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>
              <strong>{stats.pendingBookings}</strong> {translate("booking")}{stats.pendingBookings === 1 ? '' : 's'}{' '} {translate("awaiting owner confirmation.")} </span>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{translate("Recent bookings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{translate("No bookings yet.")}</p>
          ) : (
            stats.recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {b.court.name} · {b.court.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.player.email} · {new Date(b.bookedAt).toLocaleDateString(getLocale())} · {formatPrice(b.totalPrice)}
                  </p>
                </div>
                <Badge variant={b.status === 'CANCELLED' ? 'secondary' : 'default'}>{translate(b.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
