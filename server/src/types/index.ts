import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'customer' | 'admin';
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}
