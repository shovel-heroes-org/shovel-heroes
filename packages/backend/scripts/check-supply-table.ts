import pg from 'pg';

async function checkSupplyTable() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
  });

  try {
    await client.connect();
    console.log('已連接到資料庫\n');

    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'supply_donations'
      ORDER BY ordinal_position
    `);

    console.log('supply_donations 資料表欄位:');
    console.log('='.repeat(50));
    result.rows.forEach(r => {
      console.log(`  ${r.column_name.padEnd(25)} ${r.data_type}`);
    });
    console.log('='.repeat(50));

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await client.end();
  }
}

checkSupplyTable();
