import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export function registerUserRoutes(app: FastifyInstance) {
  // Simple auth stub: if Authorization provided, set a fake user id (or from header)
  app.addHook('preHandler', async (req) => {
    const auth = req.headers['authorization'];
    if (auth) {
      (req as any).user = { id: 'user-demo', name: 'Demo User', email: 'demo@example.org' };
    }
  });

  app.get('/users', async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
  });

  app.get('/me', async (req, reply) => {
    const user = (req as any).user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });
    // ensure it exists in DB for demo
    if (app.hasDecorator('db')) {
      await app.db.query('INSERT INTO users (id, name, email) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', [user.id, user.name, user.email]);
    }
    return user;
  });
}