import type { FastifyBaseLogger } from 'fastify';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

function getConfig() {
  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  const enabled = Boolean(token);
  const publicBase = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
  return { token, secret, enabled, publicBase };
}

export async function lineReply(logger: FastifyBaseLogger, replyToken: string, messages: any[]) {
  const { token, enabled } = getConfig();
  if (!enabled || !token) {
    logger.warn('[line] reply skipped: missing LINE_MESSAGING_CHANNEL_TOKEN');
    return;
  }
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ status: res.status, text }, '[line] reply failed');
  }
}

export async function linePush(logger: FastifyBaseLogger, toUserId: string, messages: any[]) {
  const { token, enabled } = getConfig();
  if (!enabled || !token) {
    logger.warn('[line] push skipped: missing LINE_MESSAGING_CHANNEL_TOKEN');
    return;
  }
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: toUserId, messages })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ status: res.status, text }, '[line] push failed');
  }
}

export function buildGridLink(gridIdOrCode: string, tab?: 'volunteer'|'supply'|'discussion') {
  const { publicBase } = getConfig();
  const params = new URLSearchParams({ grid: gridIdOrCode });
  if (tab) params.set('tab', tab);
  return `${publicBase}/?${params.toString()}`;
}
