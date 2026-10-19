import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function defaultRouteForRole(role?: string): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'OWNER') return '/owner/courts';
  return '/';
}

/**
 * Resolve where to send the user after login/register.
 * - Honors a saved `state.from` (set by ProtectedRoute), so "log in to continue"
 *   actually returns the user where they were going — except auth pages, which
 *   would loop, and role-gated owner/admin paths when the user lacks that role.
 * - Falls back to the role default (ADMIN -> /admin, OWNER -> /owner/courts, else /).
 */
export function resolvePostAuthRedirect(
  role: string | undefined,
  fromPath?: string,
): string {
  const fallback = defaultRouteForRole(role);
  if (!fromPath || fromPath === '/login' || fromPath === '/register') return fallback;
  if (fromPath.startsWith('/admin') && role !== 'ADMIN') return fallback;
  if (fromPath.startsWith('/owner') && role !== 'OWNER' && role !== 'ADMIN') return fallback;
  return fromPath;
}
