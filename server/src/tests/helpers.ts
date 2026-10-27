import 'dotenv/config';
import type { Server } from 'http';
import app from '../app';
import { prisma } from '../utils/prisma';

export const RUN_ID = `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
export const PASSWORD = 'password123';

let server: Server | null = null;
let baseUrl = '';

export async function startServer(): Promise<string> {
  if (!baseUrl) {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server!.address();
    if (typeof address === 'object' && address) {
      baseUrl = `http://127.0.0.1:${address.port}`;
    }
  }
  return baseUrl;
}

export async function stopServer(): Promise<void> {
  if (server) {
    await new Promise((resolve) => server!.close(resolve));
    server = null;
    baseUrl = '';
  }
  await prisma.$disconnect();
}

export function uniqueEmail(name: string): string {
  return `${name}-${RUN_ID}@test.local`;
}

type ApiResponse = { status: number; body: any };

export async function api(
  method: string,
  path: string,
  opts: { cookie?: string | null; userId?: string | null; body?: unknown; headers?: Record<string, string> } = {}
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.userId ? { 'x-test-user-id': opts.userId } : {}),
    ...(opts.headers ?? {}),
  };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${await startServer()}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response; leave body null
  }
  return { status: res.status, body };
}

export async function registerUser(role: 'PLAYER' | 'OWNER' | 'ADMIN', name: string) {
  const email = uniqueEmail(name);
  const user = await prisma.user.create({
    data: { email, role: role as any },
  });
  return {
    email,
    password: PASSWORD,
    userId: user.id,
    role,
  };
}

export type TestUser = Awaited<ReturnType<typeof registerUser>>;

export async function cleanupTestData(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { contains: `-${RUN_ID}@` } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (!userIds.length) return;

  const courts = await prisma.court.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const courtIds = courts.map((c) => c.id);
  const teams = await prisma.team.findMany({
    where: { captainId: { in: userIds } },
    select: { id: true },
  });
  const teamIds = teams.map((t) => t.id);

  await prisma.booking.deleteMany({
    where: {
      OR: [
        { playerId: { in: userIds } },
        ...(courtIds.length ? [{ courtId: { in: courtIds } }] : []),
      ],
    },
  });
  await prisma.review.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        ...(courtIds.length ? [{ courtId: { in: courtIds } }] : []),
      ],
    },
  });
  await prisma.event.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        ...(courtIds.length ? [{ courtId: { in: courtIds } }] : []),
      ],
    },
  });
  await prisma.teamMember.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { teamId: { in: teamIds } }],
    },
  });
  await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
  await prisma.court.deleteMany({ where: { id: { in: courtIds } } });
  await prisma.friend.deleteMany({
    where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
