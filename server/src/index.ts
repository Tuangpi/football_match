import * as Sentry from '@sentry/node';
import { posthog } from './observability';
import app from './app';
import { prisma } from './utils/prisma';

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`${signal} received; shutting down gracefully.`);

  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }).catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to close HTTP server', error);
  });

  await prisma.$disconnect();
  await Promise.all([
    posthog?.shutdown(),
    Sentry.close(2_000),
  ]);
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

export { server };