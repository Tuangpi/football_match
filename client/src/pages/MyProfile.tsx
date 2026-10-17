import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  skillLevel: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await api.get('/players/me');
      setProfile(res.data.profile);
      reset(res.data.profile);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      await api.put('/players/me', data);
      toast.success('Profile updated');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <User className="h-10 w-10 text-orange-600 bg-orange-100 rounded-full p-1" />
            <div>
              <h2 className="font-bold text-lg">{profile?.user?.email || '—'}</h2>
              <p className="text-sm text-gray-500">{user?.role}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input {...register('fullName')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input {...register('phone')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input {...register('position')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                {errors.position && <p className="text-red-500 text-sm">{errors.position.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                <input {...register('skillLevel')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
                {errors.skillLevel && <p className="text-red-500 text-sm">{errors.skillLevel.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea {...register('bio')} rows={3} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
              {errors.bio && <p className="text-red-500 text-sm">{errors.bio.message}</p>}
            </div>
            <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}