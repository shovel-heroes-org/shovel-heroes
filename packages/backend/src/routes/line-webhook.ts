import type { FastifyInstance } from 'fastify';
import { lineReply, buildGridLink } from '../lib/line-messaging.js';

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

export function registerLineWebhookRoutes(app: FastifyInstance) {
  const enabled = Boolean(process.env.LINE_MESSAGING_CHANNEL_TOKEN);
  if (!enabled) {
    app.log.warn('[line-webhook] disabled: missing LINE_MESSAGING_CHANNEL_TOKEN');
  }

  app.post('/line/webhook', async (req, reply) => {
    const body = (req.body as any) || {};
    const events: LineEvent[] = body.events || [];
    for (const ev of events) {
      try {
        if (ev.type === 'message' && ev.message?.type === 'text' && ev.replyToken) {
          const text = (ev.message.text || '').trim();
          // very lightweight intent: if text contains '缺' or '人' 回覆急件連結；否則回首頁
          let messages;
          if (/缺|人力|志工/.test(text)) {
            try {
              // Query top 3 urgent manpower grids
              const { rows } = await app.db.query(
                `SELECT id, code, volunteer_needed, volunteer_registered
                 FROM grids
                 WHERE grid_type='manpower' AND status='open' AND volunteer_needed > COALESCE(volunteer_registered,0)
                 ORDER BY (volunteer_needed - COALESCE(volunteer_registered,0)) DESC
                 LIMIT 3`
              );
              if (rows.length > 0) {
                const lines = rows.map((g: any, i: number) => `${i+1}. ${g.code || g.id} 還缺 ${g.volunteer_needed - (g.volunteer_registered || 0)} 人\n${buildGridLink(g.id, 'volunteer')}`);
                messages = [{ type: 'text', text: `目前缺人任務：\n${lines.join('\n\n')}` }];
              } else {
                const link = `${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/?type=manpower`;
                messages = [{ type: 'text', text: `目前沒有急缺名單，清單：\n${link}` }];
              }
            } catch (err) {
              const link = `${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/?type=manpower`;
              messages = [{ type: 'text', text: `目前志工需求看這裡：\n${link}` }];
            }
          } else {
            const link = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
            messages = [{ type: 'text', text: `Shovel-Heroes 網站：\n${link}` }];
          }
          await lineReply(app.log, ev.replyToken, messages);
        }
      } catch (err) {
        app.log.error({ err }, '[line-webhook] handle event failed');
      }
    }
    return reply.send({ ok: true });
  });
}
