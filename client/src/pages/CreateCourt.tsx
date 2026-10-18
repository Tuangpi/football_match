import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
        <h1 className="text-2xl font-bold text-foreground mb-6">List Your Court</h1>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Court Name</Label>
                  <Input {...register('name')} />
                  {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">Sport Type</Label>
                  <select {...register('sportType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="FUTSAL">Futsal (5v5)</option>
                    <option value="ELEVEN_A_SIDE">11-a-side</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Address</Label>
                <Input {...register('address')} />
                {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">City</Label>
                  <Input {...register('city')} />
                  {errors.city && <p className="text-destructive text-sm">{errors.city.message}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">Price per Hour ($)</Label>
                  <Input {...register('basePricePerHour')} type="number" />
                  {errors.basePricePerHour && <p className="text-destructive text-sm">{errors.basePricePerHour.message}</p>}
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Dimensions (e.g. 40m x 20m)</Label>
                <Input {...register('dimensions')} />
              </div>
              <div>
                <Label className="mb-1 block">Surface Type</Label>
                <Input {...register('surfaceType')} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ''} Create Court
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}