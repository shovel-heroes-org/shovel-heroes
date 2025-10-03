import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import cookie from '@fastify/cookie';

import { registerDisasterAreaRoutes } from './routes/disaster-areas.js';
import { registerGridRoutes } from './routes/grids.js';
import { registerVolunteerRegistrationRoutes } from './routes/volunteer-registrations.js';
import { registerSupplyDonationRoutes } from './routes/supply-donations.js';
import { registerGridDiscussionRoutes } from './routes/grid-discussions.js';
import { registerAnnouncementRoutes } from './routes/announcements.js';
import { registerUserRoutes } from './routes/users.js';
import { registerFunctionRoutes } from './routes/functions.js';
import { registerLegacyRoutes } from './routes/legacy.js';
import { registerVolunteersRoutes } from './routes/volunteers.js';
import { initDb } from './lib/db-init.js';
import { AuditLogMiddleware } from "./middlewares/AuditLogMiddleware";

const app = Fastify({ logger: true });

app.get('/healthz', async () => ({ status: 'ok', db: app.hasDecorator('db') ? 'ready' : 'not-ready' }));

await initDb(app);

await app.register(swagger, {
  openapi: {
    info: { title: 'Shovel Heroes Backend', version: '0.1.0' }
  }
});
await app.register(swaggerUI, { routePrefix: '/docs' });
await app.register(cors, { origin: true, credentials: true });
await app.register(cookie, { secret: process.env.COOKIE_SECRET || 'dev-secret' });

registerDisasterAreaRoutes(app);
registerGridRoutes(app);
registerVolunteerRegistrationRoutes(app);
registerVolunteersRoutes(app);
registerSupplyDonationRoutes(app);
registerGridDiscussionRoutes(app);
registerAnnouncementRoutes(app);
registerUserRoutes(app);
registerFunctionRoutes(app);
registerLegacyRoutes(app);
// Auth routes (LINE)
import { registerLineAuthRoutes } from './routes/auth-line.js';
registerLineAuthRoutes(app);

// Global auth enforcement for all POST endpoints except a small allowlist.
// Assumes user injection happens in registerUserRoutes preHandler (JWT verification).
const PUBLIC_ALLOWLIST = new Set([
  '/auth/line/exchange', // need to obtain token (POST)
  '/auth/line/login',    // GET redirect
  '/auth/logout',        // GET logout
  '/healthz'             // health check
]);

app.addHook('preHandler', async (req, reply) => {
  // Enforce auth for mutating methods; optionally could extend to GET later.
  if (!['POST','PUT','DELETE'].includes(req.method)) return;
  const url = req.url.split('?')[0];
  if (PUBLIC_ALLOWLIST.has(url)) return; // skip enforcement for explicitly public endpoints
  if (!req.user) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }
});

app.addHook("onRequest", AuditLogMiddleware.start);
app.addHook("onSend", AuditLogMiddleware.onSend);
app.addHook("onResponse", AuditLogMiddleware.onResponse);
app.addHook("onError", AuditLogMiddleware.onError);

async function start() {
  const basePort = Number(process.env.PORT) || 8787;
  let port = basePort;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await app.listen({ port, host: '0.0.0.0' });
      if (port !== basePort) {
        app.log.warn(`Started on fallback port ${port} (base ${basePort} was busy)`);
      }
      return;
    } catch (err: any) {
      if (err && err.code === 'EADDRINUSE') {
        app.log.warn(`Port ${port} in use, trying ${port + 1}`);
        port++;
        continue;
      }
      app.log.error(err, 'Failed to start server');
      process.exit(1);
    }
  }
  app.log.error('Exhausted port attempts');
  process.exit(1);
}

start();
