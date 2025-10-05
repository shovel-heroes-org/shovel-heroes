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

    console.log('檢查 announcements 資料表結構...\n');

    // 檢查資料表結構
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      ORDER BY ordinal_position
    `);

    console.log('欄位列表:');
    schema.rows.forEach((col: any) => {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} nullable: ${col.is_nullable.padEnd(5)} default: ${col.column_default || '(無)'}`);
    });

    // 檢查是否有已刪除的公告
    const announcements = await client.query(`
      SELECT id, title, is_deleted, deleted_at
      FROM announcements
      LIMIT 10
    `);

    console.log(`\n找到 ${announcements.rowCount} 筆公告 (最多顯示10筆):\n`);
    announcements.rows.forEach((a: any) => {
      console.log(`  ID: ${a.id}`);
      console.log(`    標題: ${a.title}`);
      console.log(`    is_deleted: ${a.is_deleted}`);
      console.log(`    deleted_at: ${a.deleted_at || '(無)'}\n`);
    });

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
})();
