import type { FastifyInstance } from 'fastify';

export function registerLegacyRoutes(app: FastifyInstance) {
  app.post('/api/v2/sync', async () => ({ started: true, ts: Date.now() }));
  app.get('/api/v2/roster', async () => ({ roster: [] }));
}