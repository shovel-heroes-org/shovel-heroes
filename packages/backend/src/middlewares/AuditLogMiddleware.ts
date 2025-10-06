import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import type { AuditLog } from "../modules/audit-logs/audit-log.types.js";
import { AuditLogService } from "../modules/audit-logs/audit-log.service.js";

export function createAuditLogMiddleware(app: FastifyInstance) {
  const service = new AuditLogService(app.db.pool);

  function start(req: FastifyRequest, _: FastifyReply, done: () => void) {
    req.startTime = Date.now();
    done();
  }

  function onSend(
    req: FastifyRequest,
    reply: FastifyReply,
    payload: any,
    done: (err: Error | null, value?: any) => void
  ) {
    reply.locals = { responseBody: payload };
    done(null, payload);
  }

  async function onResponse(req: FastifyRequest, reply: FastifyReply) {
    if (reply.statusCode >= 400) return;
    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    const logData: AuditLog = {
      userId: (req.user as any)?.id || null,
      method: req.method,
      path: req.url,
      query: req.query as Record<string, any>,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders as Record<string, any>,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode,
      createdAt: new Date().toISOString(),
      durationMs: req.startTime ? Date.now() - req.startTime : 0,
    };

    try {
      await service.save(logData);
    } catch (err) {
      req.log.error({ err }, "[AUDIT][SAVE_FAILED]");
    }
  }

  async function onError(req: FastifyRequest, reply: FastifyReply, error: Error) {
    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    const logData: AuditLog = {
      userId: (req.user as any)?.id || null,
      method: req.method,
      path: req.url,
      query: req.query as Record<string, any>,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders as Record<string, any>,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode || 500,
      createdAt: new Date().toISOString(),
      durationMs: req.startTime ? Date.now() - req.startTime : 0,
      error: error.message,
    };

    try {
      await service.save(logData);
    } catch (err) {
      req.log.error({ err }, "[AUDIT][ERROR_SAVE_FAILED]");
    }
  }

  return { start, onSend, onResponse, onError };
}
