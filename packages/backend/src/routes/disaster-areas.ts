import type { FastifyInstance } from 'fastify';
import { listDisasterAreas, createDisasterArea, getDisasterArea, updateDisasterArea, deleteDisasterArea } from '../modules/disaster-areas/repo.js';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../lib/auth.js';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180)
});

const UpdateSchema = CreateSchema.partial();

export function registerDisasterAreaRoutes(app: FastifyInstance) {
  // Public read access
  app.get('/disaster-areas', { preHandler: optionalAuth }, async () => {
    return listDisasterAreas(app);
  });

  // Require auth for write operations
  app.post('/disaster-areas', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }
    const created = await createDisasterArea(app, parsed.data);
    return reply.status(201).send(created);
  });

  // Public read access for individual disaster area
  app.get('/disaster-areas/:id', { preHandler: optionalAuth }, async (req, reply) => {
    const { id } = req.params as any;
    const da = await getDisasterArea(app, id);
    if (!da) return reply.status(404).send({ message: 'Not found' });
    return da;
  });

  app.put('/disaster-areas/:id', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const { id } = req.params as any;
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const updated = await updateDisasterArea(app, id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Not found' });
    return updated;
  });

  app.delete('/disaster-areas/:id', { preHandler: requireAuth }, async (req: AuthenticatedRequest, reply) => {
    const { id } = req.params as any;
    const ok = await deleteDisasterArea(app, id);
    if (!ok) return reply.status(404).send({ message: 'Not found' });
    return reply.status(204).send();
  });
}