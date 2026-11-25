import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@gmail.com';

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production without ALLOW_SEED=true');
  }

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', isActive: true },
    create: { email: ADMIN_EMAIL, role: 'ADMIN', isActive: true },
  });

  console.log(`Admin application record ready: ${ADMIN_EMAIL}`);
  console.log('No demo data was created.');
  console.log('Create the matching Clerk account to sign in as the admin.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

