// 測試權限更新功能
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testPermissionUpdate() {
  try {
    console.log('1. 取得所有權限...');
    const getResponse = await fetch(`${API_BASE}/api/permissions`, {
      headers: {
        'Cookie': 'session=your-session-cookie' // 需要替換為實際的 session
      }
    });

    if (!getResponse.ok) {
      console.error('取得權限失敗:', await getResponse.text());
      return;
    }

    const permissions = await getResponse.json();
    console.log(`取得 ${permissions.length} 條權限資料`);

    if (permissions.length === 0) {
      console.log('沒有權限資料');
      return;
    }

    // 測試更新第一條權限的 can_manage
    const testPermission = permissions[0];
    console.log('\n2. 測試更新權限:', testPermission);

    const updateData = {
      permissions: [{
        id: testPermission.id,
        can_manage: testPermission.can_manage === 1 ? 0 : 1
      }]
    };

    console.log('更新資料:', updateData);

    const updateResponse = await fetch(`${API_BASE}/api/permissions/batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your-session-cookie' // 需要替換為實際的 session
      },
      body: JSON.stringify(updateData)
    });

    const result = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('\n❌ 更新失敗:', result);
    } else {
      console.log('\n✅ 更新成功:', result);
    }

  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testPermissionUpdate();
