import type { FastifyInstance } from 'fastify';
import { filterVolunteerPrivacy, filterVolunteersPrivacy } from '../lib/privacy-filter.js';
import { computeListEtag, ifNoneMatchSatisfied, makeWeakEtag } from '../lib/etag.js';

interface VolunteerRegistration {
  id: string;
  grid_id: string;
  user_id?: string;
  volunteer_name?: string;
  volunteer_phone?: string | null;
  volunteer_email?: string | null;
  created_by_id?: string;
  status?: string;
  available_time?: string | null;
  skills?: any[];  // 可能包含任何類型的元素
  equipment?: any[];  // 可能包含任何類型的元素
  notes?: string | null;
  created_date?: string;
  [key: string]: any;
}

// NOTE: This endpoint is an aggregate view combining volunteer_registrations + users.
// DB schema currently only stores minimal fields for volunteer_registrations.
// For now we synthesize presentation fields that frontend expects (volunteer_name, volunteer_phone, etc.).
// Future: extend schema to actually persist skills/equipment/available_time/notes or join another table.

interface RawRow {
  id: string;
  grid_id: string;
  user_id: string | null;
  created_by_id: string | null;
  created_at: string;
  volunteer_name: string | null;
  volunteer_phone: string | null;
  volunteer_email: string | null;
  available_time: string | null;
  skills: any;  // jsonb 欄位,可能是 array, object, string 或 null
  equipment: any;  // jsonb 欄位,可能是 array, object, string 或 null
  status: string | null;
  notes: string | null;
  user_name: string | null;
  user_email: string | null;
  grid_creator_id: string | null;
  grid_manager_id: string | null | undefined;  // 可能為 undefined
}

/**
 * Ensures a value is an array. If already an array, returns it.
 * Otherwise returns an empty array.
 */
function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  // Attempt to parse JSON strings that might represent an array
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  // Per spec: if not already an array, return empty array (do NOT wrap single values)
  return [];
}

