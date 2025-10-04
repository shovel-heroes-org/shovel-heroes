// 測試權限更新的 audit log 記錄
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testPermissionAuditLog() {
  try {
    console.log('測試權限更新的 Audit Log 記錄功能\n');

    // 替換為實際的 session cookie
    const sessionCookie = 'session=your-session-cookie';

    console.log('1. 取得所有權限...');
    const getResponse = await fetch(`${API_BASE}/api/permissions`, {
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Test Browser'
      }
    });

    if (!getResponse.ok) {
      console.error('❌ 取得權限失敗:', await getResponse.text());
      return;
    }

    const permissions = await getResponse.json();
    console.log(`✅ 取得 ${permissions.length} 條權限資料\n`);

    if (permissions.length === 0) {
      console.log('沒有權限資料');
      return;
    }

    // 測試批次更新
    const testPermission = permissions[0];
    console.log('2. 測試批次更新權限...');
    console.log(`   目標權限: ID=${testPermission.id}, 名稱=${testPermission.permission_name}`);
    console.log(`   當前 can_manage 值: ${testPermission.can_manage}\n`);

    const updateData = {
      permissions: [{
        id: testPermission.id,
        can_manage: testPermission.can_manage === 1 ? 0 : 1
      }]
    };

    const updateResponse = await fetch(`${API_BASE}/api/permissions/batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Test Browser'
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('❌ 更新失敗:', updateResult);
      return;
    }

    console.log('✅ 更新成功:', updateResult);

    // 查詢 audit log
    console.log('\n3. 檢查 Audit Log 記錄...');
    const auditResponse = await fetch(`${API_BASE}/admin/audit-logs?limit=1`, {
      headers: {
        'Cookie': sessionCookie
      }
    });

    if (!auditResponse.ok) {
      console.error('❌ 無法取得 Audit Log:', await auditResponse.text());
      return;
    }

    const auditData = await auditResponse.json();
    if (auditData.logs && auditData.logs.length > 0) {
      const latestLog = auditData.logs[0];
      console.log('\n📋 最新的 Audit Log 記錄:');
      console.log('-----------------------------------');
      console.log(`ID: ${latestLog.id}`);
      console.log(`User ID: ${latestLog.user_id}`);
      console.log(`User Role: ${latestLog.user_role}`);
      console.log(`LINE ID: ${latestLog.line_id || '❌ 未記錄'}`);
      console.log(`LINE 名稱: ${latestLog.line_name || '❌ 未記錄'}`);
      console.log(`Action: ${latestLog.action}`);
      console.log(`Action Type: ${latestLog.action_type}`);
      console.log(`Resource Type: ${latestLog.resource_type}`);
      console.log(`IP 位址: ${latestLog.ip_address || '❌ 未記錄'}`);
      console.log(`User Agent: ${latestLog.user_agent || '❌ 未記錄'}`);
      console.log(`Created At: ${latestLog.created_at}`);
      console.log('-----------------------------------\n');

      // 驗證結果
      const hasLineId = !!latestLog.line_id;
      const hasLineName = !!latestLog.line_name;
      const hasIpAddress = !!latestLog.ip_address;
      const hasUserAgent = !!latestLog.user_agent;

      console.log('✅ 驗證結果:');
      console.log(`   LINE ID: ${hasLineId ? '✅ 已記錄' : '❌ 未記錄'}`);
      console.log(`   LINE 名稱: ${hasLineName ? '✅ 已記錄' : '❌ 未記錄'}`);
      console.log(`   IP 位址: ${hasIpAddress ? '✅ 已記錄' : '❌ 未記錄'}`);
      console.log(`   User Agent: ${hasUserAgent ? '✅ 已記錄' : '❌ 未記錄'}`);

      if (hasLineId && hasLineName && hasIpAddress && hasUserAgent) {
        console.log('\n🎉 所有欄位都正確記錄！');
      } else {
        console.log('\n⚠️ 部分欄位未記錄，請檢查程式碼');
      }
    } else {
      console.log('❌ 沒有找到 Audit Log 記錄');
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testPermissionAuditLog();
