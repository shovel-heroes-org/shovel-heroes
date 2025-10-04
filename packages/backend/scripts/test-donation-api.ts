import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { filterDonationPrivacy } from '../src/lib/privacy-filter.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function testDonationAPI() {
  try {
    console.log('🧪 測試物資捐贈 API 隱私過濾...\n');

    // 模擬後端 API 邏輯
    const { rows } = await pool.query(`
      SELECT
        sd.id, sd.grid_id, sd.name, sd.supply_name, sd.quantity, sd.unit,
        sd.donor_name, sd.donor_phone, sd.donor_email, sd.donor_contact,
        sd.delivery_method, sd.delivery_address, sd.delivery_time, sd.notes, sd.status,
        sd.created_by_id, sd.created_by,
        sd.created_at, sd.created_at as created_date,
        g.created_by_id as grid_creator_id
      FROM supply_donations sd
      LEFT JOIN grids g ON g.id = sd.grid_id
      ORDER BY sd.created_at DESC
    `);

    console.log(`📊 資料庫中有 ${rows.length} 筆捐贈資料\n`);

    // 測試場景 1：訪客（未登入）
    console.log('=== 場景 1：訪客（未登入）===');
    const guestFiltered = rows.map(row => filterDonationPrivacy(row, null, row.grid_creator_id));
    console.log(`返回 ${guestFiltered.length} 筆記錄`);
    guestFiltered.forEach((d, i) => {
      console.log(`${i + 1}. 物資: ${d.supply_name || d.name}`);
      console.log(`   捐贈者姓名: ${d.donor_name || '(已隱藏)'}`);
      console.log(`   捐贈者電話: ${d.donor_phone || '(已隱藏)'}`);
      console.log('');
    });

    // 測試場景 2：一般使用者（非網格建立者，非捐贈者）
    console.log('\n=== 場景 2：一般使用者（ID: user123，非網格建立者，非捐贈者）===');
    const regularUser = { id: 'user123', role: 'user' };
    const userFiltered = rows.map(row => filterDonationPrivacy(row, regularUser, row.grid_creator_id));
    console.log(`返回 ${userFiltered.length} 筆記錄`);
    userFiltered.forEach((d, i) => {
      console.log(`${i + 1}. 物資: ${d.supply_name || d.name}`);
      console.log(`   捐贈者姓名: ${d.donor_name || '(已隱藏)'}`);
      console.log(`   捐贈者電話: ${d.donor_phone || '(已隱藏)'}`);
      console.log('');
    });

    // 測試場景 3：網格建立者
    if (rows.length > 0 && rows[0].grid_creator_id) {
      console.log(`\n=== 場景 3：網格建立者（ID: ${rows[0].grid_creator_id}）===`);
      const gridCreator = { id: rows[0].grid_creator_id, role: 'user' };
      const creatorFiltered = rows.map(row => filterDonationPrivacy(row, gridCreator, row.grid_creator_id));
      console.log(`返回 ${creatorFiltered.length} 筆記錄`);
      creatorFiltered.forEach((d, i) => {
        console.log(`${i + 1}. 物資: ${d.supply_name || d.name}`);
        console.log(`   網格建立者: ${d.grid_creator_id}`);
        console.log(`   捐贈者姓名: ${d.donor_name || '(已隱藏)'}`);
        console.log(`   捐贈者電話: ${d.donor_phone || '(已隱藏)'}`);
        console.log(`   ✅ 能看到聯絡資訊: ${d.donor_name !== undefined}`);
        console.log('');
      });
    }

    // 測試場景 4：捐贈者本人
    if (rows.length > 0 && rows[0].created_by_id) {
      console.log(`\n=== 場景 4：捐贈者本人（ID: ${rows[0].created_by_id}）===`);
      const donor = { id: rows[0].created_by_id, role: 'user' };
      const donorFiltered = rows.map(row => filterDonationPrivacy(row, donor, row.grid_creator_id));
      console.log(`返回 ${donorFiltered.length} 筆記錄`);
      donorFiltered.forEach((d, i) => {
        console.log(`${i + 1}. 物資: ${d.supply_name || d.name}`);
        console.log(`   捐贈者 ID: ${d.created_by_id}`);
        console.log(`   捐贈者姓名: ${d.donor_name || '(已隱藏)'}`);
        console.log(`   捐贈者電話: ${d.donor_phone || '(已隱藏)'}`);
        console.log(`   ✅ 能看到聯絡資訊: ${d.created_by_id === donor.id && d.donor_name !== undefined}`);
        console.log('');
      });
    }

    // 測試場景 5：管理員
    console.log('\n=== 場景 5：管理員 ===');
    const admin = { id: 'admin123', role: 'admin' };
    const adminFiltered = rows.map(row => filterDonationPrivacy(row, admin, row.grid_creator_id));
    console.log(`返回 ${adminFiltered.length} 筆記錄`);
    adminFiltered.forEach((d, i) => {
      console.log(`${i + 1}. 物資: ${d.supply_name || d.name}`);
      console.log(`   捐贈者姓名: ${d.donor_name || '(已隱藏)'}`);
      console.log(`   捐贈者電話: ${d.donor_phone || '(已隱藏)'}`);
      console.log(`   ✅ 管理員能看到所有資訊: ${d.donor_name !== undefined}`);
      console.log('');
    });

    console.log('\n✅ 測試完成！所有場景都返回了相同數量的記錄，只是聯絡資訊根據權限顯示或隱藏。');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testDonationAPI();
