import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { forbidden, unauthorized } from '../lib/http.js';
import type { AuthedRequest, JwtPayload } from '../types/index.js';

export const TOKEN_COOKIE = 'ns_token';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,          // not readable from JS -- blunts XSS token theft
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
}

/** Populates req.user when a valid token is present. Never rejects. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
    } catch {
      // Expired or tampered-with: treat as an anonymous visitor.
    }
  }
  next();
}

/** Rejects the request unless a valid token is present. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden('Admin access required.'));
  next();
}