export function registerVolunteersRoutes(app: FastifyInstance) {
  app.get('/volunteers', async (req: any, reply) => {
    if (!app.hasDecorator('db')) return reply.status(503).send({ message: 'DB not ready' });

    // 從 JWT 解析用戶資訊（可選，不強制要求登入）
    let user = null;
    const authHeader = req.headers.authorization;

    // Debug: 檢查 Authorization header
    app.log.info({ authHeader: authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'undefined' }, 'JWT Auth Debug - Header');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Debug: 檢查 token
      app.log.info({
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) : 'null',
        isNullString: token === 'null',
        isUndefinedString: token === 'undefined'
      }, 'JWT Auth Debug - Token');

      if (token && token !== 'null' && token !== 'undefined') {
        try {
          // 手動驗證 JWT (因為沒有使用 @fastify/jwt plugin)
          const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-jwt-secret-change-me';
          const [headerB64, payloadB64, signature] = token.split('.');

          if (!headerB64 || !payloadB64 || !signature) {
            throw new Error('Invalid JWT format');
          }

          // 驗證簽名
          const crypto = await import('crypto');
          const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url');

          if (signature !== expectedSig) {
            throw new Error('Invalid signature');
          }

          // 解碼 payload
          const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as any;

          // 檢查過期時間
          if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
          }

          // Debug: 檢查 decoded token
          app.log.info({ decoded }, 'JWT Auth Debug - Decoded');

          const { rows } = await app.db.query(
            'SELECT id, name, email, role FROM users WHERE id = $1',
            [decoded.sub]
          );

          // Debug: 檢查資料庫查詢結果
          app.log.info({
            userId: decoded.sub,
            rowsFound: rows.length,
            user: rows[0] || null
          }, 'JWT Auth Debug - DB Query');

          if (rows.length > 0) {
            user = rows[0];
          }
        } catch (error: any) {
          // Token 無效或過期，但不返回錯誤，只是沒有 user
          app.log.info({ error: error?.message || String(error) }, 'JWT Auth Debug - Verification Failed');
        }
      }
    }

    // Debug: 最終的 user 值
    app.log.info({ user: user || null }, 'JWT Auth Debug - Final User');

    // 取得作用中的角色
    const actingRoleHeader = (req.headers['x-acting-role'] || req.headers['X-Acting-Role']) as string | undefined;
    // 優先使用 actingRoleHeader,若未設定則使用 user?.role，若未登入則為 'guest'
    const actingRole = actingRoleHeader || user?.role || 'guest';

    // 實際角色（用於基礎訪問權限檢查）
    const actualRole = user?.role || 'guest';

    // 檢查基礎訪問權限（使用實際角色）
    const { rows: permRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'volunteers'`,
      [actualRole]
    );

    const hasViewPermission = permRows.length > 0 && (permRows[0].can_view === 1 || permRows[0].can_view === true);

    if (!hasViewPermission) {
      return reply.status(403).send({ message: 'Forbidden - No permission to view volunteers' });
    }

    const { rows: contactPermRows } = await app.db.query(
      `SELECT can_view FROM role_permissions WHERE role = $1 AND permission_key = 'view_volunteer_contact'`,
      [actingRole]
    );
    const hasContactViewPermission = contactPermRows.length > 0 && (contactPermRows[0].can_view === 1 || contactPermRows[0].can_view === true || contactPermRows[0].can_view === '1');

    // 取得 volunteer_registrations 的建立、編輯和管理權限
    const { rows: editPermRows } = await app.db.query(
      `SELECT can_create, can_edit, can_manage FROM role_permissions WHERE role = $1 AND permission_key = 'volunteer_registrations'`,
      [actingRole]
    );
    const hasCreatePermission = editPermRows.length > 0 && (editPermRows[0].can_create === 1 || editPermRows[0].can_create === true || editPermRows[0].can_create === '1');
    const hasEditPermission = editPermRows.length > 0 && (editPermRows[0].can_edit === 1 || editPermRows[0].can_edit === true || editPermRows[0].can_edit === '1');
    const hasManagePermission = editPermRows.length > 0 && (editPermRows[0].can_manage === 1 || editPermRows[0].can_manage === true || editPermRows[0].can_manage === '1');

    // Debug log
    app.log.info({
      actingRole,
      contactPermRows,
      hasContactViewPermission,
      can_view_value: contactPermRows[0]?.can_view,
      can_view_type: typeof contactPermRows[0]?.can_view
    }, 'Contact permission check');

    const { grid_id, status, limit = 200, offset = 0, include_counts = 'true' } = req.query as any;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    if (grid_id) {
      conditions.push(`vr.grid_id = $${paramIndex++}`);
      params.push(grid_id);
    }
    if (status) {
      conditions.push(`vr.status = $${paramIndex++}`);
      params.push(status);
    }

    // 所有登入用戶都可以查看全部志工報名資料
    // 不再限制資料範圍，只要有 volunteers 的 can_view 權限即可
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        vr.id, vr.grid_id, vr.user_id, vr.created_at, vr.created_by_id,
        COALESCE(vr.volunteer_name, u.name) AS volunteer_name,
        vr.volunteer_phone, vr.volunteer_email, vr.available_time,
        vr.skills, vr.equipment, vr.status, vr.notes,
        u.name as user_name, u.email as user_email,
        g.created_by_id as grid_creator_id,
        g.grid_manager_id as grid_manager_id
      FROM volunteer_registrations vr
      LEFT JOIN users u ON u.id = vr.user_id
      LEFT JOIN grids g ON g.id = vr.grid_id
      ${where}
      ORDER BY vr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(Number(limit), Number(offset));

  const { rows } = await app.db.query(sql, params) as { rows: RawRow[] };

    // Debug: 檢查從資料庫取得的原始資料
    app.log.info({
      totalRows: rows.length,
      firstRow: rows[0] ? {
        id: rows[0].id,
        volunteer_name: rows[0].volunteer_name,
        volunteer_phone: rows[0].volunteer_phone,
        hasPhone: !!rows[0].volunteer_phone
      } : null,
      user: user ? { id: user.id, role: user.role } : null,
      actingRole,
      hasContactViewPermission
    }, 'Raw data from database');

    // 使用與物資管理相同的隱私過濾邏輯
    // 根據每個志工報名所屬的網格來過濾隱私資訊
    const data = rows.map(r => {
      // 基礎資料（包含隱私資訊，待過濾）
      const registration: VolunteerRegistration = {
        id: r.id,
        grid_id: r.grid_id,
        user_id: r.user_id || undefined,
        volunteer_name: r.volunteer_name || r.user_name || '匿名志工',
        volunteer_phone: r.volunteer_phone || undefined,  // 使用 undefined 而不是 null
        volunteer_email: r.volunteer_email || undefined,  // 使用 undefined 而不是 null
        created_by_id: r.created_by_id || undefined,
        status: r.status || 'pending',
        available_time: r.available_time,
        skills: ensureArray(r.skills),
        equipment: ensureArray(r.equipment),
        notes: r.notes,
        created_date: r.created_at
      };

      // Debug: 檢查原始資料
      if (r.volunteer_phone) {
        app.log.info({
          id: r.id,
          volunteer_name: r.volunteer_name,
          volunteer_phone: r.volunteer_phone,
          user_id: r.user_id,
          created_by_id: r.created_by_id,
          currentUser: user?.id,
          actingRole,
          grid_creator_id: r.grid_creator_id,
          hasContactViewPermission,
          isVolunteerSelf: (r.user_id && r.user_id === user?.id) || (r.created_by_id && r.created_by_id === user?.id),
          isGridCreator: r.grid_creator_id && r.grid_creator_id === user?.id
        }, 'Before privacy filter');
      }

      // 使用隱私過濾器處理電話和電子郵件的顯示
      const filtered = filterVolunteerPrivacy(
        registration,
        user || null,
        r.grid_creator_id || undefined,
        {
          gridManagerId: r.grid_manager_id,
          actingRole,
          userActualRole: user?.role,  // 傳遞實際角色
          canViewContact: hasContactViewPermission,
        }
      );

      // Debug: 檢查過濾後的資料
      if (r.volunteer_phone) {
        app.log.info({
          id: filtered.id,
          volunteer_phone: filtered.volunteer_phone,
          hasPhone: !!filtered.volunteer_phone,
          user: user?.id,
          role: actingRole
        }, 'After privacy filter');
      }

      return filtered;
    });

  let status_counts: any = undefined;
    if (include_counts !== 'false') {
      // Aggregate counts by status dynamically
      const counts: Record<string, number> = {};
      for (const d of data) {
        counts[d.status] = (counts[d.status] || 0) + 1;
      }
      status_counts = {
        pending: 0,
        confirmed: 0,
        arrived: 0,
        completed: 0,
        cancelled: 0,
        ...counts
      };
    }

    // total (without pagination) - if full dataset small we can reuse data length else run count(*).
    // Simplicity: run a COUNT(*) query with same filters.
    const countSql = `SELECT COUNT(*)::int AS c FROM volunteer_registrations vr ${where}`;
    const { rows: countRows } = await app.db.query(countSql, params.slice(0, params.length - 2));
    const total = countRows[0]?.c ?? data.length;

    // can_view_phone 表示當前使用者是否可以看到電話
    // 權限規則（必須同時滿足）：
    // 1. 有 view_volunteer_contact 權限
    // 2. 高權限角色（super_admin/admin/grid_manager，實際或視角任一） + 是網格建立者
    //    OR 一般使用者/訪客只能看自己的
    // 注意：前端會根據實際資料來判斷，這裡只要有權限即可
    const canViewPhones = hasContactViewPermission;

    return {
      data,
      can_view_phone: canViewPhones,
      can_create: hasCreatePermission,  // 建立報名的權限
      can_edit: hasEditPermission,      // 編輯自己報名的權限
      can_manage: hasManagePermission,  // 編輯別人報名的權限
      user_id: user?.id || null,  // 前端需要知道當前用戶 ID 來判斷 isSelf
      total,
      status_counts,
      limit: Number(limit),
      page: Math.floor(Number(offset) / Number(limit)) + 1
    };
  });
}
