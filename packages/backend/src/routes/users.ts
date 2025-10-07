import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { makeWeakEtag, ifNoneMatchSatisfied, computeListEtag } from '../lib/etag.js';
import { z } from 'zod';
import { checkResourcePermission } from '../middlewares/AuthMiddleware.js';

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
        const { rows } = await app.db.query('SELECT id, name, email, avatar_url, role, is_blacklisted FROM users WHERE id = $1', [payload.sub]);
        if (rows[0]) {
          (req as any).user = rows[0];
          // 黑名單檢查已移至 index.ts 的全域 preHandler hook
        } else {
          // user disappeared; treat as unauthenticated
        }
      }
    } catch { /* ignore */ }
  });

  app.get('/users', async (req, reply) => {
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // 支援上游的 X-Acting-Role 視角切換機制
    const user = req.user;
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (user?.role || 'guest');

    // 使用備份分支的寬鬆權限系統檢查
    const hasPermission = await checkResourcePermission(app, actingRole, 'users', 'view');
    if (!hasPermission) {
      return reply.status(403).send({ message: 'Forbidden: insufficient permissions to view users' });
    }

    // Parse query params: pagination (offset/limit) + filters
    const QuerySchema = z.object({
      offset: z.coerce.number().int().min(0).optional().default(0),
      limit: z.coerce.number().int().positive().max(100).optional().default(20),
      role: z.enum(['user','grid_manager','admin']).optional(),
      q: z.string().min(1).max(200).optional()
    });
    const parsed = QuerySchema.safeParse((req as any).query || {});
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid query', issues: parsed.error.issues });
    }
    const { offset, limit, role, q } = parsed.data;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    if (q) {
      // match name/email/id loosely
      const like = `%${q}%`;
      conditions.push(`(COALESCE(name,'') ILIKE $${idx} OR COALESCE(email,'') ILIKE $${idx+1} OR COALESCE(id,'') ILIKE $${idx+2})`);
      params.push(like, like, like);
      idx += 3;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await app.db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM users ${where}`, params);
    const total = countRes.rows[0]?.count || 0;
    const dataQuery = `SELECT id, name, email, avatar_url, role, is_blacklisted, created_at, updated_at FROM users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    const dataRes = await app.db.query(dataQuery, [...params, limit, offset]);
    const rows = dataRes.rows as any[];
    const etag = computeListEtag(rows as any, ['id', 'updated_at', 'created_at', 'role']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply
        .code(304)
        .header('ETag', etag)
        .header('Cache-Control', 'private, no-cache')
        .header('Vary', 'Authorization, X-Acting-Role')
        .send();
    }
    // Build JSON-LD response matching requested shape (Hydra context + minimal fields)
    const basePath = '/users';
    const qsBase = new URLSearchParams();
    if (role) qsBase.set('role', role);
    if (q) qsBase.set('q', q);
    const makeHref = (o: number, l: number) => {
      const qp = new URLSearchParams(qsBase as any);
      qp.set('offset', String(Math.max(0, o)));
      qp.set('limit', String(l));
      const query = qp.toString();
      return `${basePath}${query ? `?${query}` : ''}`;
    };
    const prevHref = offset > 0 ? makeHref(Math.max(0, offset - limit), limit) : null;
    const nextHref = (offset + limit) < total ? makeHref(offset + limit, limit) : null;
    const firstHref = makeHref(0, limit);
    const lastOffset = total > 0 ? Math.floor((total - 1) / limit) * limit : 0;
    const lastHref = makeHref(lastOffset, limit);
    const body = {
      '@context': 'https://www.w3.org/ns/hydra/context.jsonld',
      '@type': 'Collection',
      limit,
      member: rows,
      next: nextHref,
      first: firstHref,
      last: lastHref,
      offset,
      previous: prevHref,
      totalItems: total
    } as const;
    return reply
      .header('ETag', etag)
      .header('Cache-Control', 'private, no-cache')
      .header('Vary', 'Authorization, X-Acting-Role')
      .send(body);
  });

  app.get('/me', async (req, reply) => {
    const user = req.user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });

    // 黑名單使用者只回傳最少資訊,避免洩漏個人資料
    if ((user as any).is_blacklisted) {
      // 記錄到 log 以供審計,但不回傳給前端
      req.log.warn({
        event: 'blacklisted_user_access',
        user_id: user.id,
        user_email: (user as any).email,
        user_name: (user as any).name,
        timestamp: new Date().toISOString()
      }, 'Blacklisted user accessed /me endpoint');

      // 只回傳黑名單狀態,不洩漏其他資訊
      const minimalPayload = { is_blacklisted: true };
      const etag = makeWeakEtag(minimalPayload);
      if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
        return reply.code(304).header('ETag', etag).header('Cache-Control', 'private, no-cache').header('Vary', 'Authorization').send();
      }
      return reply
        .header('ETag', etag)
        .header('Cache-Control', 'private, no-cache')
        .header('Vary', 'Authorization')
        .send(minimalPayload);
    }

    // 一般使用者回傳完整資訊
    // Compute weak ETag from stable user fields (as returned by this endpoint)
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: (user as any).avatar_url,
      is_blacklisted: (user as any).is_blacklisted
    };
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

  // Admin-only: update user fields (currently role only)
  const UpdateUserSchema = z.object({
    role: z.enum(['user','grid_manager','admin']).optional()
  });

  app.put('/users/:id', async (req, reply) => {
    if (!req.user) return reply.status(401).send({ message: 'Unauthorized' });

    // 支援上游的 X-Acting-Role 視角切換機制
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    const actingRole = actingRoleHeader === 'user' ? 'user' : (req.user?.role || 'user');

    // 使用備份分支的寬鬆權限系統檢查
    const hasPermission = await checkResourcePermission(app, actingRole, 'users', 'edit');
    if (!hasPermission) {
      return reply.status(403).send({ message: 'Forbidden: insufficient permissions to edit users' });
    }
    const id = (req.params as any)?.id as string;
    if (!id) return reply.status(400).send({ message: 'Missing id' });
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    const data = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];
    const push = (sqlField: string, value: any) => { values.push(value); fields.push(`${sqlField} = $${values.length}`); };
    if (typeof data.role !== 'undefined') push('role', data.role);
    if (fields.length === 0) return reply.status(400).send({ message: 'No fields to update' });

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING id, name, email, avatar_url, role, created_at, updated_at`;
    values.push(id);
    const { rows } = await (app as any).db.query(sql, values);
    if (rows.length === 0) return reply.status(404).send({ message: 'Not found' });
    return rows[0];
  });
}
