import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../middlewares/PermissionMiddleware.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createAdminAuditLog } from '../lib/audit-logger.js';

/**
 * 格式化日期時間為可讀格式 (YYYY-MM-DD HH:MM:SS)
 * @param date - Date 物件或時間戳
 * @returns 格式化的日期時間字串，如果無效則返回空字串
 */
function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
}

export function registerCSVRoutes(app: FastifyInstance) {
  // Export grids to CSV
  app.get('/csv/export/grids', { preHandler: requirePermission('grids', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          g.id, g.code, g.grid_type, g.volunteer_needed, g.volunteer_registered,
          g.meeting_point, g.risks_notes, g.contact_info, g.status,
          g.center_lat, g.center_lng, g.created_at,
          da.name as area_name
        FROM grids g
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        WHERE g.status != 'deleted'
        ORDER BY g.created_at DESC`
      );

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          code: '網格代碼',
          grid_type: '類型',
          area_name: '災區',
          volunteer_needed: '需求人數',
          volunteer_registered: '已登記人數',
          meeting_point: '集合點',
          risks_notes: '風險備註',
          contact_info: '聯絡資訊',
          status: '狀態',
          center_lat: '緯度',
          center_lng: '經度',
          created_at: '建立時間'
        }
      });

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id,
        line_name: req.user?.name,
        action: `匯出 ${rows.length} 筆網格資料為 CSV`,
        action_type: 'export',
        resource_type: 'grid',
        details: { count: rows.length },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      // 添加 UTF-8 BOM 以確保 Excel 正確識別編碼
      const csvWithBOM = '\uFEFF' + csv;

      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="grids_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export grids');
      return reply.status(500).send({ message: 'Failed to export grids' });
    }
  });

  // Export CSV template for import
  app.get('/csv/template/grids', { preHandler: requirePermission('grids', 'manage') }, async (req, reply) => {
    const template = stringify([{
      code: 'A1',
      grid_type: 'residential',
      disaster_area_name: '花蓮市區',
      volunteer_needed: 10,
      meeting_point: '花蓮火車站',
      risks_notes: '可能有瓦礫',
      contact_info: '0912345678',
      center_lat: 23.9871,
      center_lng: 121.6011
    }], {
      header: true,
      columns: {
        code: '網格代碼（必填）',
        grid_type: '類型（必填：residential/commercial/industrial）',
        disaster_area_name: '災區名稱（必填）',
        volunteer_needed: '需求人數',
        meeting_point: '集合點',
        risks_notes: '風險備註',
        contact_info: '聯絡資訊',
        center_lat: '緯度（必填）',
        center_lng: '經度（必填）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="grids_template.csv"');
    return templateWithBOM;
  });

  // Import grids from CSV
  app.post('/csv/import/grids', { preHandler: requirePermission('grids', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        // Validate required fields
        if (!record['網格代碼（必填）'] || !record['災區名稱（必填）'] ||
            !record['緯度（必填）'] || !record['經度（必填）']) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        const code = record['網格代碼（必填）'];
        const gridType = record['類型（必填：residential/commercial/industrial）'] || 'residential';
        const areaName = record['災區名稱（必填）'];
        const volunteerNeeded = parseInt(record['需求人數'] || '0');
        const meetingPoint = record['集合點'] || '';
        const risksNotes = record['風險備註'] || '';
        const contactInfo = record['聯絡資訊'] || '';
        const centerLat = parseFloat(record['緯度（必填）']);
        const centerLng = parseFloat(record['經度（必填）']);

        // Check if grid code exists
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM grids WHERE code = $1',
            [code]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // Find or create disaster area
        let areaId: string;
        const { rows: areas } = await app.db.query(
          'SELECT id FROM disaster_areas WHERE name = $1',
          [areaName]
        );

        if (areas.length > 0) {
          areaId = areas[0].id;
        } else {
          // Create new disaster area
          const newAreaId = `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await app.db.query(
            `INSERT INTO disaster_areas (id, name, center_lat, center_lng, status)
             VALUES ($1, $2, $3, $4, 'active')`,
            [newAreaId, areaName, centerLat, centerLng]
          );
          areaId = newAreaId;
        }

        // Create grid
        const gridId = `grid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO grids (
            id, code, grid_type, disaster_area_id, volunteer_needed,
            meeting_point, risks_notes, contact_info, center_lat, center_lng,
            status, created_by_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            gridId, code, gridType, areaId, volunteerNeeded,
            meetingPoint, risksNotes, contactInfo, centerLat, centerLng,
            'open', req.user?.id, req.user?.name || 'CSV Import'
          ]
        );

        imported++;
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id,
        line_name: req.user?.name,
        action: `匯入 ${imported} 筆網格資料（略過 ${skipped} 筆）`,
        action_type: 'import',
        resource_type: 'grid',
        details: { imported, skipped, errors: errors.length },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[csv] Import completed: ${imported} imported, ${skipped} skipped`);
      return {
        message: 'Import completed',
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import grids');
      return reply.status(500).send({ message: 'Failed to import grids', error: err.message });
    }
  });

  // Export disaster areas to CSV
  app.get('/csv/export/areas', { preHandler: requirePermission('disaster_areas', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, name, county, township, description, status,
          center_lat, center_lng, created_at
        FROM disaster_areas
        WHERE status != 'deleted'
        ORDER BY created_at DESC`
      );

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          name: '災區名稱',
          county: '縣市',
          township: '鄉鎮區',
          description: '描述',
          status: '狀態',
          center_lat: '緯度',
          center_lng: '經度',
          created_at: '建立時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="disaster_areas_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export disaster areas');
      return reply.status(500).send({ message: 'Failed to export disaster areas' });
    }
  });

  // Export CSV template for disaster areas
  app.get('/csv/template/areas', { preHandler: requirePermission('disaster_areas', 'manage') }, async (req, reply) => {
    const template = stringify([{
      name: '花蓮市區淹水區',
      county: '花蓮縣',
      township: '花蓮市',
      description: '主要街道淹水，需要抽水設備',
      center_lat: 23.9871,
      center_lng: 121.6011
    }], {
      header: true,
      columns: {
        name: '災區名稱（必填）',
        county: '縣市（必填）',
        township: '鄉鎮區（必填）',
        description: '描述',
        center_lat: '緯度（必填）',
        center_lng: '經度（必填）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="disaster_areas_template.csv"');
    return templateWithBOM;
  });

  // Import disaster areas from CSV
  app.post('/csv/import/areas', { preHandler: requirePermission('disaster_areas', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        // Validate required fields
        if (!record['災區名稱（必填）'] || !record['縣市（必填）'] ||
            !record['鄉鎮區（必填）'] || !record['緯度（必填）'] || !record['經度（必填）']) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        const name = record['災區名稱（必填）'];
        const county = record['縣市（必填）'];
        const township = record['鄉鎮區（必填）'];
        const description = record['描述'] || '';
        const centerLat = parseFloat(record['緯度（必填）']);
        const centerLng = parseFloat(record['經度（必填）']);

        // Check if disaster area already exists
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM disaster_areas WHERE name = $1 AND county = $2 AND township = $3',
            [name, county, township]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // Create disaster area
        const areaId = `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO disaster_areas (
            id, name, county, township, description, center_lat, center_lng, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
          [areaId, name, county, township, description, centerLat, centerLng]
        );

        imported++;
      }

      app.log.info(`[csv] Areas import completed: ${imported} imported, ${skipped} skipped`);
      return {
        message: 'Import completed',
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import disaster areas');
      return reply.status(500).send({ message: 'Failed to import disaster areas', error: err.message });
    }
  });

  // Export volunteers to CSV
  app.get('/csv/export/volunteers', { preHandler: requirePermission('volunteers', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          vr.id, vr.volunteer_name, vr.volunteer_phone, vr.volunteer_email,
          vr.available_time, vr.status, vr.created_at,
          g.code as grid_code,
          da.name as area_name
        FROM volunteer_registrations vr
        LEFT JOIN grids g ON vr.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY vr.created_at DESC`
      );

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          volunteer_name: '志工姓名',
          volunteer_phone: '電話',
          volunteer_email: 'Email',
          available_time: '可服務時間',
          status: '狀態',
          grid_code: '網格代碼',
          area_name: '災區',
          created_at: '報名時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="volunteers_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export volunteers');
      return reply.status(500).send({ message: 'Failed to export volunteers' });
    }
  });

  // Import volunteers from CSV
  app.post('/csv/import/volunteers', { preHandler: requirePermission('volunteers', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        const volunteerName = record['志工姓名'];
        const volunteerPhone = record['電話'];
        const volunteerEmail = record['Email'];
        const gridCode = record['網格代碼'];

        if (!volunteerName || !gridCode) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        // Find grid by code
        const { rows: grids } = await app.db.query(
          'SELECT id FROM grids WHERE code = $1',
          [gridCode]
        );

        if (grids.length === 0) {
          errors.push(`Grid not found: ${gridCode}`);
          continue;
        }

        // Check for duplicates
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM volunteer_registrations WHERE volunteer_phone = $1 AND grid_id = $2',
            [volunteerPhone, grids[0].id]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        const regId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO volunteer_registrations (
            id, grid_id, volunteer_name, volunteer_phone, volunteer_email, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [regId, grids[0].id, volunteerName, volunteerPhone, volunteerEmail]
        );

        imported++;
      }

      app.log.info(`[csv] Volunteers import completed: ${imported} imported, ${skipped} skipped`);
      return { message: 'Import completed', imported, skipped, errors: errors.length > 0 ? errors : undefined };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import volunteers');
      return reply.status(500).send({ message: 'Failed to import volunteers', error: err.message });
    }
  });

  // Export supply donations to CSV
  app.get('/csv/export/supplies', { preHandler: requirePermission('supplies', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          sd.id, sd.donor_name, sd.donor_phone, sd.supply_items,
          sd.quantity, sd.status, sd.created_at,
          g.code as grid_code,
          da.name as area_name
        FROM supply_donations sd
        LEFT JOIN grids g ON sd.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY sd.created_at DESC`
      );

      const csv = stringify(rows, {
        header: true,
        columns: {
          id: 'ID',
          donor_name: '捐贈者姓名',
          donor_phone: '電話',
          supply_items: '物資項目',
          quantity: '數量',
          status: '狀態',
          grid_code: '網格代碼',
          area_name: '災區',
          created_at: '捐贈時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="supplies_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export supplies');
      return reply.status(500).send({ message: 'Failed to export supplies' });
    }
  });

  // Import supply donations from CSV
  app.post('/csv/import/supplies', { preHandler: requirePermission('supplies', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        const donorName = record['捐贈者姓名'];
        const donorPhone = record['電話'];
        const supplyItems = record['物資項目'];
        const quantity = parseInt(record['數量'] || '1');
        const gridCode = record['網格代碼'];

        if (!donorName || !gridCode || !supplyItems) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        // Find grid by code
        const { rows: grids } = await app.db.query(
          'SELECT id FROM grids WHERE code = $1',
          [gridCode]
        );

        if (grids.length === 0) {
          errors.push(`Grid not found: ${gridCode}`);
          continue;
        }

        const donationId = `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO supply_donations (
            id, grid_id, donor_name, donor_phone, supply_items, quantity, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [donationId, grids[0].id, donorName, donorPhone, supplyItems, quantity]
        );

        imported++;
      }

      app.log.info(`[csv] Supplies import completed: ${imported} imported, ${skipped} skipped`);
      return { message: 'Import completed', imported, skipped, errors: errors.length > 0 ? errors : undefined };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import supplies');
      return reply.status(500).send({ message: 'Failed to import supplies', error: err.message });
    }
  });

  // Export users to CSV
  app.get('/csv/export/users', { preHandler: requirePermission('users', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, name, email, role, is_blacklisted, created_at
        FROM users
        ORDER BY created_at DESC`
      );

      const csv = stringify(rows, {
        header: true,
        columns: {
          id: 'ID',
          name: '姓名',
          email: 'Email',
          role: '角色',
          is_blacklisted: '黑名單',
          created_at: '註冊時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="users_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export users');
      return reply.status(500).send({ message: 'Failed to export users' });
    }
  });

  // Import users from CSV
  app.post('/csv/import/users', { preHandler: requirePermission('users', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        const name = record['姓名'];
        const email = record['Email'];
        const role = record['角色'] || 'user';

        if (!name || !email) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        // Check for duplicates
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)`,
          [userId, name, email, role]
        );

        imported++;
      }

      app.log.info(`[csv] Users import completed: ${imported} imported, ${skipped} skipped`);
      return { message: 'Import completed', imported, skipped, errors: errors.length > 0 ? errors : undefined };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import users');
      return reply.status(500).send({ message: 'Failed to import users', error: err.message });
    }
  });

  // Export blacklisted users to CSV
  app.get('/csv/export/blacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, name, email, role, created_at
        FROM users
        WHERE is_blacklisted = true
        ORDER BY created_at DESC`
      );

      const csv = stringify(rows, {
        header: true,
        columns: {
          id: 'ID',
          name: '姓名',
          email: 'Email',
          role: '角色',
          created_at: '加入黑名單時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="blacklist_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export blacklist');
      return reply.status(500).send({ message: 'Failed to export blacklist' });
    }
  });

  // Import blacklisted users from CSV
  app.post('/csv/import/blacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records) {
        const email = record['Email'];

        if (!email) {
          errors.push(`Missing email in row: ${JSON.stringify(record)}`);
          continue;
        }

        // Find user by email
        const { rows: users } = await app.db.query(
          'SELECT id, is_blacklisted FROM users WHERE email = $1',
          [email]
        );

        if (users.length === 0) {
          errors.push(`User not found: ${email}`);
          continue;
        }

        if (users[0].is_blacklisted) {
          skipped++;
          continue;
        }

        // Add to blacklist
        await app.db.query(
          'UPDATE users SET is_blacklisted = true WHERE id = $1',
          [users[0].id]
        );

        imported++;
      }

      app.log.info(`[csv] Blacklist import completed: ${imported} imported, ${skipped} skipped`);
      return { message: 'Import completed', imported, skipped, errors: errors.length > 0 ? errors : undefined };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import blacklist');
      return reply.status(500).send({ message: 'Failed to import blacklist', error: err.message });
    }
  });

  // Export announcements to CSV
  app.get('/csv/export/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, title, body, priority, status, created_at, updated_at
        FROM announcements
        ORDER BY created_at DESC`
      );

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        updated_at: formatDateTime(row.updated_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          title: '標題',
          body: '內容',
          priority: '優先級',
          status: '狀態',
          created_at: '建立時間',
          updated_at: '更新時間'
        }
      });

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id,
        line_name: req.user?.name,
        action: `匯出 ${rows.length} 筆公告資料為 CSV`,
        action_type: 'export',
        resource_type: 'announcement',
        details: { count: rows.length },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="announcements_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export announcements');
      return reply.status(500).send({ message: 'Failed to export announcements' });
    }
  });

  // Import announcements from CSV
  app.post('/csv/import/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      const records = parse(body.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; error: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const title = record['標題'];
        const body = record['內容'] || '';
        const priority = record['優先級'] || 'normal';
        const status = record['狀態'] || 'active';

        if (!title) {
          errors.push({ row: i + 2, error: '缺少必填欄位：標題' });
          continue;
        }

        // 驗證優先級
        if (!['low', 'normal', 'high'].includes(priority)) {
          errors.push({ row: i + 2, error: `無效的優先級：${priority}（應為 low/normal/high）` });
          continue;
        }

        // 驗證狀態
        if (!['active', 'inactive'].includes(status)) {
          errors.push({ row: i + 2, error: `無效的狀態：${status}（應為 active/inactive）` });
          continue;
        }

        // Check for duplicates by title
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM announcements WHERE title = $1',
            [title]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        const announcementId = `announcement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO announcements (id, title, body, priority, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [announcementId, title, body, priority, status]
        );

        imported++;
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id,
        line_name: req.user?.name,
        action: `匯入 ${imported} 筆公告資料（略過 ${skipped} 筆）`,
        action_type: 'import',
        resource_type: 'announcement',
        details: { imported, skipped, errors: errors.length },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[csv] Announcements import completed: ${imported} imported, ${skipped} skipped`);
      return {
        success: true,
        message: `匯入完成：成功 ${imported} 筆，略過 ${skipped} 筆`,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import announcements');
      return reply.status(500).send({ message: 'Failed to import announcements', error: err.message });
    }
  });
}