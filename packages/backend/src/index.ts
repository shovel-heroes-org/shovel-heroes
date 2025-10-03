import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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

// 🔒 Security: Request size limits and proxy trust for Cloudflare
const app = Fastify({
  logger: true,
  bodyLimit: 1048576,  // 1MB - Prevent memory DoS attacks (OWASP 2025)
  trustProxy: true      // Trust Cloudflare proxy headers for accurate client IP
});

app.get('/healthz', async () => ({ status: 'ok', db: app.hasDecorator('db') ? 'ready' : 'not-ready' }));

await initDb(app);

await app.register(swagger, {
  openapi: {
    info: { title: 'Shovel Heroes Backend', version: '0.1.0' }
  }
});
await app.register(swaggerUI, { routePrefix: '/docs' });

// 🔒 Security: HTTP headers via Helmet (defense-in-depth)
// Note: HSTS/CSP managed by Cloudflare for optimal CDN performance
// Backend Helmet provides additional security headers (X-Frame-Options, X-Content-Type-Options, etc.)
await app.register(helmet, {
  hsts: false,              // Cloudflare handles HSTS
  contentSecurityPolicy: false  // Cloudflare handles CSP
});

// 🔒 Security: Rate limiting delegated to Cloudflare
// Cloudflare provides enterprise-grade rate limiting at edge
// Backend focuses on business logic and maintains high availability for disaster relief

// Dynamic CORS policy based on environment
const isDevelopment = process.env.NODE_ENV !== "production";

const productionOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["https://shovel-heroes.netlify.app"];

const allowedOrigins = isDevelopment
  ? ["http://localhost:5173", "http://localhost:5174"]
  : productionOrigins;

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow non-browser requests or whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      app.log.warn({ origin }, "Blocked by CORS policy");
      cb(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

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
  // Enforce auth for mutating methods
  if (!['POST','PUT','DELETE','PATCH'].includes(req.method)) return;
  const url = req.url.split('?')[0];
  if (PUBLIC_ALLOWLIST.has(url)) return;
  if (!req.user) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }
});

// 🔒 Security: Production error handler - Prevent information leakage (OWASP A05:2021)
app.setErrorHandler((error, request, reply) => {
  // Always log the full error for debugging
  request.log.error(error);

  // In production, hide stack traces and internal details
  if (process.env.NODE_ENV === 'production') {
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.name || 'Error',
      message: statusCode >= 500
        ? 'An error occurred processing your request'
        : error.message || 'Bad Request',
      statusCode
    });
  } else {
    // Development: Show full error details
    reply.send(error);
  }
});

// 404 處理器：防止快取，避免 CDN 快取錯誤頁面 (404 handler: prevent caching)
app.setNotFoundHandler((request, reply) => {
  reply
    .code(404)
    .header('Cache-Control', 'no-store, must-revalidate')
    .send({ message: 'Route not found' });
});

async function start() {
  // 🔒 Security: Enforce secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET === 'dev-secret') {
      app.log.fatal('AUTH_JWT_SECRET required in production');
      process.exit(1);
    }
    if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === 'dev-secret') {
      app.log.fatal('COOKIE_SECRET required in production');
      process.exit(1);
    }
  }

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
