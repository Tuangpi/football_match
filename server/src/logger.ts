import type { Request } from 'express';
import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL?.trim() || 'info',
  format: isProduction ? winston.format.json() : winston.format.simple(),
  defaultMeta: { service: 'football-match-server' },
  transports: [new winston.transports.Console()],
});

export function getRequestLogger(req: Request) {
  return logger.child({
    method: req.method,
    path: req.baseUrl + req.path,
    ...(req.user?.clerkId && { posthogDistinctId: req.user.clerkId }),
  });
}