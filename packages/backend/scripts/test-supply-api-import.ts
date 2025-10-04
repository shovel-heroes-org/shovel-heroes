import fs from 'fs';
import path from 'path';

async function testSupplyAPIImport() {
  try {
    // 讀取實際的 CSV 檔案
    const csvPath = path.join(process.cwd(), '..', '..', 'csv', 'supplies_export_2025-10-04 (1).csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('CSV 檔案內容：');
    console.log(csvContent.substring(0, 500));
    console.log('\n...\n');

    // 發送 API 請求
    const response = await fetch('http://localhost:8787/csv/import/supplies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 這裡需要一個有效的 token，先使用測試用的
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        csv: csvContent,
        skipDuplicates: true
      })
    });

    console.log('API 回應狀態:', response.status);
    console.log('API 回應狀態文字:', response.statusText);

    const result = await response.json();
    console.log('\nAPI 回應內容:');
    console.log(JSON.stringify(result, null, 2));

    if (result.errors && result.errors.length > 0) {
      console.log('\n錯誤詳情:');
      result.errors.forEach((err: string, idx: number) => {
        console.log(`${idx + 1}. ${err}`);
      });
    }

  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testSupplyAPIImport();
