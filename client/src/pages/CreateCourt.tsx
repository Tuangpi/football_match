import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Building2, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.number().positive('Price must be positive'),
});

type FormData = z.infer<typeof schema>;

export function CreateCourt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/courts', data);
      toast.success('Court created!');
      navigate('/owner/courts');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create court');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'OWNER') {
    return <div className="p-8 text-center">Access denied. Owner role required.</div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">List Your Court</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
              <input {...register('name')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport Type</label>
              <select {...register('sportType')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="FUTSAL">Futsal (5v5)</option>
                <option value="ELEVEN_A_SIDE">11-a-side</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input {...register('address')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
            {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input {...register('city')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
              {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour ($)</label>
              <input {...register('basePricePerHour')} type="number" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
              {errors.basePricePerHour && <p className="text-red-500 text-sm">{errors.basePricePerHour.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (e.g. 40m x 20m)</label>
            <input {...register('dimensions')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surface Type</label>
            <input {...register('surfaceType')} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white rounded-md font-medium disabled:opacity-50 hover:bg-orange-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ''} Create Court
          </button>
        </form>
      </div>
    </div>
  );
}