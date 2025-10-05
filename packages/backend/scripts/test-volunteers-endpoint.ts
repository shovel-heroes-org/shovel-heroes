import fetch from 'node-fetch';

async function testVolunteersEndpoint() {
  try {
    // 測試不同的 acting role
    const roles = ['super_admin', 'admin', 'grid_manager', 'user'];

    for (const role of roles) {
      console.log(`\n測試角色: ${role}`);
      console.log('='.repeat(50));

      const response = await fetch('http://localhost:8787/volunteers', {
        headers: {
          'Content-Type': 'application/json',
          'x-acting-role': role
        }
      });

      if (response.ok) {
        const data: any = await response.json();
        console.log(`✅ 請求成功`);
        console.log(`can_view_phone: ${data.can_view_phone}`);
        console.log(`資料筆數: ${data.data?.length || 0}`);

        if (data.data && data.data.length > 0) {
          const firstItem = data.data[0];
          console.log(`第一筆資料有電話: ${!!firstItem.volunteer_phone}`);
          if (firstItem.volunteer_phone) {
            console.log(`  電話: ${firstItem.volunteer_phone}`);
          }
        }
      } else {
        console.log(`❌ 請求失敗: ${response.status} ${response.statusText}`);
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

testVolunteersEndpoint();
