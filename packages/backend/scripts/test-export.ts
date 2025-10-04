import { config } from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../src/lib/db.js';
import { writeFileSync } from 'fs';

// 載入環境變數
config({ path: resolve(process.cwd(), '../../.env') });

async function testExport() {
  const pool = createPool();

  try {
    console.log('測試權限匯出功能...\n');

    // 模擬匯出 API 的查詢
    const { rows } = await pool.query(`
      SELECT
        id,
        role,
        permission_key,
        permission_name,
        permission_category,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_manage,
        description
      FROM role_permissions
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
        END,
        permission_category,
        permission_name
    `);

    console.log(`查詢到 ${rows.length} 筆權限資料\n`);

    // 產生 CSV
    const headers = [
      'ID',
      '角色',
      '權限鍵值',
      '權限名稱',
      '權限分類',
      '可檢視',
      '可建立',
      '可編輯',
      '可刪除',
      '可管理',
      '說明'
    ];

    const csvRows = [headers.join(',')];

    rows.forEach((row: any) => {
      const values = [
        row.id,
        row.role,
        row.permission_key,
        `"${row.permission_name || ''}"`,
        `"${row.permission_category || ''}"`,
        row.can_view,
        row.can_create,
        row.can_edit,
        row.can_delete,
        row.can_manage,
        `"${row.description || ''}"`
      ];
      csvRows.push(values.join(','));
    });

    const csv = '\uFEFF' + csvRows.join('\n'); // 加上 BOM

    // 儲存到測試檔案
    const filename = `test-permissions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    writeFileSync(filename, csv, 'utf-8');

    console.log(`✅ CSV 檔案已產生: ${filename}`);
    console.log(`檔案大小: ${csv.length} bytes`);
    console.log(`\n前 5 行預覽:`);
    console.log(csvRows.slice(0, 5).join('\n'));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('測試失敗:', error);
    await pool.end();
    process.exit(1);
  }
}

testExport();
