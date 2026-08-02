import { afterEach, describe, expect, it, vi } from "vitest";

import { errorFields, log } from "@/lib/log";

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.__posthogLogger;
});

describe("errorFields", () => {
  it("flattens an Error into named fields", () => {
    const fields = errorFields(new TypeError("bad input"));
    expect(fields["error.name"]).toBe("TypeError");
    expect(fields["error.message"]).toBe("bad input");
    expect(typeof fields["error.stack"]).toBe("string");
  });

  it("keeps the Postgres detail a plain String() would discard", () => {
    // postgres.js hangs the useful part off the error object, and Drizzle
    // wraps that in `cause` — both are searched.
    const inner = Object.assign(new Error("insert failed"), {
      code: "23505",
      constraint_name: "orders_gateway_payment_id_idx",
    });
    const wrapped = new Error("Failed query", { cause: inner });

    const fields = errorFields(wrapped);
    expect(fields["error.code"]).toBe("23505");
    expect(fields["error.constraint_name"]).toBe(
      "orders_gateway_payment_id_idx"
    );
  });

  it("handles a thrown non-Error", () => {
    expect(errorFields("just a string")["error.message"]).toBe("just a string");
  });

  it("truncates a long stack so one log line cannot be unbounded", () => {
    const error = new Error("boom");
    error.stack = "x".repeat(10_000);
    expect(String(errorFields(error)["error.stack"])).toHaveLength(4000);
  });
});

describe("log", () => {
  it("writes to the console even when no exporter is configured", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("something broke", { route: "api/checkout" });
    expect(spy).toHaveBeenCalledWith("something broke", {
      route: "api/checkout",
    });
  });

  it("emits to the OTLP logger when one is present", () => {
    const emit = vi.fn();
    globalThis.__posthogLogger = { emit } as unknown as typeof globalThis.__posthogLogger;
    vi.spyOn(console, "info").mockImplementation(() => {});

    log.info("checkout created", { checkoutId: "abc" });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      severityText: "INFO",
      body: "checkout created",
      attributes: { checkoutId: "abc" },
    });
  });

  it("drops null and undefined, which OTLP attributes cannot carry", () => {
    const emit = vi.fn();
    globalThis.__posthogLogger = { emit } as unknown as typeof globalThis.__posthogLogger;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    log.warn("partial", { present: "yes", missing: undefined, empty: null });

    expect(emit.mock.calls[0][0].attributes).toEqual({ present: "yes" });
  });

  it("never throws when the exporter does", () => {
    globalThis.__posthogLogger = {
      emit: () => {
        throw new Error("exporter is down");
      },
    } as unknown as typeof globalThis.__posthogLogger;
    vi.spyOn(console, "error").mockImplementation(() => {});

    // A failure to log must not become a failure to serve the request.
    expect(() => log.error("still fine")).not.toThrow();
  });
});
