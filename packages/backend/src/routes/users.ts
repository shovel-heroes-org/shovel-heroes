import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../lib/auth.js';

export function registerUserRoutes(app: FastifyInstance) {
  // Protected: Listing users requires authentication
  app.get('/users', { preHandler: requireAuth }, async () => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
  });

  // Protected: Getting current user info requires authentication
  app.get('/me', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const user = req.user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });
    
    // Ensure user exists in DB for demo
    if (app.hasDecorator('db')) {
      await app.db.query('INSERT INTO users (id, name, email) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', [user.id, user.name, user.email]);
    }
    return user;
  });
}