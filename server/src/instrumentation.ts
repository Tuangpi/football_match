import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

const projectToken = process.env.POSTHOG_PROJECT_TOKEN?.trim();
const host = (process.env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com').replace(/\/$/, '');

export const observabilitySdk = projectToken
  ? new NodeSDK({
      resource: resourceFromAttributes({ 'service.name': 'football-match-server' }),
      logRecordProcessors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: { Authorization: `Bearer ${projectToken}` },
          }),
        }),
      ],
      instrumentations: [new WinstonInstrumentation()],
    })
  : undefined;

observabilitySdk?.start();