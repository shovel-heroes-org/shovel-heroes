import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shovelheroes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

(async () => {
  try {
    const client = await pool.connect();

    console.log('=== 修復志工中心權限設定 ===\n');

    // 1. 修正訪客權限 - 訪客不應該有查看志工的權限
    console.log('1. 修正訪客(guest)的志工查看權限...');
    const guestResult = await client.query(`
      UPDATE role_permissions
      SET can_view = 0
      WHERE role = 'guest' AND permission_key = 'volunteers'
      RETURNING role, permission_key, can_view
    `);
    console.log(`   ✅ 已更新 ${guestResult.rowCount} 筆記錄`);
    if (guestResult.rows.length > 0) {
      console.log(`   設定: ${guestResult.rows[0].role}.${guestResult.rows[0].permission_key} can_view = ${guestResult.rows[0].can_view}\n`);
    }

    // 2. 修正網格管理員權限 - 網格管理員應該可以管理志工
    console.log('2. 修正網格管理員(grid_manager)的管理權限...');
    const gridManagerResult = await client.query(`
      UPDATE role_permissions
      SET can_manage = 1
      WHERE role = 'grid_manager' AND permission_key = 'volunteers'
      RETURNING role, permission_key, can_manage
    `);
    console.log(`   ✅ 已更新 ${gridManagerResult.rowCount} 筆記錄`);
    if (gridManagerResult.rows.length > 0) {
      console.log(`   設定: ${gridManagerResult.rows[0].role}.${gridManagerResult.rows[0].permission_key} can_manage = ${gridManagerResult.rows[0].can_manage}\n`);
    }

    // 3. 修復空字串電話號碼 - 將空字串改為 NULL
    console.log('3. 修復空字串電話號碼資料...');
    const phoneResult = await client.query(`
      UPDATE volunteer_registrations
      SET volunteer_phone = NULL
      WHERE volunteer_phone = ''
      RETURNING id, volunteer_name, volunteer_phone
    `);
    console.log(`   ✅ 已更新 ${phoneResult.rowCount} 筆志工報名記錄\n`);

    // 4. 修復空字串 email
    console.log('4. 修復空字串 email 資料...');
    const emailResult = await client.query(`
      UPDATE volunteer_registrations
      SET volunteer_email = NULL
      WHERE volunteer_email = ''
      RETURNING id, volunteer_name, volunteer_email
    `);
    console.log(`   ✅ 已更新 ${emailResult.rowCount} 筆志工報名記錄\n`);

    // 5. 顯示修復後的權限設定
    console.log('=== 修復後的權限設定 ===\n');
    const permissions = await client.query(`
      SELECT role, permission_key, can_view, can_create, can_edit, can_delete, can_manage
      FROM role_permissions
      WHERE permission_key = 'volunteers'
      ORDER BY
        CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'grid_manager' THEN 3
          WHEN 'user' THEN 4
          WHEN 'guest' THEN 5
          ELSE 6
        END
    `);

    permissions.rows.forEach((p: any) => {
      console.log(`[${p.role}] ${p.permission_key}`);
      console.log(`  can_view: ${p.can_view}`);
      console.log(`  can_create: ${p.can_create}`);
      console.log(`  can_edit: ${p.can_edit}`);
      console.log(`  can_delete: ${p.can_delete}`);
      console.log(`  can_manage: ${p.can_manage}\n`);
    });

    client.release();
    await pool.end();
    console.log('✅ 權限修復完成!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  }
})();
