import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovel_heroes'
});

async function runMigration() {
  try {
    console.log('開始執行 supply_donations 表欄位遷移...\n');

    // 檢查欄位是否已存在
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'supply_donations'
      AND column_name IN ('supply_name', 'donor_name', 'donor_phone', 'donor_email', 'delivery_method', 'delivery_address', 'delivery_time', 'notes', 'status', 'created_by_id', 'created_by', 'updated_at')
    `);

    const existingColumns = rows.map(r => r.column_name);
    console.log('已存在的欄位:', existingColumns);

    // 添加缺少的欄位
    if (!existingColumns.includes('supply_name')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN supply_name TEXT');
      console.log('✓ 已添加 supply_name 欄位');
    }

    if (!existingColumns.includes('donor_name')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN donor_name TEXT');
      console.log('✓ 已添加 donor_name 欄位');
    }

    if (!existingColumns.includes('donor_phone')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN donor_phone TEXT');
      console.log('✓ 已添加 donor_phone 欄位');
    }

    if (!existingColumns.includes('donor_email')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN donor_email TEXT');
      console.log('✓ 已添加 donor_email 欄位');
    }

    if (!existingColumns.includes('delivery_method')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_method TEXT');
      console.log('✓ 已添加 delivery_method 欄位');
    }

    if (!existingColumns.includes('delivery_address')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_address TEXT');
      console.log('✓ 已添加 delivery_address 欄位');
    }

    if (!existingColumns.includes('delivery_time')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN delivery_time TEXT');
      console.log('✓ 已添加 delivery_time 欄位');
    }

    if (!existingColumns.includes('notes')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN notes TEXT');
      console.log('✓ 已添加 notes 欄位');
    }

    if (!existingColumns.includes('status')) {
      await pool.query("ALTER TABLE supply_donations ADD COLUMN status TEXT DEFAULT 'pledged'");
      await pool.query("UPDATE supply_donations SET status = 'pledged' WHERE status IS NULL");
      console.log('✓ 已添加 status 欄位');
    }

    if (!existingColumns.includes('created_by_id')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN created_by_id TEXT');
      console.log('✓ 已添加 created_by_id 欄位');
    }

    if (!existingColumns.includes('created_by')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN created_by TEXT');
      console.log('✓ 已添加 created_by 欄位');
    }

    if (!existingColumns.includes('updated_at')) {
      await pool.query('ALTER TABLE supply_donations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
      console.log('✓ 已添加 updated_at 欄位');
    }

    console.log('\n✅ 遷移成功完成！');
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
