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

    console.log('檢查志工報名資料...\n');

    // 取得志工報名
    const vr = await client.query(`
      SELECT vr.*, g.created_by_id as grid_creator_id, g.grid_manager_id, g.code as grid_code
      FROM volunteer_registrations vr
      LEFT JOIN grids g ON g.id = vr.grid_id
      ORDER BY vr.created_at DESC
      LIMIT 5
    `);

    console.log(`找到 ${vr.rowCount} 筆志工報名:\n`);
    vr.rows.forEach((r: any) => {
      console.log(`ID: ${r.id}`);
      console.log(`  志工姓名: ${r.volunteer_name}`);
      console.log(`  電話: ${r.volunteer_phone || '(無)'}`);
      console.log(`  Email: ${r.volunteer_email || '(無)'}`);
      console.log(`  網格: ${r.grid_code} (ID: ${r.grid_id})`);
      console.log(`  網格建立者: ${r.grid_creator_id || '(無)'}`);
      console.log(`  網格管理員: ${r.grid_manager_id || '(無)'}`);
      console.log(`  報名者: ${r.user_id || '(無)'}`);
      console.log('  所有欄位:', JSON.stringify(r, null, 2));
      console.log('');
    });

    // 檢查 volunteer_registrations 資料表結構
    console.log('\n檢查 volunteer_registrations 資料表結構:\n');
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'volunteer_registrations'
      ORDER BY ordinal_position
    `);
    schema.rows.forEach((col: any) => {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
})();
