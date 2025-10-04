import type { Pool } from 'pg';

export async function addSupplyDonationsFields(pool: Pool) {
  console.log('Adding delivery fields to supply_donations table...');

  try {
    // 檢查欄位是否已存在
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'supply_donations'
      AND column_name IN ('delivery_method', 'delivery_address', 'delivery_time', 'notes', 'status')
    `);

    const existingColumns = rows.map(r => r.column_name);

    // 添加缺少的欄位
    if (!existingColumns.includes('delivery_method')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_method TEXT');
      console.log('✓ Added delivery_method column');
    }

    if (!existingColumns.includes('delivery_address')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_address TEXT');
      console.log('✓ Added delivery_address column');
    }

    if (!existingColumns.includes('delivery_time')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_time TEXT');
      console.log('✓ Added delivery_time column');
    }

    if (!existingColumns.includes('notes')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN notes TEXT');
      console.log('✓ Added notes column');
    }

    if (!existingColumns.includes('status')) {
      await pool.query("ALTER TABLE supply_donations ADD COLUMN status TEXT DEFAULT 'pledged'");
      console.log('✓ Added status column');
    }

    console.log('Successfully added all delivery fields to supply_donations table');
  } catch (error) {
    console.error('Error adding supply_donations fields:', error);
    throw error;
  }
}
