import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { registerDisasterAreaRoutes } from "./routes/disaster-areas.js";
import { registerGridRoutes } from "./routes/grids.js";
import { registerVolunteerRegistrationRoutes } from "./routes/volunteer-registrations.js";
import { registerSupplyDonationRoutes } from "./routes/supply-donations.js";
import { registerGridDiscussionRoutes } from "./routes/grid-discussions.js";
import { registerAnnouncementRoutes } from "./routes/announcements.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerFunctionRoutes } from "./routes/functions.js";
import { registerLegacyRoutes } from "./routes/legacy.js";
import { registerVolunteersRoutes } from "./routes/volunteers.js";
import { initDb } from "./lib/db-init.js";

const app = Fastify({ logger: true });

app.get("/healthz", async () => ({
  status: "ok",
  db: app.hasDecorator("db") ? "ready" : "not-ready",
}));

await initDb(app);

await app.register(swagger, {
  openapi: {
    info: { title: "Shovel Heroes Backend", version: "0.1.0" },
  },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

// 安全中介軟體配置 (Security middleware configuration)
await app.register(helmet, {
  // 保持與前端 CSP 一致 (Keep consistent with frontend CSP)
  contentSecurityPolicy: false, // 前端已有 CSP，避免衝突 (Frontend has CSP, avoid conflict)
  hsts: {
    maxAge: 31536000, // 1 年 (1 year)
    includeSubDomains: true,
    preload: true,
  },
});

// 頻率限制：災難救援系統需要平衡可用性與安全性 (Rate limiting: balance availability and security for disaster relief)
await app.register(rateLimit, {
  max: 100, // 每分鐘 100 次請求 (100 requests per minute)
  timeWindow: "1 minute",
  // 對救援相關端點較寬鬆 (More lenient for rescue-related endpoints)
  allowList: ["127.0.0.1"], // 本地測試不限制 (No limit for local testing)
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
  errorResponseBuilder: (request, context) => ({
    error: "Too Many Requests",
    message:
      "請求過於頻繁，請稍後再試 (Too many requests, please try again later)",
    statusCode: 429,
    retryAfter: Math.round(context.ttl / 1000),
  }),
});

await app.register(cors, { origin: true });

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

// 404 處理器：防止快取，避免 CDN 快取錯誤頁面 (404 handler: prevent caching)
app.setNotFoundHandler((request, reply) => {
  reply
    .code(404)
    .header("Cache-Control", "no-store, must-revalidate")
    .send({ message: "Route not found" });
});

async function start() {
  const basePort = Number(process.env.PORT) || 8787;
  let port = basePort;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await app.listen({ port, host: "0.0.0.0" });
      if (port !== basePort) {
        app.log.warn(
          `Started on fallback port ${port} (base ${basePort} was busy)`
        );
      }
      return;
    } catch (err: any) {
      if (err && err.code === "EADDRINUSE") {
        app.log.warn(`Port ${port} in use, trying ${port + 1}`);
        port++;
        continue;
      }
      app.log.error(err, "Failed to start server");
      process.exit(1);
    }
  }
  app.log.error("Exhausted port attempts");
  process.exit(1);
}

start();
