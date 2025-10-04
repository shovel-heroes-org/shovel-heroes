import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function checkPermission() {
  try {
    console.log('檢查「檢視聯絡資訊」權限設定...\n');

    const { rows } = await pool.query(`
      SELECT
        role,
        permission_name,
        permission_category,
        can_view,
        can_manage,
        description
      FROM role_permissions
      WHERE permission_key = 'view_contact_info'
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
        END
    `);

    if (rows.length === 0) {
      console.log('❌ 未找到「檢視聯絡資訊」權限');
      return;
    }

    console.log('✅ 找到以下權限設定：\n');
    rows.forEach(row => {
      console.log(`角色: ${row.role}`);
      console.log(`  權限名稱: ${row.permission_name}`);
      console.log(`  分類: ${row.permission_category}`);
      console.log(`  可檢視: ${row.can_view === 1 ? '✓' : '✗'}`);
      console.log(`  可管理: ${row.can_manage === 1 ? '✓' : '✗'}`);
      console.log(`  說明: ${row.description}`);
      console.log('');
    });

  } catch (error) {
    console.error('查詢失敗:', error);
  } finally {
    await pool.end();
  }
}

checkPermission();
