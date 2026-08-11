/** A domain refusal carrying the HTTP status the controller should return. */
export class DirectoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
