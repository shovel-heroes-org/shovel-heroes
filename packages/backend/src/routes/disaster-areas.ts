import type { FastifyInstance } from 'fastify';
import { listDisasterAreas, createDisasterArea, getDisasterArea, updateDisasterArea, deleteDisasterArea } from '../modules/disaster-areas/repo.js';
import { z } from 'zod';
import { computeListEtag, ifNoneMatchSatisfied, makeWeakEtag } from '../lib/etag.js';

const BoundsSchema = z.object({ north: z.number(), south: z.number(), east: z.number(), west: z.number() });
const CreateSchema = z.object({
  name: z.string().min(1),
  township: z.string().optional(),
  county: z.string().optional(),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  bounds: BoundsSchema.optional(),
  grid_size: z.number().int().positive().optional(),
  status: z.string().optional(),
  description: z.string().optional()
});

const UpdateSchema = CreateSchema.partial();

export function registerDisasterAreaRoutes(app: FastifyInstance) {
  app.get('/disaster-areas', async (req, reply) => {
    const list = await listDisasterAreas(app);
    const etag = computeListEtag(list as any[], ['id', 'updated_at', 'created_at', 'status', 'name']);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).header('Cache-Control', 'public, no-cache').send();
    }
    return reply.header('ETag', etag).header('Cache-Control', 'public, no-cache').send(list);
  });

  app.post('/disaster-areas', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }
    const created = await createDisasterArea(app, parsed.data);
    return reply.status(201).send(created);
  });

  app.get('/disaster-areas/:id', async (req, reply) => {
    const { id } = req.params as any;
    const da = await getDisasterArea(app, id);
    if (!da) return reply.status(404).send({ message: 'Not found' });
    const etag = makeWeakEtag(da);
    if (ifNoneMatchSatisfied(req.headers['if-none-match'] as string | undefined, etag)) {
      return reply.code(304).header('ETag', etag).header('Cache-Control', 'public, no-cache').send();
    }
    return reply.header('ETag', etag).header('Cache-Control', 'public, no-cache').send(da);
  });

  app.put('/disaster-areas/:id', async (req, reply) => {
    const { id } = req.params as any;
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const updated = await updateDisasterArea(app, id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Not found' });
    return updated;
  });

  app.delete('/disaster-areas/:id', async (req, reply) => {
    const { id } = req.params as any;
    const ok = await deleteDisasterArea(app, id);
    if (!ok) return reply.status(404).send({ message: 'Not found' });
    return reply.status(204).send();
  });
}