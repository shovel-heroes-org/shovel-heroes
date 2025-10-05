import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { makeWeakEtag, ifNoneMatchSatisfied, computeListEtag } from '../lib/etag';

export function registerUserRoutes(app: FastifyInstance) {
  // Simple auth stub: if Authorization provided, set a fake user id (or from header)
  const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-jwt-secret-change-me';
  app.addHook('preHandler', async (req) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return;
    const token = auth.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length !== 3) return;
    const [headerB64, payloadB64, sig] = parts;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (expected !== sig) return; // invalid signature
    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!payload.sub) return;
      if (payload.exp && Date.now()/1000 > payload.exp) {
        return; // expired
      }
      // Optionally fetch user details from DB
      if (app.hasDecorator('db')) {
        const { rows } = await app.db.query('SELECT id, name, email, avatar_url, role FROM users WHERE id = $1', [payload.sub]);
        if (rows[0]) {
          (req as any).user = rows[0];
        } else {
          // user disappeared; treat as unauthenticated
        }
      }
    } catch { /* ignore */ }
  });

  app.get('/users', async (req, reply) => {
    // Require authenticated real admin and acting role not 'user'
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');
    const isRealAdmin = req.user?.role === 'admin';
    if (actingRole === 'user' || !isRealAdmin) {
      return reply.status(403).send({ message: 'Forbidden: admin only' });
    }
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM users ORDER BY created_at DESC');
    const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at', 'role']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization, X-Acting-Role').send();
    }
    return reply
      .header('ETag', etag)
      .header('Cache-Control', 'private, no-cache')
      .header('Vary', 'Authorization, X-Acting-Role')
      .send(rows);
  });

  app.get('/me', async (req, reply) => {
    const user = req.user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });
    // Compute weak ETag from stable user fields (as returned by this endpoint)
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: (user as any).avatar_url };
    const etag = makeWeakEtag(payload);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization').send();
    }
    return reply
      .header('ETag', etag)
      .header('Cache-Control', 'private, no-cache')
      .header('Vary', 'Authorization')
      .send(user);
  });
}