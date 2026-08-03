import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapts the Next build for Cloudflare Workers.
 *
 * Incremental cache is left on the default in-Worker implementation. The app
 * has no ISR pages worth persisting across isolates yet — the landing page is
 * fully static and everything else is per-request — so an R2 or KV cache would
 * add a binding and a round trip for nothing. Revisit when a page starts using
 * revalidate.
 */
export default defineCloudflareConfig();
