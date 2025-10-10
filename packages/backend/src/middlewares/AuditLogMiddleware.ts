/**
 * HTTP 請求審計日誌中介軟體
 * 自動記錄所有 API 請求和回應，用於技術除錯和效能分析
 */

import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";

export function createAuditLogMiddleware(app: FastifyInstance) {
  /**
   * 儲存審計日誌到資料庫
   */
  async function saveAuditLog(logData: {
    userId: string | null;
    method: string;
    path: string;
    query: any;
    ip: string;
    headers: any;
    statusCode: number;
    error?: string;
    durationMs: number;
    requestBody?: any;
    responseBody?: any;
  }) {
    // 檢查資料庫是否可用
    if (!app.hasDecorator('db')) {
      return;
    }

    try {
      await app.db.query(
        `INSERT INTO audit_logs (
          method, path, query, ip, headers, status_code, error,
          duration_ms, request_body, response_body, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          logData.method,
          logData.path,
          logData.query ? JSON.stringify(logData.query) : null,
          logData.ip,
          logData.headers ? JSON.stringify(logData.headers) : null,
          logData.statusCode,
          logData.error || null,
          logData.durationMs,
          logData.requestBody ? JSON.stringify(logData.requestBody) : null,
          logData.responseBody ? JSON.stringify(logData.responseBody) : null,
          logData.userId
        ]
      );
    } catch (err) {
      // 不影響主要業務邏輯，只記錄錯誤
      app.log.error({ err }, "[AUDIT][HTTP] Failed to save audit log");
    }
  }

  /**
   * 請求開始時記錄時間
   */
  function start(req: FastifyRequest, _: FastifyReply, done: () => void) {
    (req as any).startTime = Date.now();
    done();
  }

  /**
   * 在回應發送時捕獲 response body
   */
  function onSend(
    req: FastifyRequest,
    reply: FastifyReply,
    payload: any,
    done: (err: Error | null, value?: any) => void
  ) {
    // 儲存 response body 供 onResponse 使用
    if (!reply.locals) {
      reply.locals = {};
    }
    reply.locals.responseBody = payload;
    done(null, payload);
  }

  /**
   * 請求完成時記錄（包含成功和錯誤狀態）
   */
  async function onResponse(req: FastifyRequest, reply: FastifyReply) {
    // 過濾敏感的 headers
    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    const startTime = (req as any).startTime;
    const durationMs = startTime ? Date.now() - startTime : 0;

    // 檢查是否為錯誤回應
    const isError = reply.statusCode >= 400;
    let errorMessage = null;

    // 嘗試從 response body 提取錯誤訊息
    if (isError && reply.locals?.responseBody) {
      try {
        const body = typeof reply.locals.responseBody === 'string'
          ? JSON.parse(reply.locals.responseBody)
          : reply.locals.responseBody;
        errorMessage = body.message || body.error || `HTTP ${reply.statusCode}`;
      } catch {
        errorMessage = `HTTP ${reply.statusCode}`;
      }
    }

    await saveAuditLog({
      userId: (req as any).user?.id || null,
      method: req.method,
      path: req.url,
      query: req.query,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode,
      durationMs,
      error: errorMessage,
    });
  }

  /**
   * 請求發生錯誤時記錄
   */
  async function onError(req: FastifyRequest, reply: FastifyReply, error: Error) {
    // 過濾敏感的 headers
    const { authorization, cookie, "set-cookie": setCookie, ...filteredHeaders } = req.headers;

    const startTime = (req as any).startTime;
    const durationMs = startTime ? Date.now() - startTime : 0;

    await saveAuditLog({
      userId: (req as any).user?.id || null,
      method: req.method,
      path: req.url,
      query: req.query,
      ip: (req.headers["cf-connecting-ip"] as string) || req.ip,
      headers: filteredHeaders,
      requestBody: req.body ?? null,
      responseBody: reply.locals?.responseBody ?? null,
      statusCode: reply.statusCode || 500,
      durationMs,
      error: error.message,
    });
  }

  return { start, onSend, onResponse, onError };
}
