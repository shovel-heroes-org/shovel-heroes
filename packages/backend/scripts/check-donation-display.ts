import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function checkDonationDisplay() {
  try {
    console.log('📊 檢查物資捐贈清單顯示...\n');

    // 檢查所有捐贈資料
    const { rows } = await pool.query(`
      SELECT
        sd.id,
        sd.supply_name,
        sd.name,
        sd.donor_name,
        sd.donor_phone,
        sd.donor_email,
        sd.quantity,
        sd.unit,
        sd.status,
        sd.created_by_id,
        g.code as grid_code,
        g.created_by_id as grid_creator_id
      FROM supply_donations sd
      LEFT JOIN grids g ON g.id = sd.grid_id
      ORDER BY sd.created_at DESC
    `);

    console.log(`總共 ${rows.length} 筆捐贈資料\n`);

    if (rows.length === 0) {
      console.log('⚠️  沒有任何捐贈資料！');
      return;
    }

    rows.forEach((r, i) => {
      console.log(`${i + 1}. 物資: ${r.supply_name || r.name || '(無)'}`);
      console.log(`   數量: ${r.quantity} ${r.unit}`);
      console.log(`   網格: ${r.grid_code || '(無)'}`);
      console.log(`   捐贈者: ${r.donor_name || '(無)'}`);
      console.log(`   電話: ${r.donor_phone || '(無)'}`);
      console.log(`   Email: ${r.donor_email || '(無)'}`);
      console.log(`   狀態: ${r.status}`);
      console.log(`   created_by_id: ${r.created_by_id || '(NULL)'}`);
      console.log(`   grid_creator_id: ${r.grid_creator_id || '(NULL)'}`);

      // 判斷這筆資料是否應該顯示
      const hasContactInfo = r.donor_name || r.donor_phone || r.donor_email;
      const hasSupplyInfo = r.supply_name || r.name;

      if (!hasSupplyInfo) {
        console.log(`   ⚠️  警告：沒有物資名稱！`);
      }

      if (!hasContactInfo && !r.created_by_id) {
        console.log(`   ⚠️  警告：沒有聯絡資訊且沒有 created_by_id！`);
      }

      console.log('');
    });

    // 統計分析
    const stats = {
      total: rows.length,
      withSupplyName: rows.filter(r => r.supply_name || r.name).length,
      withContactInfo: rows.filter(r => r.donor_name || r.donor_phone || r.donor_email).length,
      withCreatedBy: rows.filter(r => r.created_by_id).length,
      valid: rows.filter(r => (r.supply_name || r.name) && (r.donor_name || r.donor_phone || r.donor_email || r.created_by_id)).length
    };

    console.log('📈 統計分析：');
    console.log(`  總數: ${stats.total}`);
    console.log(`  有物資名稱: ${stats.withSupplyName} (${Math.round(stats.withSupplyName / stats.total * 100)}%)`);
    console.log(`  有聯絡資訊: ${stats.withContactInfo} (${Math.round(stats.withContactInfo / stats.total * 100)}%)`);
    console.log(`  有 created_by_id: ${stats.withCreatedBy} (${Math.round(stats.withCreatedBy / stats.total * 100)}%)`);
    console.log(`  有效資料（有物資名稱 且 有聯絡資訊或created_by_id）: ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)`);

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDonationDisplay();
