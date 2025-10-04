import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function checkDonationsCreatedBy() {
  try {
    console.log('檢查物資捐贈表的 created_by_id 欄位...\n');

    // 檢查表結構
    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'supply_donations'
      AND column_name IN ('id', 'donor_name', 'donor_phone', 'created_by_id')
      ORDER BY ordinal_position
    `);

    console.log('📋 表結構：');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 檢查資料
    const { rows: donations } = await pool.query(`
      SELECT id, supply_name, donor_name, donor_phone, created_by_id, created_by
      FROM supply_donations
      LIMIT 10
    `);

    console.log(`\n📊 前 10 筆捐贈資料：`);
    console.log(`總共 ${donations.length} 筆\n`);

    donations.forEach(d => {
      console.log(`ID: ${d.id}`);
      console.log(`  物資: ${d.supply_name}`);
      console.log(`  捐贈者: ${d.donor_name}`);
      console.log(`  電話: ${d.donor_phone || '(無)'}`);
      console.log(`  created_by_id: ${d.created_by_id || '(NULL)'}`);
      console.log(`  created_by: ${d.created_by || '(NULL)'}`);
      console.log('');
    });

    // 統計有 created_by_id 的比例
    const { rows: stats } = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(created_by_id) as with_created_by_id,
        COUNT(*) - COUNT(created_by_id) as without_created_by_id
      FROM supply_donations
    `);

    console.log('📈 統計：');
    console.log(`  總數: ${stats[0].total}`);
    console.log(`  有 created_by_id: ${stats[0].with_created_by_id} (${Math.round(stats[0].with_created_by_id / stats[0].total * 100)}%)`);
    console.log(`  無 created_by_id: ${stats[0].without_created_by_id} (${Math.round(stats[0].without_created_by_id / stats[0].total * 100)}%)`);

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDonationsCreatedBy();
