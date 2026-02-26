import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware: requireCustomerAuth
 * Ensures the request is from an authenticated customer session.
 * Applied to all /api/customer-portal/* routes via app.use().
 */
export function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const customerId = session?.customerId;
  const userType = session?.userType;

  if (!customerId || userType !== 'customer') {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  next();
}
