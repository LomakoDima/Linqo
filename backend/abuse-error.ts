export class AbuseError extends Error {
  status = 429;
  constructor(
    public code: string,
    message: string,
    public retryAfter: number,
  ) {
    super(message);
  }
}
