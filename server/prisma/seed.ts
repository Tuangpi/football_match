import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@gmail.com';

function yangonDate(daysFromToday: number, yangonHour: number, yangonMinute = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  const totalMinutes = yangonHour * 60 + yangonMinute - 390;
  const h = Math.floor(totalMinutes / 60);
  const m = ((totalMinutes % 60) + 60) % 60;
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function upsertUser(email: string, role: 'PLAYER' | 'OWNER' | 'ADMIN', profile?: { fullName: string; phone?: string; position?: string; skillLevel?: string }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, isActive: true },
    create: { email, role, isActive: true },
  });
  if (profile && role === 'PLAYER') {
    await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: { fullName: profile.fullName, phone: profile.phone, position: profile.position, skillLevel: profile.skillLevel },
      create: { userId: user.id, fullName: profile.fullName, phone: profile.phone, position: profile.position, skillLevel: profile.skillLevel },
    });
  }
  return user;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production without ALLOW_SEED=true');
  }

  console.log('Seeding database...');

  const admin = await upsertUser(ADMIN_EMAIL, 'ADMIN');

  const owner1 = await upsertUser('owner1@seed.local', 'OWNER');
  const owner2 = await upsertUser('owner2@seed.local', 'OWNER');

  const player1 = await upsertUser('player1@seed.local', 'PLAYER', {
    fullName: 'Aung Aung', phone: '0911111111', position: 'Forward', skillLevel: 'Intermediate',
  });
  const player2 = await upsertUser('player2@seed.local', 'PLAYER', {
    fullName: 'Kyaw Kyaw', phone: '0922222222', position: 'Midfielder', skillLevel: 'Beginner',
  });
  const player3 = await upsertUser('player3@seed.local', 'PLAYER', {
    fullName: 'Zaw Zaw', phone: '0933333333', position: 'Goalkeeper', skillLevel: 'Advanced',
  });

  async function getOrCreateCourt(ownerId: string, data: { name: string; address: string; city: string; basePricePerHour: number }) {
    const existing = await prisma.court.findFirst({ where: { ownerId, name: data.name } });
    if (existing) return existing;
    return prisma.court.create({ data: { ownerId, ...data } });
  }

  const court1 = await getOrCreateCourt(owner1.id, {
    name: 'Yangon Futsal Arena', address: '123 Inya Rd', city: 'Yangon', basePricePerHour: 15000,
  });
  const court2 = await getOrCreateCourt(owner1.id, {
    name: 'Inya Lake Court', address: '456 Lake View', city: 'Yangon', basePricePerHour: 12000,
  });
  const court3 = await getOrCreateCourt(owner2.id, {
    name: 'Mandalay Sports Hub', address: '789 Palace Rd', city: 'Mandalay', basePricePerHour: 10000,
  });

  let team = await prisma.team.findFirst({ where: { name: 'Yangon Strikers', captainId: player1.id } });
  if (!team) {
    team = await prisma.team.create({ data: { name: 'Yangon Strikers', sportType: 'FUTSAL', captainId: player1.id } });
  }
  for (const u of [player1, player2, player3]) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: u.id } },
      update: {},
      create: { teamId: team.id, userId: u.id, role: u.id === player1.id ? 'CAPTAIN' : 'MEMBER' },
    });
  }
  // --- Bookings ---
  async function ensureBooking(data: {
    courtId: string; playerId: string; teamId?: string; startsAt: Date; endsAt: Date;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; totalPrice: number; cancelledAt?: Date;
  }) {
    const existing = await prisma.booking.findFirst({
      where: { courtId: data.courtId, playerId: data.playerId, startsAt: data.startsAt },
    });
    if (existing) return existing;
    return prisma.booking.create({ data });
  }

  await ensureBooking({
    courtId: court1.id, playerId: player1.id, startsAt: yangonDate(1, 10), endsAt: yangonDate(1, 12),
    status: 'PENDING', totalPrice: 15000 * 2,
  });
  await ensureBooking({
    courtId: court1.id, playerId: player2.id, startsAt: yangonDate(2, 14), endsAt: yangonDate(2, 15),
    status: 'CONFIRMED', totalPrice: 15000,
  });
  await ensureBooking({
    courtId: court2.id, playerId: player3.id, startsAt: yangonDate(3, 16), endsAt: yangonDate(3, 18),
    status: 'CANCELLED', totalPrice: 12000 * 2, cancelledAt: new Date(),
  });
  await ensureBooking({
    courtId: court3.id, playerId: player1.id, teamId: team.id, startsAt: yangonDate(4, 9), endsAt: yangonDate(4, 11),
    status: 'PENDING', totalPrice: 10000 * 2,
  });

  // --- Court block ---
  const blockStart = yangonDate(1, 20);
  const blockEnd = yangonDate(1, 22);
  const existingBlock = await prisma.courtBlock.findFirst({
    where: { courtId: court1.id, startsAt: blockStart, reason: 'Maintenance' },
  });
  if (!existingBlock) {
    await prisma.courtBlock.create({
      data: { courtId: court1.id, startsAt: blockStart, endsAt: blockEnd, reason: 'Maintenance' },
    });
  }

  // --- Events ---
  async function ensureEvent(data: {
    courtId: string; userId: string; title: string; type: 'TOURNAMENT' | 'COMPETITION' | 'DISCOUNT' | 'PRICE_CHANGE';
    description?: string; startDate: Date; endDate: Date;
  }) {
    const existing = await prisma.event.findFirst({
      where: { courtId: data.courtId, userId: data.userId, startDate: data.startDate },
    });
    if (existing) {
      return prisma.event.update({ where: { id: existing.id }, data: { title: data.title, type: data.type, description: data.description, endDate: data.endDate } });
    }
    return prisma.event.create({ data });
  }

  await ensureEvent({
    courtId: court1.id, userId: owner1.id, title: 'Yangon Weekend Cup', type: 'TOURNAMENT',
    description: 'A weekend futsal tournament', startDate: yangonDate(7, 9), endDate: yangonDate(7, 18),
  });
  await ensureEvent({
    courtId: court3.id, userId: owner2.id, title: 'Mandalay Happy Hour', type: 'DISCOUNT',
    description: '20% off evening slots', startDate: yangonDate(5, 17), endDate: yangonDate(5, 21),
  });

  // --- Reviews ---
  await prisma.review.upsert({
    where: { courtId_userId: { courtId: court1.id, userId: player1.id } },
    update: { rating: 5, comment: 'Great court, well maintained.' },
    create: { courtId: court1.id, userId: player1.id, rating: 5, comment: 'Great court, well maintained.' },
  });
  await prisma.review.upsert({
    where: { courtId_userId: { courtId: court1.id, userId: player2.id } },
    update: { rating: 4, comment: 'Good lighting, a bit pricey.' },
    create: { courtId: court1.id, userId: player2.id, rating: 4, comment: 'Good lighting, a bit pricey.' },
  });

  // --- Friends ---
  await prisma.friend.upsert({
    where: { senderId_receiverId: { senderId: player1.id, receiverId: player2.id } },
    update: { status: 'ACCEPTED' },
    create: { senderId: player1.id, receiverId: player2.id, status: 'ACCEPTED' },
  });
  await prisma.friend.upsert({
    where: { senderId_receiverId: { senderId: player1.id, receiverId: player3.id } },
    update: { status: 'PENDING' },
    create: { senderId: player1.id, receiverId: player3.id, status: 'PENDING' },
  });

  console.log('Seed complete.');
  console.log(`Admin application record: ${ADMIN_EMAIL}`);
  console.log('This seed creates application data only, not Clerk accounts or passwords.');
  console.log('Create the admin account in Clerk with the same email; the backend links it on the first authenticated request.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

