import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/** Full-page centered spinner-style loader (used for route-level loading) */
function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-[60vh] items-center justify-center', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export { Skeleton, PageLoader };
