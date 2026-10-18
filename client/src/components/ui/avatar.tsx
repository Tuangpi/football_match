import * as React from 'react';
import { cn } from '@/lib/utils';

const avatarSizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  /** Used to derive initials when no image is available */
  name?: string | null;
  size?: keyof typeof avatarSizes;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', className, ...props }, ref) => {
    const [errored, setErrored] = React.useState(false);
    const showImage = src && !errored;
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground ring-2 ring-background',
          avatarSizes[size],
          className,
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <span aria-hidden>{getInitials(name)}</span>
        )}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar, getInitials };
