import { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { AppError } from './error';
import { prisma } from '../utils/prisma';

export type AppUser = { id: string; email: string; role: string; clerkId: string | null };

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

async function provisionUser(clerkUserId: string): Promise<{
  id: string;
  email: string;
  role: string;
  clerkId: string | null;
  isActive: boolean;
} | null> {
  let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (user) return user;

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(clerkUserId);
  } catch {
    return null;
  }

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();

  const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingByEmail) {
    user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { clerkId: clerkUserId },
    });
    return user;
  }

  const roleFromMetadata =
    (clerkUser.unsafeMetadata as { role?: string } | undefined)?.role ||
    (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  const role = roleFromMetadata === 'OWNER' || roleFromMetadata === 'ADMIN' ? roleFromMetadata : 'PLAYER';

  user = await prisma.user.create({
    data: {
      clerkId: clerkUserId,
      email: normalizedEmail,
      role: role as any,
    },
  });
  return user;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // Test-only bypass: allows the node test suite to act as a user without Clerk.
  if (process.env.NODE_ENV === 'test') {
    const testUserId = req.headers['x-test-user-id'];
    if (typeof testUserId === 'string' && testUserId) {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { id: true, email: true, role: true, clerkId: true, isActive: true },
      });
      if (!user) return next(new AppError('User not found', 401));
      if (!user.isActive) return next(new AppError('Account deactivated. Contact support.', 403));
      req.user = { id: user.id, email: user.email, role: user.role, clerkId: user.clerkId };
      return next();
    }
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return next(new AppError('Authentication required', 401));
  }

  const user = await provisionUser(userId);
  if (!user) {
    return next(new AppError('User not found', 401));
  }
  if (!user.isActive) {
    return next(new AppError('Account deactivated. Contact support.', 403));
  }

  req.user = { id: user.id, email: user.email, role: user.role, clerkId: user.clerkId };
  next();
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient role', 403));
    }
    next();
  };
};

export const restrictAdminToDashboard = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  let lookupId: string | null = null;
  let byClerk = true;

  if (process.env.NODE_ENV === 'test') {
    const testUserId = req.headers['x-test-user-id'];
    if (typeof testUserId === 'string' && testUserId) {
      lookupId = testUserId;
      byClerk = false;
    }
  }

  if (!lookupId) {
    const { userId } = getAuth(req);
    if (userId) {
      lookupId = userId;
      byClerk = true;
    }
  }

  if (!lookupId) return next();

  const user = await prisma.user.findUnique({
    where: byClerk ? { clerkId: lookupId } : { id: lookupId },
    select: { role: true },
  });
  if (!user || user.role !== 'ADMIN') return next();

  return next(new AppError('Forbidden: admins may only access the admin dashboard', 403));
};
