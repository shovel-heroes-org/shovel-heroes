import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

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

    console.log(`⚠️  發現 ${invalidDonations.length} 筆無效資料：\n`);

    invalidDonations.forEach((d, index) => {
      console.log(`${index + 1}. ID: ${d.id}`);
      console.log(`   物資: ${d.supply_name || '(無)'}`);
      console.log(`   建立時間: ${d.created_at}`);
      console.log('');
    });

    console.log('這些資料的特徵：');
    console.log('  - 沒有捐贈者姓名');
    console.log('  - 沒有捐贈者電話');
    console.log('  - 沒有捐贈者 Email');
    console.log('  - 沒有 created_by_id（無法追蹤捐贈者）');
    console.log('');
    console.log('建議：刪除這些無效資料\n');

    const answer = await question('是否要刪除這些無效資料？(yes/no): ');

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('\n🗑️  開始刪除...');

      const { rowCount } = await pool.query(`
        DELETE FROM supply_donations
        WHERE donor_name IS NULL
          AND donor_phone IS NULL
          AND donor_email IS NULL
          AND created_by_id IS NULL
      `);

      console.log(`✅ 成功刪除 ${rowCount} 筆無效資料！`);

      // 再次檢查
      const { rows: remaining } = await pool.query(`
        SELECT COUNT(*) as count
        FROM supply_donations
      `);

      console.log(`\n📊 剩餘物資捐贈資料: ${remaining[0].count} 筆`);

      // 檢查新資料
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
        }
      }

    } else {
      console.log('\n❌ 取消刪除操作');
    }

  } catch (error) {
    console.error('❌ 執行失敗:', error);
    throw error;
  } finally {
    rl.close();
    await pool.end();
  }
}

cleanInvalidDonations();
