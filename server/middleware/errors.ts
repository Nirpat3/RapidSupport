import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Builds a standardized 400 response payload from a ZodError.
 * Always uses zod-validation-error for human-readable messages.
 */
export function zodErrorResponse(error: z.ZodError): { error: string; details: string[] } {
  return {
    error: fromZodError(error).message,
    details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Global Express error handler — must be registered last via app.use().
 * Catches any error passed via next(error).
 *
 * Handles:
 *  - ZodError  → 400 with standardized validation message
 *  - Error     → 500 with generic internal error message
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json(zodErrorResponse(err));
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  console.error('[GlobalErrorHandler]', err);
  return res.status(500).json({ error: message });
}
