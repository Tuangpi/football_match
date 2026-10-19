import { Goal } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandProps = {
  className?: string;
  /** `onGradient` renders the white treatment used on top of the gradient auth panel. */
  variant?: 'default' | 'onGradient';
};

export function Brand({ className, variant = 'default' }: BrandProps) {
  const onGradient = variant === 'onGradient';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          onGradient
            ? 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur'
            : 'bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white shadow-sm shadow-primary/30',
        )}
      >
        <Goal className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className={cn('text-lg font-bold tracking-tight', onGradient && 'text-white')}>
        Football
        <span className={onGradient ? 'text-white/80' : 'text-primary'}>Match</span>
      </span>
    </span>
  );
}
