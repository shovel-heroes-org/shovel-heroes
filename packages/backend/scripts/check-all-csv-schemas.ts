import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shovelheroes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const TABLES = [
  'announcements',
  'grids',
  'disaster_areas',
  'volunteer_registrations',
  'supply_donations',
  'users',
  'blacklist'
];

(async () => {
  try {
    const client = await pool.connect();

    console.log('=== 檢查所有資料表結構 (用於CSV匯出匯入) ===\n');

    for (const tableName of TABLES) {
      console.log(`\n[${ tableName.toUpperCase() }]`);
      console.log('='.repeat(80));

      try {
        const schema = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        if (schema.rowCount === 0) {
          console.log(`  ⚠️  表 "${tableName}" 不存在\n`);
          continue;
        }

        console.log('欄位列表:');
        schema.rows.forEach((col: any) => {
          const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
          const hasDefault = col.column_default ? '✓' : '✗';
          console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(30)} nullable:${nullable}  default:${hasDefault}`);
        });

        // 取得範例資料
        const sample = await client.query(`SELECT * FROM ${tableName} LIMIT 1`);
        if (sample.rowCount > 0) {
          console.log('\n範例資料 (第一筆):');
          const row = sample.rows[0];
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (value === null) {
              value = '(NULL)';
            } else if (typeof value === 'object') {
              value = JSON.stringify(value);
            } else if (typeof value === 'string' && value.length > 50) {
              value = value.substring(0, 50) + '...';
            }
            console.log(`  ${key}: ${value}`);
          });
        } else {
          console.log('\n  (無資料)');
        }

      } catch (err: any) {
        console.log(`  ❌ 錯誤: ${err.message}`);
      }
    }

    client.release();
    await pool.end();
    console.log('\n\n✅ 檢查完成!');
    process.exit(0);
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
})();
