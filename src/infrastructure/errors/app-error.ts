export interface AppErrorOptions {
  code: string;
  message?: string;
  status?: number;
  details?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(opts: AppErrorOptions) {
    super(opts.message ?? opts.code);
    this.code = opts.code;
    this.status = opts.status ?? 400;
    this.details = opts.details;
  }
}

export function isAppError(err: unknown): err is AppError {
  if (typeof err !== 'object' || err === null) return false;
  const maybe = err as { code?: unknown; status?: unknown };
  return typeof maybe.code === 'string' && typeof maybe.status === 'number';
}
