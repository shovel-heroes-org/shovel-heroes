import { FastifyReply, FastifyRequest } from "fastify";
import { AuditLog } from "../types/AuditLog";

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

function onResponse(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const { authorization, cookie, 'set-cookie': setCookie, ...filteredHeaders } = req.headers;

  const logData: AuditLog = {
    user: req.user || null,
    method: req.method,
    path: req.url,
    query: req.query as Record<string, any>,
    ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
    headers: filteredHeaders as Record<string, any>,
    requestBody: req.body
      ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body))
      : null,
    responseBody: reply.locals?.responseBody
      ? (typeof reply.locals.responseBody === "string"
          ? reply.locals.responseBody
          : JSON.stringify(reply.locals.responseBody))
      : null,
    statusCode: reply.statusCode,
    eventTime: new Date().toISOString(),
    durationMs: req.startTime ? Date.now() - req.startTime : 0,
  };

  req.log.info({ audit: logData }, "[AUDIT]");
  done();
}

function onError(req: FastifyRequest, reply: FastifyReply, error: Error, done: () => void) {
  const logData = {
    user: req.user || null,
    method: req.method,
    path: req.url,
    ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
    statusCode: reply.statusCode,
    eventTime: new Date().toISOString(),
    errorMessage: error.message,
    errorStack: error.stack,
  };

  req.log.error({ audit: logData }, "[AUDIT][ERROR]");
  done();
}

export const AuditLogMiddleware = { start, onSend, onResponse, onError };
