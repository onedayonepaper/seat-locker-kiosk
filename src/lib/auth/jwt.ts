import * as jose from 'jose';

export interface JWTPayload {
  role: 'ADMIN' | 'STAFF';
  exp?: number;
  iat?: number;
}

// Generate a consistent secret from environment variable or fallback
// In production, JWT_SECRET should always be set
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-production-min-32-chars';
  return new TextEncoder().encode(secret);
};

/**
 * Sign a JWT token with the given payload
 * Token expires in 8 hours by default
 */
export async function signJWT(
  payload: Omit<JWTPayload, 'exp' | 'iat'>,
  expiresIn = '8h'
): Promise<string> {
  const secret = getJWTSecret();

  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jose.jwtVerify(token, secret);

    return {
      role: payload.role as 'ADMIN' | 'STAFF',
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Decode a JWT token without verifying
 * Useful for debugging but should not be trusted
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = jose.decodeJwt(token);
    return {
      role: payload.role as 'ADMIN' | 'STAFF',
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

// Cookie configuration for auth token
export const AUTH_COOKIE_NAME = 'auth-token';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 hours in seconds
};
