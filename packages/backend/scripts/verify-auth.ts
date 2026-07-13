/**
 * Behavioural verification for lib/auth.ts (run with tsx).
 * Exercises the JWT sign/verify paths and the production fail-closed guard
 * without needing a DB or the full Fastify app.
 */
import crypto from 'crypto';
import { signToken, verifyToken, getJwtSecret, assertAuthConfig } from '../src/lib/auth.js';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ok   - ${name}`); }
  else { fail++; console.log(`  FAIL - ${name}`); }
}

// Ensure dev mode for the first block
delete process.env.NODE_ENV;
delete process.env.AUTH_JWT_SECRET;

const now = Math.floor(Date.now() / 1000);

// 1. valid round-trip
const good = signToken({ sub: 'line_123', role: 'user', iat: now, exp: now + 3600 });
check('valid token round-trips and returns claims', verifyToken(good)?.sub === 'line_123');

// 2. tampered payload -> null
const [h, p, s] = good.split('.');
const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'line_123', role: 'admin', iat: now, exp: now + 3600 })).toString('base64url');
check('tampered payload (role->admin) rejected', verifyToken(`${h}.${tamperedPayload}.${s}`) === null);

// 3. tampered signature -> null
const badSig = s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA');
check('tampered signature rejected', verifyToken(`${h}.${p}.${badSig}`) === null);

// 4. alg:none forgery -> null
const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
check('alg:none forgery rejected', verifyToken(`${noneHeader}.${p}.`) === null);
check('alg:none with any sig rejected', verifyToken(`${noneHeader}.${p}.${s}`) === null);

// 5. expired token -> null
const expired = signToken({ sub: 'line_123', role: 'user', iat: now - 7200, exp: now - 3600 });
check('expired token rejected', verifyToken(expired) === null);

// 6. missing sub -> null
const noSub = signToken({ role: 'user', iat: now, exp: now + 3600 } as any);
check('token without sub rejected', verifyToken(noSub) === null);

// 7. malformed inputs never throw, return null
check('empty string -> null', verifyToken('') === null);
check('two-part token -> null', verifyToken('a.b') === null);
check('garbage -> null', verifyToken('!!!.???.***') === null);

// 8. cross-secret forgery: token signed with dev default is rejected once a real secret is configured
const forgedWithDefault = good; // signed with dev default above
process.env.AUTH_JWT_SECRET = crypto.randomBytes(32).toString('hex');
check('token signed with public dev default rejected under a real secret', verifyToken(forgedWithDefault) === null);
// and a token signed under the real secret verifies
const realTok = signToken({ sub: 'line_999', role: 'user', iat: now, exp: now + 3600 });
check('token signed with real secret verifies', verifyToken(realTok)?.sub === 'line_999');

// 9. production fail-closed
process.env.NODE_ENV = 'production';
delete process.env.AUTH_JWT_SECRET;
let threw = false;
try { getJwtSecret(); } catch { threw = true; }
check('getJwtSecret throws in production without secret', threw);

threw = false;
try { assertAuthConfig(); } catch { threw = true; }
check('assertAuthConfig throws in production without secret', threw);

// with a real secret but default cookie secret -> still throws
process.env.AUTH_JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COOKIE_SECRET = 'dev-secret';
threw = false;
try { assertAuthConfig(); } catch { threw = true; }
check('assertAuthConfig throws in production with default COOKIE_SECRET', threw);

// with both real secrets -> passes
process.env.COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
let ok = true;
try { assertAuthConfig(); } catch { ok = false; }
check('assertAuthConfig passes in production with strong secrets', ok);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
