import { observabilitySdk } from './instrumentation';
import { logger } from './logger';
import { posthog } from './observability';
import app from './app';
import { prisma } from './utils/prisma';

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  logger.info('Server listening', { port });
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Graceful shutdown started', { signal });

  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }).catch((error: unknown) => {
    logger.error('Failed to close HTTP server', { err: error });
  });

  await prisma.$disconnect();
  await Promise.all([
    posthog?.shutdown(),
    observabilitySdk?.shutdown(),
  ]);
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('uncaughtException', (error) => {
  logger.error('Uncaught exception', { err: error });
  posthog?.captureException(error, { properties: { source: 'uncaughtException' }, level: 'fatal' });
  void shutdown('uncaughtException');
});
process.once('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection', { err: error });
  posthog?.captureException(error, { properties: { source: 'unhandledRejection' }, level: 'fatal' });
  void shutdown('unhandledRejection');
});

export { server };