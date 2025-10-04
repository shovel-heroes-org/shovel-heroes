import { createPool } from '../src/lib/db.js';

async function checkGridsTable() {
  const pool = createPool();

  try {
    console.log('檢查 grids 資料表結構...\n');

    // 查詢資料表欄位資訊
    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'grids'
      ORDER BY ordinal_position
    `);

    console.log('=== 實際資料庫中的 grids 表欄位 ===\n');
    result.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? '可NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`${col.column_name.padEnd(25)} ${col.data_type.padEnd(30)} ${nullable}${defaultVal}`);
    });

    console.log(`\n總共 ${result.rows.length} 個欄位`);

    // 讀取 db-init.ts 中定義的欄位（供比對）
    console.log('\n\n=== db-init.ts 中定義的欄位 ===');
    console.log(`
    id
    code
    grid_type
    disaster_area_id
    volunteer_needed
    volunteer_registered
    meeting_point
    risks_notes
    contact_info
    center_lat
    center_lng
    bounds
    status
    supplies_needed
    grid_manager_id
    completion_photo
    created_by_id
    created_by
    is_sample
    created_at
    updated_at
    created_date
    updated_date
    `);

    // 比對差異
    const dbColumns = result.rows.map((r: any) => r.column_name);
    const codeColumns = [
      'id', 'code', 'grid_type', 'disaster_area_id', 'volunteer_needed',
      'volunteer_registered', 'meeting_point', 'risks_notes', 'contact_info',
      'center_lat', 'center_lng', 'bounds', 'status', 'supplies_needed',
      'grid_manager_id', 'completion_photo', 'created_by_id', 'created_by',
      'is_sample', 'created_at', 'updated_at', 'created_date', 'updated_date'
    ];

    const missingInDb = codeColumns.filter(col => !dbColumns.includes(col));
    const extraInDb = dbColumns.filter(col => !codeColumns.includes(col));

    if (missingInDb.length > 0) {
      console.log('\n\n⚠️  db-init.ts 中有定義但資料庫中缺少的欄位:');
      missingInDb.forEach(col => console.log(`  - ${col}`));
    }

    if (extraInDb.length > 0) {
      console.log('\n\n✨ 資料庫中存在但 db-init.ts 中未定義的欄位:');
      extraInDb.forEach(col => console.log(`  - ${col}`));
    }

    if (missingInDb.length === 0 && extraInDb.length === 0) {
      console.log('\n\n✅ 資料庫結構與 db-init.ts 定義完全一致');
    }

    process.exit(0);
  } catch (error) {
    console.error('檢查失敗:', error);
    process.exit(1);
  }
}

checkGridsTable();
