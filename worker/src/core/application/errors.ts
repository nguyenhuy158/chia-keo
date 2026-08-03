// Loi nghiep vu de route (driving adapter) map sang HTTP status.

export class NotFoundError extends Error {
  constructor() {
    super("not_found");
  }
}

export class InvalidInputError extends Error {
  constructor() {
    super("invalid_input");
  }
}

/** Loi nghiep vu 400 co ma rieng de client hien thong bao cu the. */
export class BadRequestError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/** Loi tu AI provider; `code` la ma loi de client hien thong bao phu hop. */
export class AiProviderError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
