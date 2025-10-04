import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function cleanInvalidDonations() {
  try {
    console.log('🔍 檢查無效的物資捐贈資料...\n');

    // 查詢無效資料
    const { rows: invalidDonations } = await pool.query(`
      SELECT
        id,
        supply_name,
        donor_name,
        donor_phone,
        donor_email,
        created_by_id,
        created_by,
        created_at
      FROM supply_donations
      WHERE donor_name IS NULL
        AND donor_phone IS NULL
        AND donor_email IS NULL
        AND created_by_id IS NULL
      ORDER BY created_at DESC
    `);

    if (invalidDonations.length === 0) {
      console.log('✅ 沒有發現無效的捐贈資料！');
      return;
    }

    console.log(`⚠️  發現 ${invalidDonations.length} 筆無效資料\n`);

    console.log('這些資料的特徵：');
    console.log('  - 沒有捐贈者姓名');
    console.log('  - 沒有捐贈者電話');
    console.log('  - 沒有捐贈者 Email');
    console.log('  - 沒有 created_by_id（無法追蹤捐贈者）');
    console.log('');

    console.log('🗑️  開始刪除無效資料...\n');

    const { rowCount } = await pool.query(`
      DELETE FROM supply_donations
      WHERE donor_name IS NULL
        AND donor_phone IS NULL
        AND donor_email IS NULL
        AND created_by_id IS NULL
    `);

    console.log(`✅ 成功刪除 ${rowCount} 筆無效資料！\n`);

    // 再次檢查
    const { rows: remaining } = await pool.query(`
      SELECT COUNT(*) as count
      FROM supply_donations
    `);

    console.log(`📊 剩餘物資捐贈資料: ${remaining[0].count} 筆`);

    // 檢查新資料的 created_by_id 填寫率
    const { rows: recent } = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(created_by_id) as with_created_by_id
      FROM supply_donations
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    if (recent[0].total > 0) {
      const percentage = Math.round((recent[0].with_created_by_id / recent[0].total) * 100);
      console.log(`\n📈 最近 30 天的資料：`);
      console.log(`  總數: ${recent[0].total}`);
      console.log(`  有 created_by_id: ${recent[0].with_created_by_id} (${percentage}%)`);

      if (percentage < 100) {
        console.log('\n⚠️  警告：仍有新資料沒有正確儲存 created_by_id！');
        console.log('   請檢查 packages/backend/src/routes/supply-donations.ts');
      } else {
        console.log('\n✅ 新資料都正確儲存了 created_by_id！');
      }
    }

    // 顯示範例資料
    const { rows: samples } = await pool.query(`
      SELECT
        id,
        supply_name,
        donor_name,
        created_by_id IS NOT NULL as has_creator
      FROM supply_donations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (samples.length > 0) {
      console.log(`\n📋 最新 5 筆捐贈資料：`);
      samples.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.supply_name || '(無物資名稱)'} - 捐贈者: ${s.donor_name || '(匿名)'} - ${s.has_creator ? '✅ 有 creator' : '❌ 無 creator'}`);
      });
    }

  } catch (error) {
    console.error('❌ 執行失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanInvalidDonations();
