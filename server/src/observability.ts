import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { PostHog } from 'posthog-node';

const sentryDsn = process.env.SENTRY_DSN?.trim();
const posthogProjectToken = process.env.POSTHOG_PROJECT_TOKEN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
  });
}

export const posthog = posthogProjectToken
  ? new PostHog(posthogProjectToken, {
      host: process.env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    })
  : undefined;

export const isSentryEnabled = Boolean(sentryDsn);