import pg from 'pg';

async function checkDeliveryTime() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes'
  });

  try {
    await client.connect();
    console.log('已連接到資料庫');

    const result = await client.query(`
      SELECT
        id,
        supply_name,
        delivery_time,
        delivery_method,
        delivery_address,
        created_at
      FROM supply_donations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n最近 10 筆物資捐贈記錄：');
    console.log('='.repeat(80));

    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.supply_name || '未命名'}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   預計送達時間: ${row.delivery_time || '未填寫'}`);
      console.log(`   配送方式: ${row.delivery_method || '未填寫'}`);
      console.log(`   送達地址: ${row.delivery_address || '未填寫'}`);
      console.log(`   建立時間: ${row.created_at}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`共 ${result.rows.length} 筆記錄`);

    const withDeliveryTime = result.rows.filter(r => r.delivery_time);
    console.log(`其中 ${withDeliveryTime.length} 筆有填寫預計送達時間`);

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await client.end();
  }
}

checkDeliveryTime();
