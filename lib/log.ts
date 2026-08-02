import { SeverityNumber } from "@opentelemetry/api-logs";

/**
 * Structured logging.
 *
 * Writes to two places at once: the console, which lands in Workers Logs and
 * is what you reach for during an incident, and PostHog over OTLP, which is
 * where anything older than a few hours has to live because Workers Logs is
 * sampled and short-retention.
 *
 * The OTLP exporter is set up in instrumentation.ts. Before this module
 * existed the exporter was configured and never called — every log site used
 * console directly, so the pipe carried nothing.
 */

export type LogFields = Record<string, string | number | boolean | null | undefined>;

type Level = "debug" | "info" | "warn" | "error";

const SEVERITY: Record<Level, { number: SeverityNumber; text: string }> = {
  debug: { number: SeverityNumber.DEBUG, text: "DEBUG" },
  info: { number: SeverityNumber.INFO, text: "INFO" },
  warn: { number: SeverityNumber.WARN, text: "WARN" },
  error: { number: SeverityNumber.ERROR, text: "ERROR" },
};

/** OTLP attributes cannot hold null or undefined; drop those keys. */
function cleanAttributes(
  fields: LogFields
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) result[key] = value;
  }
  return result;
}

/**
 * Flatten an error into fields.
 *
 * Postgres and gateway errors carry the detail worth keeping on properties
 * that a plain `String(error)` throws away — the violated constraint, the
 * SQLSTATE code — so those are pulled out explicitly.
 */
export function errorFields(error: unknown, prefix = "error"): LogFields {
  if (error instanceof Error) {
    const fields: LogFields = {
      [`${prefix}.name`]: error.name,
      [`${prefix}.message`]: error.message,
      [`${prefix}.stack`]: error.stack?.slice(0, 4000),
    };
    const cause = (error as { cause?: unknown }).cause;
    for (const key of ["code", "constraint_name", "detail", "severity"] as const) {
      const value =
        (error as unknown as Record<string, unknown>)[key] ??
        (typeof cause === "object" && cause !== null
          ? (cause as Record<string, unknown>)[key]
          : undefined);
      if (typeof value === "string" || typeof value === "number") {
        fields[`${prefix}.${key}`] = value;
      }
    }
    return fields;
  }
  return { [`${prefix}.message`]: String(error) };
}

function write(level: Level, message: string, fields: LogFields = {}): void {
  const attributes = cleanAttributes(fields);

  // Console first, so a failure in the exporter cannot lose the line.
  const consoleMethod =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  consoleMethod(
    message,
    Object.keys(attributes).length > 0 ? attributes : undefined
  );

  try {
    const { number, text } = SEVERITY[level];
    globalThis.__posthogLogger?.emit({
      severityNumber: number,
      severityText: text,
      body: message,
      attributes,
    });
  } catch {
    // Never let logging throw into a request path.
  }
}

export const log = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),

  /** Log a caught error with its detail flattened into fields. */
  exception: (message: string, error: unknown, fields?: LogFields) =>
    write("error", message, { ...fields, ...errorFields(error) }),
};
