import crypto from 'crypto';

/**
 * Centralised JWT (HS256) signing / verification.
 *
 * Security properties enforced here (previously missing or duplicated across
 * routes/users.ts and routes/auth-line.ts):
 *  - Fail-closed in production: the server refuses to sign or verify tokens
 *    when AUTH_JWT_SECRET is unset or left at the public dev default. The dev
 *    default lives in a public repo, so a production deploy that forgets to set
 *    the env var would let anyone forge a token for any known user id.
 *  - Explicit algorithm check: only `alg: "HS256"` is accepted, blocking
 *    `alg: "none"` and algorithm-confusion tokens.
 *  - Constant-time signature comparison via crypto.timingSafeEqual.
 */

const DEV_DEFAULT_SECRET = 'dev-jwt-secret-change-me';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

let warnedDevSecret = false;

/**
 * Resolve the signing secret. Throws in production when the secret is missing
 * or still the public dev default; falls back (with a one-time warning) to the
 * dev default outside production so local/test runs keep working.
 */
export function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret && secret !== DEV_DEFAULT_SECRET) return secret;
  if (isProduction()) {
    throw new Error(
      '[auth] AUTH_JWT_SECRET must be set to a strong, non-default value in production'
    );
  }
  if (!warnedDevSecret) {
    warnedDevSecret = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] AUTH_JWT_SECRET not set — using insecure dev default. Do NOT use this in production.'
    );
  }
  return DEV_DEFAULT_SECRET;
}

/**
 * Startup guard. Call once at boot so a misconfigured production deploy fails
 * fast and loudly instead of silently accepting forgeable tokens.
 */
export function assertAuthConfig(): void {
  if (isProduction()) {
    // Throws if unset/default.
    getJwtSecret();
    if ((process.env.COOKIE_SECRET || 'dev-secret') === 'dev-secret') {
      throw new Error('[auth] COOKIE_SECRET must be set to a strong value in production');
    }
  }
}

export interface JwtClaims {
  sub: string;
  name?: string;
  avatar?: string | null;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function sign(headerB64: string, payloadB64: string): string {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
}

/** Sign an HS256 JWT for the given claims (caller supplies iat/exp). */
export function signToken(claims: JwtClaims): string {
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = sign(HEADER, payloadB64);
  return `${HEADER}.${payloadB64}.${sig}`;
}

/** Constant-time compare of two base64url signature strings. */
function signaturesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify an HS256 JWT. Returns the decoded claims when the signature is valid,
 * the algorithm is HS256, `sub` is present and the token is not expired;
 * otherwise returns null. Never throws on malformed input.
 */
export function verifyToken(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts;
  if (!headerB64 || !payloadB64 || !sig) return null;

  // Algorithm must be exactly HS256 — blocks alg:none / algorithm confusion.
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (header?.alg !== 'HS256') return null;
  } catch {
    return null;
  }

  const expected = sign(headerB64, payloadB64);
  if (!signaturesMatch(expected, sig)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JwtClaims;
    if (!claims.sub) return null;
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
