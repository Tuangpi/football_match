import 'dotenv/config';
import type { Server } from 'http';
import app from '../app';
import { prisma } from '../utils/prisma';

// Unique per test-run so parallel runs / reruns never collide, and cleanup
// can find everything this run created.
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
  opts: { cookie?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const res = await fetch(`${await startServer()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
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

function extractCookie(res: Response): string | null {
  const setCookies = res.headers.getSetCookie();
  const token = setCookies.find((c) => c.startsWith('token='));
  return token ? token.split(';')[0] : null;
}

export async function registerUser(role: 'PLAYER' | 'OWNER', name: string) {
  const email = uniqueEmail(name);
  const res = await fetch(`${await startServer()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, role }),
  });
  const data: any = await res.json();
  return {
    email,
    password: PASSWORD,
    cookie: extractCookie(res),
    userId: data.user.id as string,
  };
}

export type TestUser = Awaited<ReturnType<typeof registerUser>>;

// Removes every record created by this test run, in FK-safe order.
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
