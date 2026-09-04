import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'That endpoint does not exist.' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Some fields need attention.',
      fields: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // A Postgres unique-violation that escaped a specific handler.
  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
    res.status(409).json({ error: 'That record already exists.' });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req as T, res, next).catch(next);
  };
}
