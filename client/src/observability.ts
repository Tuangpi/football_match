import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const posthogProjectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
  });
}

if (posthogProjectToken) {
  posthog.init(posthogProjectToken, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    defaults: '2026-08-30',
  });
}

export { posthog };