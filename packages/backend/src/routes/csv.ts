import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../middlewares/PermissionMiddleware.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createAdminAuditLog } from '../lib/audit-logger.js';
import crypto from 'crypto';

/**
 * 移除 BOM (Byte Order Mark) 字元
 * @param text - 可能包含 BOM 的文字
 * @returns 移除 BOM 後的文字
 */
function removeBOM(text: string): string {
  // 移除 UTF-8 BOM (0xEF,0xBB,0xBF)
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  // 移除可能在文字開頭的其他 BOM 變體
  text = text.replace(/^\uFEFF/, '');
  return text;
}

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
          g.id, g.code, g.grid_type, g.disaster_area_id, g.volunteer_needed, g.volunteer_registered,
          g.meeting_point, g.risks_notes, g.contact_info, g.center_lat, g.center_lng,
          g.bounds, g.status, g.supplies_needed, g.grid_manager_id, g.completion_photo,
          g.created_by_id, g.created_by, g.is_sample, g.created_at, g.updated_at,
          g.created_date, g.updated_date,
          da.name as area_name
        FROM grids g
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        WHERE g.status != 'deleted'
        ORDER BY g.created_at DESC`
      );

      // 格式化時間欄位和 JSONB 欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        updated_at: formatDateTime(row.updated_at),
        created_date: formatDateTime(row.created_date),
        updated_date: formatDateTime(row.updated_date),
        is_sample: row.is_sample ? '是' : '否',
        // 將 bounds JSONB 轉換為 JSON 字串
        bounds: row.bounds ? JSON.stringify(row.bounds) : '',
        // 將 supplies_needed JSONB 轉換為 JSON 字串（確保匯入時能解析）
        supplies_needed: row.supplies_needed ? JSON.stringify(row.supplies_needed) : ''
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          code: '網格代碼',
          grid_type: '類型',
          disaster_area_id: '災區ID',
          area_name: '災區',
          volunteer_needed: '需求人數',
          volunteer_registered: '已登記人數',
          meeting_point: '集合點',
          risks_notes: '風險備註',
          contact_info: '聯絡資訊',
          center_lat: '緯度',
          center_lng: '經度',
          bounds: '邊界座標(JSON)',
          status: '狀態',
          supplies_needed: '所需物資',
          grid_manager_id: '網格管理員ID',
          completion_photo: '完成照片',
          created_by_id: '建立者ID',
          created_by: '建立者',
          is_sample: '是否為範例',
          created_at: '建立時間',
          updated_at: '更新時間',
          created_date: '建立日期',
          updated_date: '更新日期'
        }
      });

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援兩種格式：範本格式（含必填標記）和匯出格式（無標記）
        const code = record['網格代碼（必填）'] || record['網格代碼'];
        const gridType = record['類型（必填：residential/commercial/industrial）'] || record['類型'] || 'residential';
        const areaName = record['災區名稱（必填）'] || record['災區'];
        const centerLat = parseFloat(record['緯度（必填）'] || record['緯度']);
        const centerLng = parseFloat(record['經度（必填）'] || record['經度']);

        // Validate required fields
        if (!code || !areaName || isNaN(centerLat) || isNaN(centerLng)) {
          errors.push(`Missing required fields in row: ${JSON.stringify(record)}`);
          continue;
        }

        const volunteerNeeded = parseInt(record['需求人數'] || '0');
        const meetingPoint = record['集合點'] || '';
        const risksNotes = record['風險備註'] || '';
        const contactInfo = record['聯絡資訊'] || '';

        // 解析 supplies_needed JSON 字串（如果有的話）
        let suppliesNeeded: any = null;
        const suppliesNeededRaw = record['所需物資'];
        if (suppliesNeededRaw) {
          try {
            suppliesNeeded = JSON.parse(suppliesNeededRaw);
          } catch {
            // 如果解析失敗，保留原始字串
            suppliesNeeded = suppliesNeededRaw;
          }
        }

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
          const newAreaId = `area_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
          await app.db.query(
            `INSERT INTO disaster_areas (id, name, center_lat, center_lng, status)
             VALUES ($1, $2, $3, $4, 'active')`,
            [newAreaId, areaName, centerLat, centerLng]
          );
          areaId = newAreaId;
        }

        // Create grid
        const gridId = `grid_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO grids (
            id, code, grid_type, disaster_area_id, volunteer_needed,
            meeting_point, risks_notes, contact_info, center_lat, center_lng,
            supplies_needed, status, created_by_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            gridId, code, gridType, areaId, volunteerNeeded,
            meetingPoint, risksNotes, contactInfo, centerLat, centerLng,
            suppliesNeeded, 'open', req.user?.id, req.user?.name || 'CSV Import'
          ]
        );

        imported++;
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
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
          id, name, township, county, center_lat, center_lng, bounds,
          grid_size, status, description, created_by_id, created_by, is_sample,
          created_at, updated_at, created_date, updated_date
        FROM disaster_areas
        WHERE status != 'deleted'
        ORDER BY created_at DESC`
      );

      // 格式化時間欄位和 JSONB 欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        updated_at: formatDateTime(row.updated_at),
        created_date: formatDateTime(row.created_date),
        updated_date: formatDateTime(row.updated_date),
        is_sample: row.is_sample ? '是' : '否',
        // 將 bounds JSONB 轉換為 JSON 字串
        bounds: row.bounds ? JSON.stringify(row.bounds) : ''
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          name: '災區名稱',
          township: '鄉鎮區',
          county: '縣市',
          center_lat: '緯度',
          center_lng: '經度',
          bounds: '邊界座標(JSON)',
          grid_size: '網格大小',
          status: '狀態',
          description: '描述',
          created_by_id: '建立者ID',
          created_by: '建立者',
          is_sample: '是否為範例',
          created_at: '建立時間',
          updated_at: '更新時間',
          created_date: '建立日期',
          updated_date: '更新日期'
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援兩種格式：範本格式（含必填標記）和匯出格式（無標記）
        const name = record['災區名稱（必填）'] || record['災區名稱'];
        const county = record['縣市（必填）'] || record['縣市'] || '';
        const township = record['鄉鎮區（必填）'] || record['鄉鎮區'] || '';
        const centerLat = parseFloat(record['緯度（必填）'] || record['緯度']);
        const centerLng = parseFloat(record['經度（必填）'] || record['經度']);

        // Validate required fields (只有名稱、經緯度為必填)
        if (!name || isNaN(centerLat) || isNaN(centerLng)) {
          errors.push(`缺少必填欄位（災區名稱、緯度、經度）: ${JSON.stringify(record)}`);
          continue;
        }

        const description = record['描述'] || '';

        // Check if disaster area already exists (基於名稱和經緯度)
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM disaster_areas WHERE name = $1 AND ABS(center_lat - $2) < 0.0001 AND ABS(center_lng - $3) < 0.0001',
            [name, centerLat, centerLng]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // Create disaster area
        const areaId = `area_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
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
          vr.id, vr.grid_id, vr.user_id, vr.volunteer_name, vr.volunteer_phone,
          vr.volunteer_email, vr.available_time, vr.skills, vr.equipment,
          vr.status, vr.check_in_time, vr.notes, vr.created_by_id, vr.created_by,
          vr.is_sample, vr.created_at, vr.updated_at, vr.created_date, vr.updated_date,
          g.code as grid_code,
          da.name as area_name
        FROM volunteer_registrations vr
        LEFT JOIN grids g ON vr.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY vr.created_at DESC`
      );

      // 格式化時間欄位和 JSONB 欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        updated_at: formatDateTime(row.updated_at),
        created_date: formatDateTime(row.created_date),
        updated_date: formatDateTime(row.updated_date),
        check_in_time: row.check_in_time ? formatDateTime(row.check_in_time) : '',
        is_sample: row.is_sample ? '是' : '否',
        // 將 skills JSONB 轉換為可讀格式
        skills: row.skills
          ? (Array.isArray(row.skills)
              ? row.skills.join('; ')
              : JSON.stringify(row.skills))
          : '',
        // 將 equipment JSONB 轉換為可讀格式
        equipment: row.equipment
          ? (Array.isArray(row.equipment)
              ? row.equipment.join('; ')
              : JSON.stringify(row.equipment))
          : ''
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          grid_id: '網格ID',
          grid_code: '網格代碼',
          area_name: '災區',
          user_id: '使用者ID',
          volunteer_name: '志工姓名',
          volunteer_phone: '電話',
          volunteer_email: 'Email',
          available_time: '可服務時間',
          skills: '技能',
          equipment: '攜帶設備',
          status: '狀態',
          check_in_time: '報到時間',
          notes: '備註',
          created_by_id: '建立者ID',
          created_by: '建立者',
          is_sample: '是否為範例',
          created_at: '報名時間',
          updated_at: '更新時間',
          created_date: '建立日期',
          updated_date: '更新日期'
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

  // Export CSV template for volunteers
  app.get('/csv/template/volunteers', { preHandler: requirePermission('volunteers', 'manage') }, async (req, reply) => {
    const template = stringify([{
      volunteer_name: '王小明',
      volunteer_phone: '0912345678',
      volunteer_email: 'volunteer@example.com',
      available_time: '週一到週五 9:00-17:00',
      grid_code: 'A1'
    }], {
      header: true,
      columns: {
        volunteer_name: '志工姓名（必填）',
        volunteer_phone: '電話',
        volunteer_email: 'Email',
        available_time: '可服務時間',
        grid_code: '網格代碼（必填）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="volunteers_template.csv"');
    return templateWithBOM;
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援兩種格式：範本格式（含必填標記）和匯出格式（無標記）
        const volunteerName = record['志工姓名（必填）'] || record['志工姓名'];
        const volunteerPhone = record['電話（必填）'] || record['電話'] || '';
        const volunteerEmail = record['Email'] || '';
        const availableTime = record['可服務時間'] || '';
        const gridCode = record['網格代碼（必填）'] || record['網格代碼'];

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

        const regId = `reg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO volunteer_registrations (
            id, grid_id, volunteer_name, volunteer_phone, volunteer_email, available_time, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [regId, grids[0].id, volunteerName, volunteerPhone, volunteerEmail, availableTime]
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
          sd.id, sd.grid_id, sd.name, sd.quantity, sd.unit, sd.donor_contact,
          sd.created_at, sd.delivery_method, sd.delivery_address, sd.delivery_time,
          sd.notes, sd.status, sd.supply_name, sd.donor_name, sd.donor_phone,
          sd.donor_email, sd.created_by_id, sd.created_by, sd.updated_at,
          g.code as grid_code,
          da.name as area_name
        FROM supply_donations sd
        LEFT JOIN grids g ON sd.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY sd.created_at DESC`
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
          grid_id: '網格ID',
          grid_code: '網格代碼',
          area_name: '災區',
          name: '物資名稱(舊)',
          supply_name: '物資名稱',
          quantity: '數量',
          unit: '單位',
          donor_contact: '捐贈者聯絡(舊)',
          donor_name: '捐贈者姓名',
          donor_phone: '聯絡電話',
          donor_email: 'Email',
          delivery_method: '配送方式',
          delivery_address: '送達地址',
          delivery_time: '預計送達時間',
          notes: '備註',
          status: '狀態',
          created_by_id: '建立者ID',
          created_by: '建立者',
          created_at: '捐贈時間',
          updated_at: '更新時間'
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

  // Export trash supply donations to CSV
  app.get('/csv/export/trash-supplies', { preHandler: requirePermission('trash_supplies', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          sd.id, sd.grid_id, sd.name, sd.quantity, sd.unit, sd.donor_contact,
          sd.created_at, sd.delivery_method, sd.delivery_address, sd.delivery_time,
          sd.notes, sd.status, sd.supply_name, sd.donor_name, sd.donor_phone,
          sd.donor_email, sd.created_by_id, sd.created_by, sd.updated_at,
          g.code as grid_code,
          da.name as area_name
        FROM supply_donations sd
        LEFT JOIN grids g ON sd.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        WHERE sd.status = 'deleted'
        ORDER BY sd.updated_at DESC`
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
          grid_id: '網格ID',
          grid_code: '網格代碼',
          area_name: '災區',
          name: '物資名稱(舊)',
          supply_name: '物資名稱',
          quantity: '數量',
          unit: '單位',
          donor_contact: '捐贈者聯絡(舊)',
          donor_name: '捐贈者姓名',
          donor_phone: '聯絡電話',
          donor_email: 'Email',
          delivery_method: '配送方式',
          delivery_address: '送達地址',
          delivery_time: '預計送達時間',
          notes: '備註',
          status: '狀態',
          created_by_id: '建立者ID',
          created_by: '建立者',
          created_at: '捐贈時間',
          updated_at: '更新時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="trash_supplies_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export trash supplies');
      return reply.status(500).send({ message: 'Failed to export trash supplies' });
    }
  });

  // Import trash supply donations from CSV
  app.post('/csv/import/trash-supplies',
    { preHandler: requirePermission('trash_supplies', 'manage') },
    async (req: FastifyRequest, reply) => {
      if (!app.hasDecorator('db')) {
        return reply.status(503).send({ message: 'Database not available' });
      }

      const body = req.body as { csv: string; skipDuplicates?: boolean };

      if (!body.csv) {
        return reply.status(400).send({ message: 'CSV data is required' });
      }

      try {
        // 移除 BOM 字元
        const csvData = removeBOM(body.csv);
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          encoding: 'utf-8'
        });

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const record of records as any[]) {
          const recordId = record['ID'];
          const gridCode = record['網格代碼'];
          const supplyName = record['物資名稱'] || '';
          const quantity = parseInt(record['數量'] || '1');
          const unit = record['單位'] || '';
          const donorName = record['捐贈者姓名'] || '';
          const donorPhone = record['聯絡電話'] || '';
          const donorEmail = record['Email'] || '';
          const deliveryMethod = record['配送方式'] || '';
          const deliveryAddress = record['送達地址'] || '';
          const deliveryTime = record['預計送達時間'] || '';
          const notes = record['備註'] || '';

          // 驗證必填欄位
          if (!gridCode) {
            errors.push(`Missing required field (網格代碼) in row: ${JSON.stringify(record)}`);
            continue;
          }

          // 如果有 ID，嘗試找到並更新現有記錄（移動到垃圾桶）
          if (recordId) {
            const { rows: existing } = await app.db.query(
              'SELECT id, status FROM supply_donations WHERE id = $1',
              [recordId]
            );

            if (existing.length > 0) {
              // 找到網格 ID
              const { rows: grids } = await app.db.query(
                'SELECT id FROM grids WHERE code = $1',
                [gridCode]
              );

              if (grids.length === 0) {
                errors.push(`Grid not found: ${gridCode}`);
                continue;
              }

              const gridId = grids[0].id;

              // 更新現有記錄，將狀態改為 deleted（移動到垃圾桶）
              await app.db.query(
                `UPDATE supply_donations SET
                  grid_id = $1,
                  supply_name = $2,
                  quantity = $3,
                  unit = $4,
                  donor_name = $5,
                  donor_phone = $6,
                  donor_email = $7,
                  delivery_method = $8,
                  delivery_address = $9,
                  delivery_time = $10,
                  notes = $11,
                  status = 'deleted',
                  updated_at = NOW()
                WHERE id = $12`,
                [
                  gridId,
                  supplyName,
                  quantity,
                  unit,
                  donorName,
                  donorPhone,
                  donorEmail,
                  deliveryMethod,
                  deliveryAddress,
                  deliveryTime,
                  notes,
                  recordId
                ]
              );
              imported++;
              continue;
            }
          }

          // 檢查是否已存在於垃圾桶（避免重複）
          if (body.skipDuplicates) {
            const { rows: existingTrash } = await app.db.query(
              'SELECT id FROM supply_donations WHERE supply_name = $1 AND donor_name = $2 AND status = $3',
              [supplyName, donorName, 'deleted']
            );

            if (existingTrash.length > 0) {
              skipped++;
              continue;
            }
          }

          // 找到網格 ID
          const { rows: grids } = await app.db.query(
            'SELECT id FROM grids WHERE code = $1',
            [gridCode]
          );

          if (grids.length === 0) {
            errors.push(`Grid not found: ${gridCode}`);
            continue;
          }

          const gridId = grids[0].id;

          // 插入新記錄到垃圾桶
          // 如果 CSV 包含 id 欄位，使用該 id；否則讓資料庫自動生成
          if (recordId) {
            // 有 id 的情況：直接插入指定的 id
            await app.db.query(
              `INSERT INTO supply_donations (
                id, grid_id, supply_name, quantity, unit,
                donor_name, donor_phone, donor_email,
                delivery_method, delivery_address, delivery_time,
                notes, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'deleted', NOW(), NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                recordId,
                gridId,
                supplyName,
                quantity,
                unit,
                donorName,
                donorPhone,
                donorEmail,
                deliveryMethod,
                deliveryAddress,
                deliveryTime,
                notes
              ]
            );
          } else {
            // 沒有 id 的情況：讓資料庫自動生成
            await app.db.query(
              `INSERT INTO supply_donations (
                grid_id, supply_name, quantity, unit,
                donor_name, donor_phone, donor_email,
                delivery_method, delivery_address, delivery_time,
                notes, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'deleted', NOW(), NOW())`,
              [
                gridId,
                supplyName,
                quantity,
                unit,
                donorName,
                donorPhone,
                donorEmail,
                deliveryMethod,
                deliveryAddress,
                deliveryTime,
                notes
              ]
            );
          }
          imported++;
        }

        app.log.info({ imported, skipped, errors: errors.length }, '[csv] Trash supply donations import completed');

        return reply.send({
          message: 'Import completed',
          imported,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });

      } catch (err: any) {
        app.log.error({ err }, '[csv] Failed to import trash supply donations');
        return reply.status(500).send({
          message: 'Failed to import trash supply donations',
          error: err.message
        });
      }
    }
  );

  // Export CSV template for supply donations
  app.get('/csv/template/supplies', { preHandler: requirePermission('supplies', 'manage') }, async (req, reply) => {
    const template = stringify([{
      grid_code: 'A1',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '張三',
      donor_phone: '0912345678',
      donor_email: 'donor@example.com',
      delivery_method: '自行送達',
      delivery_address: '花蓮市中山路100號',
      delivery_time: '2024-01-15 14:00',
      notes: '請提前通知'
    }], {
      header: true,
      columns: {
        grid_code: '網格代碼（必填）',
        supply_name: '物資名稱（必填）',
        quantity: '數量',
        unit: '單位',
        donor_name: '捐贈者姓名（必填）',
        donor_phone: '聯絡電話',
        donor_email: 'Email',
        delivery_method: '配送方式',
        delivery_address: '送達地址',
        delivery_time: '預計送達時間',
        notes: '備註'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="supplies_template.csv"');
    return templateWithBOM;
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援兩種格式：範本格式（含必填標記）和匯出格式（無標記）
        const recordId = record['ID'];
        const gridCode = record['網格代碼（必填）'] || record['網格代碼'];
        const supplyName = record['物資名稱（必填）'] || record['物資名稱'] || '';
        const quantity = parseInt(record['數量'] || '1');
        const unit = record['單位'] || '';
        const donorName = record['捐贈者姓名（必填）'] || record['捐贈者姓名'] || '';
        const donorPhone = record['聯絡電話（必填）'] || record['聯絡電話'] || '';
        const donorEmail = record['Email'] || '';
        const deliveryMethod = record['配送方式'] || '';
        const deliveryAddress = record['送達地址'] || '';
        const deliveryTime = record['預計送達時間'] || '';
        const notes = record['備註'] || '';
        const status = record['狀態'] || 'pending';

        // 只驗證網格代碼為必填，允許物資名稱和捐贈者姓名為空
        if (!gridCode) {
          errors.push(`Missing required field (網格代碼) in row: ${JSON.stringify(record)}`);
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

        // 如果有 ID，嘗試更新現有記錄
        if (recordId) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM supply_donations WHERE id = $1',
            [recordId]
          );

          if (existing.length > 0) {
            // 如果 skipDuplicates 為 true，跳過已存在的記錄
            if (body.skipDuplicates) {
              skipped++;
              continue;
            }

            // 否則更新現有記錄（包含 name 欄位，用於向後兼容）
            await app.db.query(
              `UPDATE supply_donations SET
                grid_id = $1, name = $2, supply_name = $3, quantity = $4, unit = $5,
                donor_name = $6, donor_phone = $7, donor_email = $8,
                delivery_method = $9, delivery_address = $10, delivery_time = $11,
                notes = $12, status = $13
              WHERE id = $14`,
              [grids[0].id, supplyName || '未指定物資', supplyName, quantity, unit,
               donorName, donorPhone, donorEmail,
               deliveryMethod, deliveryAddress, deliveryTime,
               notes, status, recordId]
            );
            imported++;
            continue;
          }
        }

        // Check for duplicates (基於捐贈者電話、物資名稱和網格)
        // 只檢查有明確識別資訊的記錄（電話和物資名稱都不為空）
        if (body.skipDuplicates && donorPhone && supplyName) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM supply_donations WHERE donor_phone = $1 AND supply_name = $2 AND grid_id = $3',
            [donorPhone, supplyName, grids[0].id]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // 創建新記錄（使用 CSV 中的 ID 或生成新的，包含 name 欄位用於向後兼容）
        const donationId = recordId || `donation_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO supply_donations (
            id, grid_id, name, supply_name, quantity, unit,
            donor_name, donor_phone, donor_email,
            delivery_method, delivery_address, delivery_time,
            notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [donationId, grids[0].id, supplyName || '未指定物資', supplyName, quantity, unit,
           donorName, donorPhone, donorEmail,
           deliveryMethod, deliveryAddress, deliveryTime,
           notes, status]
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

  // Export CSV template for users
  app.get('/csv/template/users', { preHandler: requirePermission('users', 'manage') }, async (req, reply) => {
    const template = stringify([{
      name: '王小明',
      email: 'user@example.com',
      role: 'user'
    }], {
      header: true,
      columns: {
        name: '姓名（必填）',
        email: 'Email',
        role: '角色（user/admin/moderator）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="users_template.csv"');
    return templateWithBOM;
  });

  // Export users to CSV
  app.get('/csv/export/users', { preHandler: requirePermission('users', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, name, email, created_at, line_sub, avatar_url, role, is_blacklisted
        FROM users
        ORDER BY created_at DESC`
      );

      // 格式化時間欄位和布林值
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        is_blacklisted: row.is_blacklisted ? '是' : '否'
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          name: '姓名',
          email: 'Email',
          created_at: '註冊時間',
          line_sub: 'LINE使用者ID',
          avatar_url: '頭像網址',
          role: '角色',
          is_blacklisted: '黑名單'
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        const name = record['姓名（必填）'] || record['姓名'];
        // Email 改為選填（支援 LINE 登入用戶沒有 Email）
        const email = record['Email（必填）'] || record['Email'] || null;
        const role = record['角色（user/admin/moderator）'] || record['角色'] || 'user';

        // 只驗證姓名為必填
        if (!name) {
          errors.push(`缺少必填欄位（姓名）: ${JSON.stringify(record)}`);
          continue;
        }

        // Check for duplicates - 基於 email 或 name 檢查
        if (body.skipDuplicates) {
          let existing: any[] = [];

          // 優先使用 email 檢查重複
          if (email) {
            const { rows } = await app.db.query(
              'SELECT id FROM users WHERE email = $1',
              [email]
            );
            existing = rows;
          }

          // 如果沒有 email，使用 name 檢查重複
          if (!email || existing.length === 0) {
            const { rows } = await app.db.query(
              'SELECT id FROM users WHERE name = $1',
              [name]
            );
            if (rows.length > 0) {
              existing = rows;
            }
          }

          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // 使用加密安全的隨機數生成 userId
        const userId = `user_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
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

  // Export CSV template for blacklist
  app.get('/csv/template/blacklist', { preHandler: requirePermission('blacklist', 'manage') }, async (req, reply) => {
    const template = stringify([{
      id: 'user_1234567890_abc123def',
      email: 'user@example.com'
    }], {
      header: true,
      columns: {
        id: 'ID（優先使用）',
        email: 'Email（選填）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="blacklist_template.csv"');
    return templateWithBOM;
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

      // 格式化時間欄位
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at)
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          name: '姓名',
          email: 'Email（必填）',
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
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8',
        bom: true // 啟用 BOM 處理
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 嘗試多種可能的欄位名稱，並清理空字串
        let id = record['ID'] || record['﻿ID'] || record['\uFEFFID'] || '';
        let email = record['Email（必填）'] || record['Email'] || record['﻿Email（必填）'] || record['\uFEFFEmail（必填）'] || '';
        let username = record['姓名'] || record['﻿姓名'] || '';
        let role = record['角色'] || record['﻿角色'] || '';

        // 清理空字串和空白字元
        id = id.trim();
        email = email.trim();
        username = username.trim();
        role = role.trim();

        // 將空字串轉換為 undefined
        if (!id) id = undefined;
        if (!email) email = undefined;
        if (!username) username = undefined;
        if (!role) role = undefined;

        // 必須至少有 ID 或 Email 其中之一
        if (!id && !email) {
          errors.push(`缺少 ID 和 Email`);
          continue;
        }

        // 優先使用 ID 查詢，其次使用 Email
        let query: string;
        let params: any[];

        if (id) {
          query = 'SELECT id, is_blacklisted, name, role FROM users WHERE id = $1';
          params = [id];
        } else if (email) {
          query = 'SELECT id, is_blacklisted, name, role FROM users WHERE email = $1';
          params = [email];
        } else {
          continue;
        }

        const { rows: users } = await app.db.query(query, params);

        let userId: string;

        if (users.length === 0) {
          // 用戶不存在，創建新用戶並加入黑名單
          if (!id) {
            errors.push(`無法創建使用者：缺少 ID`);
            continue;
          }

          // 創建用戶
          const insertQuery = `
            INSERT INTO users (id, name, email, role, is_blacklisted, created_at)
            VALUES ($1, $2, $3, $4, true, NOW())
          `;
          const insertParams = [
            id,
            username || id, // 如果沒有姓名，使用 ID
            email || null,  // Email 可以為 null
            role || 'user'  // 預設角色為 user
          ];

          await app.db.query(insertQuery, insertParams);
          userId = id;
          imported++;
        } else {
          // 用戶存在
          userId = users[0].id;

          if (users[0].is_blacklisted) {
            skipped++;
            continue;
          }

          // 加入黑名單
          await app.db.query(
            'UPDATE users SET is_blacklisted = true WHERE id = $1',
            [userId]
          );
          imported++;
        }
      }

      app.log.info(`[csv] Blacklist import completed: ${imported} imported, ${skipped} skipped`);
      return { message: 'Import completed', imported, skipped, errors: errors.length > 0 ? errors : undefined };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import blacklist');
      return reply.status(500).send({ message: 'Failed to import blacklist', error: err.message });
    }
  });

  // Export CSV template for announcements
  app.get('/csv/template/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req, reply) => {
    const template = stringify([{
      title: '緊急公告',
      body: '公告內容',
      priority: 'normal',
      status: 'active'
    }], {
      header: true,
      columns: {
        title: '標題（必填）',
        body: '內容',
        priority: '優先級（low/normal/high）',
        status: '狀態（active/inactive）'
      }
    });

    const templateWithBOM = '\uFEFF' + template;
    reply.type('text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="announcements_template.csv"');
    return templateWithBOM;
  });

  // Export announcements to CSV
  app.get('/csv/export/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, title, body, content, category, is_pinned, external_links,
          contact_phone, "order", created_by_id, created_by, is_sample,
          priority, status, created_at, created_date, updated_date
        FROM announcements
        WHERE status != 'deleted'
        ORDER BY created_at DESC`
      );

      // 格式化時間欄位和 external_links
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        created_date: formatDateTime(row.created_date),
        updated_date: formatDateTime(row.updated_date),
        is_pinned: row.is_pinned ? '是' : '否',
        is_sample: row.is_sample ? '是' : '否',
        // 將 external_links JSON 轉換為可讀格式
        external_links: row.external_links
          ? (Array.isArray(row.external_links)
              ? row.external_links.map((link: any) => `${link.name || ''}:${link.url || ''}`).join('; ')
              : JSON.stringify(row.external_links))
          : ''
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          title: '標題',
          body: '內容',
          content: '詳細內容',
          category: '分類',
          is_pinned: '是否置頂',
          external_links: '外部連結',
          contact_phone: '聯絡電話',
          order: '排序',
          created_by_id: '建立者ID',
          created_by: '建立者',
          is_sample: '是否為範例',
          priority: '優先級',
          status: '狀態',
          created_at: '建立時間',
          created_date: '建立日期',
          updated_date: '更新日期'
        }
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

  // Export trash announcements to CSV
  app.get('/csv/export/trash-announcements', { preHandler: requirePermission('trash_announcements', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, title, body, content, category, is_pinned, external_links,
          contact_phone, "order", created_by_id, created_by, is_sample,
          priority, status, created_at, created_date, updated_date
        FROM announcements
        WHERE status = 'deleted'
        ORDER BY updated_date DESC`
      );

      // 格式化時間欄位和 external_links
      const formattedRows = rows.map(row => ({
        ...row,
        created_at: formatDateTime(row.created_at),
        created_date: formatDateTime(row.created_date),
        updated_date: formatDateTime(row.updated_date),
        is_pinned: row.is_pinned ? '是' : '否',
        is_sample: row.is_sample ? '是' : '否',
        // 將 external_links JSON 轉換為可讀格式
        external_links: row.external_links
          ? (Array.isArray(row.external_links)
              ? row.external_links.map((link: any) => `${link.name || ''}:${link.url || ''}`).join('; ')
              : JSON.stringify(row.external_links))
          : ''
      }));

      const csv = stringify(formattedRows, {
        header: true,
        columns: {
          id: 'ID',
          title: '標題',
          body: '內容',
          content: '詳細內容',
          category: '分類',
          is_pinned: '是否置頂',
          external_links: '外部連結',
          contact_phone: '聯絡電話',
          order: '排序',
          created_by_id: '建立者ID',
          created_by: '建立者',
          is_sample: '是否為範例',
          priority: '優先級',
          status: '狀態',
          created_at: '建立時間',
          created_date: '建立日期',
          updated_date: '更新日期'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="trash_announcements_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export trash announcements');
      return reply.status(500).send({ message: 'Failed to export trash announcements' });
    }
  });

  // Import announcements from CSV
  app.post('/csv/import/announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const requestBody = req.body as { csv: string; skipDuplicates?: boolean };

    if (!requestBody.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      // 移除 BOM 字元
      const csvData = removeBOM(requestBody.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; error: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = (records as any[])[i];
        const title = record['標題（必填）'] || record['標題'];
        const announcementBody = record['內容'] || '';
        const priority = record['優先級（low/normal/high）'] || record['優先級'] || 'normal';
        const status = record['狀態（active/inactive）'] || record['狀態'] || 'active';

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
        if (requestBody.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM announcements WHERE title = $1',
            [title]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        const announcementId = `announcement_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO announcements (id, title, body, priority, status, created_at, updated_date)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [announcementId, title, announcementBody, priority, status]
        );

        imported++;
      }

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

  // Import trash announcements from CSV
  app.post('/csv/import/trash-announcements', { preHandler: requirePermission('announcements', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const requestBody = req.body as { csv: string; skipDuplicates?: boolean };

    if (!requestBody.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      // 移除 BOM 字元
      const csvData = removeBOM(requestBody.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; error: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = (records as any[])[i];

        // 支援匯出格式的欄位
        const title = record['標題（必填）'] || record['標題'];
        const announcementBody = record['內容'] || '';
        const content = record['詳細內容'] || '';
        const category = record['分類'] || '';
        const isPinned = record['是否置頂'] === '是' || record['是否置頂'] === 'true';
        const externalLinksRaw = record['外部連結'] || '';
        const contactPhone = record['聯絡電話'] || '';
        const order = parseInt(record['排序'] || '0');
        const isSample = record['是否為範例'] === '是' || record['是否為範例'] === 'true';
        const priority = record['優先級'] || 'normal';

        if (!title) {
          errors.push({ row: i + 2, error: '缺少必填欄位：標題' });
          continue;
        }

        // 驗證優先級
        if (!['low', 'normal', 'high'].includes(priority)) {
          errors.push({ row: i + 2, error: `無效的優先級：${priority}（應為 low/normal/high）` });
          continue;
        }

        // 解析外部連結（格式：名稱:網址; 名稱:網址）
        let externalLinks: any = null;
        if (externalLinksRaw) {
          try {
            externalLinks = externalLinksRaw.split(';').map((link: string) => {
              const [name, url] = link.trim().split(':');
              return { name: name?.trim() || '', url: url?.trim() || '' };
            }).filter((link: any) => link.url);
          } catch {
            externalLinks = null;
          }
        }

        // 檢查是否存在相同標題的公告（不限狀態）
        const { rows: existingAnnouncements } = await app.db.query(
          'SELECT id, status FROM announcements WHERE title = $1',
          [title]
        );

        // 如果存在相同標題的公告
        if (existingAnnouncements.length > 0) {
          let hasOpen = false;
          let hasDeleted = false;

          // 檢查各種狀態
          for (const existingAnnouncement of existingAnnouncements) {
            if (existingAnnouncement.status === 'open' || existingAnnouncement.status === 'active') {
              hasOpen = true;
            } else if (existingAnnouncement.status === 'deleted') {
              hasDeleted = true;
            }
          }

          // 如果有 open/active 狀態的公告，將其改為 deleted
          if (hasOpen) {
            for (const existingAnnouncement of existingAnnouncements) {
              if (existingAnnouncement.status === 'open' || existingAnnouncement.status === 'active') {
                await app.db.query(
                  `UPDATE announcements SET status = 'deleted', updated_date = NOW() WHERE id = $1`,
                  [existingAnnouncement.id]
                );
              }
            }
            imported++;
            continue;  // 不再插入新記錄
          }

          // 如果已經存在 deleted 狀態的公告
          if (hasDeleted) {
            if (requestBody.skipDuplicates) {
              skipped++;
              continue;  // 跳過，不插入新記錄
            }
            // 如果沒有設定 skipDuplicates，也跳過不插入新記錄（避免重複）
            skipped++;
            continue;
          }

          // 如果存在其他狀態的公告（如 inactive），將其改為 deleted
          for (const existingAnnouncement of existingAnnouncements) {
            await app.db.query(
              `UPDATE announcements SET status = 'deleted', updated_date = NOW() WHERE id = $1`,
              [existingAnnouncement.id]
            );
          }
          imported++;
          continue;  // 不再插入新記錄
        }

        // 只有當不存在相同標題的公告時，才插入新記錄
        const announcementId = `announcement_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO announcements (
            id, title, body, content, category, is_pinned, external_links,
            contact_phone, "order", created_by_id, created_by, is_sample,
            priority, status, created_at, updated_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'deleted', NOW(), NOW())`,
          [announcementId, title, announcementBody, content, category, isPinned,
           externalLinks ? JSON.stringify(externalLinks) : null,
           contactPhone, order, req.user?.id, req.user?.name || 'CSV Import', isSample, priority]
        );

        imported++;
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `匯入 ${imported} 筆垃圾桶公告資料（略過 ${skipped} 筆）`,
        action_type: 'import',
        resource_type: 'announcement',
        details: { imported, skipped, errors: errors.length, trash: true },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[csv] Trash announcements import completed: ${imported} imported, ${skipped} skipped`);
      return {
        success: true,
        message: `匯入完成：成功 ${imported} 筆，略過 ${skipped} 筆`,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import trash announcements');
      return reply.status(500).send({ message: 'Failed to import trash announcements', error: err.message });
    }
  });

  // ==================== 垃圾桶災區 CSV 匯出/匯入 ====================

  // Export trash disaster areas to CSV
  app.get('/csv/export/trash-areas', { preHandler: requirePermission('trash_areas', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          id, name, county, township, description, status,
          center_lat, center_lng, created_at, updated_at
        FROM disaster_areas
        WHERE status = 'deleted'
        ORDER BY updated_at DESC`
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
          name: '災區名稱',
          county: '縣市',
          township: '鄉鎮區',
          description: '描述',
          status: '狀態',
          center_lat: '緯度',
          center_lng: '經度',
          created_at: '建立時間',
          updated_at: '更新時間'
        }
      });

      const csvWithBOM = '\uFEFF' + csv;
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="trash_areas_export.csv"');
      return csvWithBOM;
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export trash disaster areas');
      return reply.status(500).send({ message: 'Failed to export trash disaster areas' });
    }
  });

  // Import trash disaster areas from CSV
  app.post('/csv/import/trash-areas', { preHandler: requirePermission('disaster_areas', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援匯出格式的欄位
        const recordId = record['ID'];
        const name = record['災區名稱（必填）'] || record['災區名稱'];
        const county = record['縣市（必填）'] || record['縣市'] || '';
        const township = record['鄉鎮區（必填）'] || record['鄉鎮區'] || '';
        const description = record['描述'] || '';
        const centerLat = parseFloat(record['緯度（必填）'] || record['緯度']);
        const centerLng = parseFloat(record['經度（必填）'] || record['經度']);

        // Validate required fields (只有名稱、經緯度為必填)
        if (!name || isNaN(centerLat) || isNaN(centerLng)) {
          errors.push(`缺少必填欄位（災區名稱、緯度、經度）: ${JSON.stringify(record)}`);
          continue;
        }

        // 如果有 ID，嘗試恢復現有記錄
        if (recordId) {
          const { rows: existing } = await app.db.query(
            'SELECT id, status FROM disaster_areas WHERE id = $1',
            [recordId]
          );

          if (existing.length > 0) {
            // 更新現有記錄為 deleted 狀態（恢復到垃圾桶）
            await app.db.query(
              `UPDATE disaster_areas SET
                name = $1, county = $2, township = $3, description = $4,
                center_lat = $5, center_lng = $6, status = 'deleted'
              WHERE id = $7`,
              [name, county, township, description, centerLat, centerLng, recordId]
            );
            imported++;
            continue;
          }
        }

        // Check for duplicates by title (只在垃圾桶中檢查)
        if (body.skipDuplicates) {
          const { rows: existing } = await app.db.query(
            'SELECT id FROM disaster_areas WHERE name = $1 AND status = $2',
            [name, 'deleted']
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // 插入新的垃圾桶災區（使用 CSV 的 ID 或生成新的）
        const areaId = recordId || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await app.db.query(
          `INSERT INTO disaster_areas (
            id, name, county, township, description, center_lat, center_lng, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'deleted')
          ON CONFLICT (id) DO NOTHING`,
          [areaId, name, county, township, description, centerLat, centerLng]
        );

        imported++;
      }

      app.log.info(`[csv] Trash areas import completed: ${imported} imported, ${skipped} skipped`);
      return {
        success: true,
        message: `匯入完成：成功 ${imported} 筆，略過 ${skipped} 筆`,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import trash disaster areas');
      return reply.status(500).send({ message: 'Failed to import trash disaster areas', error: err.message });
    }
  });

  // ==================== 垃圾桶網格 CSV 匯出 ====================

  // Export trash grids to CSV
  app.get('/csv/export/trash-grids', { preHandler: requirePermission('trash_grids', 'view') }, async (req, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    try {
      const { rows } = await app.db.query(
        `SELECT
          g.id, g.code, g.grid_type, g.volunteer_needed, g.volunteer_registered,
          g.meeting_point, g.risks_notes, g.contact_info, g.status,
          g.center_lat, g.center_lng, g.created_at, g.updated_at,
          da.name as area_name
        FROM grids g
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        WHERE g.status = 'deleted'
        ORDER BY g.updated_at DESC`
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
          created_at: '建立時間',
          updated_at: '更新時間'
        }
      });

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `匯出 ${rows.length} 筆垃圾桶網格資料為 CSV`,
        action_type: 'export',
        resource_type: 'grid',
        details: { count: rows.length, trash: true },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      // 添加 UTF-8 BOM 以確保 Excel 正確識別編碼
      const csvWithBOM = '\uFEFF' + csv;

      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="trash_grids_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return reply.send(csvWithBOM);
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to export trash grids');
      return reply.status(500).send({ message: 'Failed to export trash grids' });
    }
  });

  // Import trash grids from CSV
  app.post('/csv/import/trash-grids', { preHandler: requirePermission('trash_grids', 'manage') }, async (req: FastifyRequest, reply) => {
    if (!app.hasDecorator('db')) {
      return reply.status(503).send({ message: 'Database not available' });
    }

    const body = req.body as { csv: string; skipDuplicates?: boolean };

    if (!body.csv) {
      return reply.status(400).send({ message: 'CSV data is required' });
    }

    try {
      // 移除 BOM 字元
      const csvData = removeBOM(body.csv);
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf-8'
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const record of records as any[]) {
        // 支援匯出格式的欄位名稱
        const code = record['網格代碼'] || record['網格代碼（必填）'] || '';
        const gridType = record['類型'] || record['類型（必填）'] || 'manpower';
        const areaName = record['災區名稱'] || record['災區'] || '';
        const volunteerNeeded = parseInt(record['需求人數'] || '0');
        const volunteerRegistered = parseInt(record['已登記人數'] || '0');
        const meetingPoint = record['集合點'] || '';
        const risksNotes = record['風險備註'] || '';
        const contactInfo = record['聯絡資訊'] || '';
        const centerLat = parseFloat(record['緯度'] || record['緯度（必填）'] || '0');
        const centerLng = parseFloat(record['經度'] || record['經度（必填）'] || '0');

        // 驗證必填欄位
        if (!code || !areaName || isNaN(centerLat) || isNaN(centerLng)) {
          errors.push(`缺少必填欄位（網格代碼、災區名稱、緯度、經度）: ${JSON.stringify(record)}`);
          continue;
        }

        // 檢查是否存在相同代碼的網格
        const { rows: existingGrids } = await app.db.query(
          `SELECT id, status FROM grids WHERE code = $1`,
          [code]
        );

        // 如果存在相同代碼的網格
        if (existingGrids.length > 0) {
          const existingGrid = existingGrids[0];

          // 如果現有網格狀態為 open，將其改為 deleted（移回垃圾桶）
          if (existingGrid.status === 'open') {
            await app.db.query(
              `UPDATE grids SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
              [existingGrid.id]
            );
            imported++;
            continue;
          }

          // 如果現有網格已經在垃圾桶中且設定了跳過重複
          if (existingGrid.status === 'deleted' && body.skipDuplicates) {
            skipped++;
            continue;
          }
        }

        // 尋找或建立災區
        let areaId: string;
        const { rows: areas } = await app.db.query(
          'SELECT id FROM disaster_areas WHERE name = $1',
          [areaName]
        );

        if (areas.length > 0) {
          areaId = areas[0].id;
        } else {
          // 建立新的災區（標記為已刪除的災區）
          const newAreaId = `area_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
          await app.db.query(
            `INSERT INTO disaster_areas (id, name, center_lat, center_lng, status, deleted_at)
             VALUES ($1, $2, $3, $4, 'deleted', NOW())`,
            [newAreaId, areaName, centerLat, centerLng]
          );
          areaId = newAreaId;
        }

        // 插入新的垃圾桶網格
        const gridId = `grid_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        await app.db.query(
          `INSERT INTO grids (
            id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
            meeting_point, risks_notes, contact_info, center_lat, center_lng,
            status, created_by_id, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'deleted', $12, $13, NOW(), NOW())`,
          [
            gridId, code, gridType, areaId, volunteerNeeded, volunteerRegistered,
            meetingPoint, risksNotes, contactInfo, centerLat, centerLng,
            req.user?.id, req.user?.name || 'CSV Import'
          ]
        );
        imported++;
      }

      // 記錄審計日誌
      await createAdminAuditLog(app, {
        user_id: req.user?.id,
        user_role: req.user?.role || 'unknown',
        line_id: req.user?.id || '',
        line_name: req.user?.name || '',
        action: `匯入 ${imported} 筆垃圾桶網格資料（略過 ${skipped} 筆）`,
        action_type: 'import',
        resource_type: 'grid',
        details: { imported, skipped, errors: errors.length, trash: true },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      app.log.info(`[csv] Trash grids import completed: ${imported} imported, ${skipped} skipped`);
      return {
        success: true,
        message: `匯入完成：成功 ${imported} 筆，略過 ${skipped} 筆`,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err: any) {
      app.log.error({ err }, '[csv] Failed to import trash grids');
      return reply.status(500).send({ message: 'Failed to import trash grids', error: err.message });
    }
  });
}