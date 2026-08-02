import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import type { Logger } from "@opentelemetry/api-logs";

/**
 * Ships server logs to PostHog over OTLP.
 *
 * Next loads this once at startup. `instrumentation.ts` has been stable since
 * Next 15, so the experimental.instrumentationHook flag is not needed.
 */

declare global {
  // eslint-disable-next-line no-var
  var __posthogLogger: Logger | undefined;
}

export function register(): void {
  // Only the Node runtime — the edge runtime has no OTLP exporter, and this
  // must not run in the browser bundle.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "fever-lol",
      "service.version": process.env.npm_package_version ?? "0.0.0",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    processors: [
      // Batched rather than the Simple processor from the setup snippet:
      // exporting on every single log record adds a network round trip to
      // each one.
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host}/otlp/v1/logs`,
          headers: { Authorization: `Bearer ${key}` },
        }),
      }),
    ],
  });

  globalThis.__posthogLogger = provider.getLogger("fever-lol");
}

