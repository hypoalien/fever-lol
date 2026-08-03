/**
 * Bindings available to the Worker at runtime.
 *
 * Declared by hand rather than generated, so the shape is reviewable in the
 * diff. Regenerate with `wrangler types` if the bindings in wrangler.jsonc
 * change substantially.
 */
interface CloudflareEnv {
  /** Connection pooler in front of Postgres. */
  HYPERDRIVE: { connectionString: string };
  /** Event flyer storage; replaces the S3 bucket. */
  FLYERS: R2Bucket;
  ASSETS: Fetcher;
}
