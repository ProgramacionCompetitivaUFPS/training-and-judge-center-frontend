export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>,
    // The full parsed error body — some endpoints (e.g. publish) carry extra fields beyond
    // the standard {error, message, details} shape that only that endpoint's caller knows
    // how to interpret.
    public raw?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/**
 * True for API answers that mean "you can't see this here": 404, and 403 too,
 * so a resource the user can't access looks missing instead of confirming it exists.
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiClientError && (error.status === 404 || error.status === 403)
}

/** True for 4xx answers, which retrying won't change. */
export function isClientError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status >= 400 && error.status < 500
}
