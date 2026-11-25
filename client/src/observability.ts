import posthog from 'posthog-js';

const posthogProjectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();

const ignoredExceptionPatterns = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  /Script error\.?$/i,
  /Extension context invalidated/i,
];

if (posthogProjectToken) {
  posthog.init(posthogProjectToken, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    defaults: '2026-08-30',
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    before_send: (event) => {
      if (event.event !== '$exception') return event;

      const exceptions = event.properties?.$exception_list;
      const message = Array.isArray(exceptions) ? exceptions[0]?.value : undefined;
      return typeof message === 'string' && ignoredExceptionPatterns.some((pattern) => pattern.test(message))
        ? null
        : event;
    },
  });
}

export { posthog };