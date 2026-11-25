import 'dotenv/config';
import { PostHog } from 'posthog-node';

const posthogProjectToken = process.env.POSTHOG_PROJECT_TOKEN?.trim();

export const posthog = posthogProjectToken
  ? new PostHog(posthogProjectToken, {
      host: process.env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    })
  : undefined;