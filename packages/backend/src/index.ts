console.log('[1/10] Starting backend application...');
console.log('NODE_VERSION:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

console.log('[2/10] Loading dependencies...');
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import cookie from '@fastify/cookie';

console.log('[3/10] Loading route modules...');
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
import { createAuditLogMiddleware } from "./middlewares/AuditLogMiddleware.js";

console.log('[4/10] Creating Fastify instance...');
const app = Fastify({ logger: true });

console.log('[5/10] Registering healthz endpoint...');
app.get('/healthz', async () => ({ status: 'ok', db: app.hasDecorator('db') ? 'ready' : 'not-ready' }));

console.log('[6/10] Initializing database connection...');
try {
  await initDb(app);
  console.log('[6/10] Database initialized successfully');
} catch (err) {
  console.error('[ERROR] Failed to initialize database:', err);
  process.exit(1);
}

console.log('[7/10] Registering plugins...');
await app.register(swagger, {
  openapi: {
    info: { title: 'Shovel Heroes Backend', version: '0.1.0' }
  }
});
await app.register(swaggerUI, { routePrefix: '/docs' });
await app.register(cors, { origin: true, credentials: true });
await app.register(cookie, { secret: process.env.COOKIE_SECRET || 'dev-secret' });
console.log('[7/10] Plugins registered successfully');

console.log('[8/10] Registering routes...');
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
// LINE webhook
import { registerLineWebhookRoutes } from './routes/line-webhook.js';
registerLineWebhookRoutes(app);

// Global auth enforcement for all POST endpoints except a small allowlist.
// Assumes user injection happens in registerUserRoutes preHandler (JWT verification).
const PUBLIC_ALLOWLIST = new Set([
  '/auth/line/exchange', // need to obtain token (POST)
  '/auth/line/login',    // GET redirect
  '/auth/logout',        // GET logout
  '/healthz',            // health check
  '/line/webhook'        // LINE webhook callback
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


console.log('[9/10] Setting up middleware hooks...');
const AuditLogMiddleware = createAuditLogMiddleware(app);
app.addHook("onRequest", AuditLogMiddleware.start);
app.addHook("onSend", AuditLogMiddleware.onSend);
app.addHook("onResponse", AuditLogMiddleware.onResponse);
app.addHook("onError", AuditLogMiddleware.onError);
console.log('[9/10] Middleware hooks registered');

async function start() {
  console.log('[10/10] Starting server...');
  const basePort = Number(process.env.PORT) || 8787;
  let port = basePort;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      console.log(`Attempting to listen on port ${port}...`);
      await app.listen({ port, host: '0.0.0.0' });
      console.log(`✓ Server successfully started on port ${port}`);
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

start().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
