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
