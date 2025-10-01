import type { FastifyInstance } from 'fastify';
import { listDisasterAreas, createDisasterArea, getDisasterArea, updateDisasterArea, deleteDisasterArea } from '../modules/disaster-areas/repo.js';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180)
});

const UpdateSchema = CreateSchema.partial();

export function registerDisasterAreaRoutes(app: FastifyInstance) {
  app.get('/disaster-areas', async () => {
    return listDisasterAreas(app);
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
    return da;
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