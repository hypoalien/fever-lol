/**
 * Reading an error message without reaching for `any`.
 *
 * Axios puts the server's JSON body on `error.response.data`; everything else
 * is a plain Error. Both are narrowed structurally here so call sites do not
 * have to cast.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const response = (error as { response?: unknown }).response;
    if (typeof response === "object" && response !== null) {
      const data = (response as { data?: unknown }).data;
      if (typeof data === "object" && data !== null) {
        for (const key of ["error", "message"] as const) {
          const value = (data as Record<string, unknown>)[key];
          if (typeof value === "string" && value) return value;
        }
      }
    }
    if (error instanceof Error && error.message) return error.message;
  }
  return fallback;
}
