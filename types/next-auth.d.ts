export {};

/**
 * `Session`, `User` and `JWT` are declared in @auth/core; next-auth only
 * re-exports them, so augmenting "next-auth" would create a shadowing
 * interface rather than merging with the real one.
 *
 * This only works while a single copy of @auth/core is installed — two copies
 * means two distinct declarations and the augmentation silently targets the
 * wrong one. The `overrides` entry in package.json pins that.
 */
declare module "@auth/core/types" {
  interface User {
    currency?: string | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    currency?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    currency?: string | null;
  }
}
