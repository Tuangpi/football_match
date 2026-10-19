import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, Sun, Moon, Monitor, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

const schema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  skillLevel: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional(),
});

type FormData = z.infer<typeof schema>;

export function MyProfile() {
  useLanguage();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function fetchProfile() {
    try {
      const res = await api.get('/players/me');
      setProfile(res.data.profile);
      reset(res.data.profile);
    } catch (err: any) {
      toast.error(t(err.response?.data?.message || t("Failed to load profile")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      // empty string clears the avatar (API expects null or a valid URL)
      await api.put('/players/me', { ...data, avatarUrl: data.avatarUrl || null });
      toast.success(t("Profile updated"));
      fetchProfile();
    } catch (err: any) {
      toast.error(t(err.response?.data?.message || t("Update failed")));
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("My Profile")}</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <Avatar
                  src={profile?.avatarUrl}
                  name={profile?.fullName || profile?.user?.email}
                  size="lg"
                />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Camera className="h-3 w-3" />
                </span>
              </div>
              <div>
                <h2 className="font-bold text-lg">{profile?.user?.email || '—'}</h2>
                <p className="text-sm text-muted-foreground">{t(user?.role)}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="avatarUrl" className="mb-1 block">{t("Avatar URL")}</Label>
                <Input
                  id="avatarUrl"
                  placeholder={t("https://… (leave empty to use initials)")}
                  {...register('avatarUrl')}
                />
                {errors.avatarUrl && <p className="text-destructive text-sm">{t(errors.avatarUrl.message)}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="mb-1 block">{t("Full Name")}</Label>
                  <Input id="fullName" {...register('fullName')} />
                  {errors.fullName && <p className="text-destructive text-sm">{t(errors.fullName.message)}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-1 block">{t("Phone")}</Label>
                  <Input id="phone" {...register('phone')} />
                  {errors.phone && <p className="text-destructive text-sm">{t(errors.phone.message)}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position" className="mb-1 block">{t("Position")}</Label>
                  <Input id="position" {...register('position')} />
                  {errors.position && <p className="text-destructive text-sm">{t(errors.position.message)}</p>}
                </div>
                <div>
                  <Label htmlFor="skillLevel" className="mb-1 block">{t("Skill Level")}</Label>
                  <Input id="skillLevel" {...register('skillLevel')} />
                  {errors.skillLevel && <p className="text-destructive text-sm">{t(errors.skillLevel.message)}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="bio" className="mb-1 block">{t("Bio")}</Label>
                <Textarea id="bio" {...register('bio')} rows={3} />
                {errors.bio && <p className="text-destructive text-sm">{t(errors.bio.message)}</p>}
              </div>
              <Button type="submit" className="w-full"> {t("Save Changes")} </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("Appearance")}</CardTitle>
            <CardDescription>{t("Choose how FootballMatch looks. Saved on this device.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'light', label: 'Light', Icon: Sun },
                  { value: 'dark', label: 'Dark', Icon: Moon },
                  { value: 'system', label: 'System', Icon: Monitor },
                ] as const
              ).map(({ value, label, Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={theme === value ? 'default' : 'outline'}
                  onClick={() => setTheme(value)}
                  className="flex-col h-auto py-3"
                >
                  <Icon className="h-5 w-5" />
                  {t(label)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}