import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';

interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface LineProfileClaims {
  sub: string; // user id
  name?: string;
  picture?: string;
  email?: string;
}

/**
 * Minimal in-memory state store. For production, use Redis or signed state cookie.
 */
const pendingStates = new Map<string, number>();
const STATE_TTL_MS = 5 * 60 * 1000;

function generateState() {
  const s = crypto.randomBytes(16).toString('hex');
  pendingStates.set(s, Date.now() + STATE_TTL_MS);
  return s;
}

function consumeState(s: string) {
  const exp = pendingStates.get(s);
  if (!exp) return false;
  pendingStates.delete(s);
  return exp > Date.now();
}

export function registerLineAuthRoutes(app: FastifyInstance) {
  const CLIENT_ID = process.env.LINE_CHANNEL_ID || process.env.LINE_CLIENT_ID;
  const CLIENT_SECRET = process.env.LINE_CHANNEL_SECRET || process.env.LINE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.LINE_REDIRECT_URI || process.env.PUBLIC_BASE_URL + '/auth/line/callback';
  const FRONTEND_RETURN = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-jwt-secret-change-me';

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    app.log.warn('[line-auth] Missing LINE env vars, LINE login disabled');
    return;
  }
  app.log.info('[line-auth] LINE auth routes enabled');
  app.get('/auth/line/login', async (req, reply) => {
    const state = generateState();
    const scope = 'profile%20openid%20email';
    const nonce = crypto.randomBytes(12).toString('hex');
    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scope}&nonce=${nonce}`;
    reply.redirect(authUrl);
  });
  // New callback only bounces code back to frontend with state (no token exchange here)
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>('/auth/line/callback', async (req, reply) => {
    const { code, state, error } = req.query;
    if (error) return reply.redirect(`${FRONTEND_RETURN}/auth/line/return?error=${encodeURIComponent(error)}`);
    if (!code || !state) return reply.redirect(`${FRONTEND_RETURN}/auth/line/return?error=missing_code_state`);
    // Do not consume state here; consumption happens on /auth/line/exchange to prevent reuse.
    return reply.redirect(`${FRONTEND_RETURN}/auth/line/return?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  });

  // Frontend posts code + state, backend exchanges and returns JWT
  app.post<{ Body: { code: string; state: string } }>('/auth/line/exchange', async (req, reply) => {
    const { code, state } = req.body;
    if (!code || !state) return reply.status(400).send({ message: 'Missing code/state' });
    if (!consumeState(state)) return reply.status(400).send({ message: 'Invalid or expired state' });
    try {
      const body = new URLSearchParams();
      body.set('grant_type', 'authorization_code');
      body.set('code', code);
      body.set('redirect_uri', REDIRECT_URI);
      body.set('client_id', CLIENT_ID);
      body.set('client_secret', CLIENT_SECRET);
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString()
      });
      if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        return reply.status(502).send({ message: 'Failed to exchange token', detail: txt });
      }
      const tokenJson = await tokenRes.json() as LineTokenResponse;
      const [, payloadB64] = tokenJson.id_token.split('.');
      const claims: LineProfileClaims = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
      if (!claims.sub) return reply.status(400).send({ message: 'No sub in id_token' });
      if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });
      const userId = 'line_' + claims.sub;
      const name = claims.name || 'LINE 使用者';
      const avatar = claims.picture || null;
      const email = claims.email || null;
      await app.db.query(`INSERT INTO users (id, line_sub, name, email, avatar_url)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = COALESCE(EXCLUDED.email, users.email), avatar_url = EXCLUDED.avatar_url`,
        [userId, claims.sub, name, email, avatar]);
      // Issue JWT (very basic); payload minimal
      // Issue JWT with short lived exp (2h). Future: add refresh token rotation.
      const now = Math.floor(Date.now()/1000);
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: userId, name, avatar, role: 'user', iat: now, exp: now + 2*60*60 })).toString('base64url');
      const h = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
      const jwt = `${header}.${payload}.${h}`;
      return { token: jwt, user: { id: userId, name, avatar_url: avatar, email } };
    } catch (err: any) {
      app.log.error({ err }, '[line-auth] exchange failed');
      return reply.status(500).send({ message: 'exchange_failed' });
    }
  });

  app.get('/auth/logout', async (_req, reply) => {
    // Client will remove token from localStorage; nothing server-side to invalidate (stateless JWT)
    reply.send({ message: 'ok' });
  });
}
