// 測試物資捐贈狀態轉換邏輯

function canTransition(from: string, to: string) {
  if (from === to) return true;
  if (from === 'pledged') return ['confirmed', 'cancelled'].includes(to);
  if (from === 'confirmed') return ['in_transit', 'cancelled'].includes(to);
  if (from === 'in_transit') return ['delivered', 'cancelled'].includes(to);
  if (from === 'delivered') return ['received'].includes(to);
  return false; // received and cancelled are terminal
}

console.log('物資捐贈狀態轉換測試');
console.log('='.repeat(50));

const testCases = [
  // 正常流程
  { from: 'pledged', to: 'confirmed', expected: true, desc: '已承諾 → 已確認' },
  { from: 'confirmed', to: 'in_transit', expected: true, desc: '已確認 → 運送中' },
  { from: 'in_transit', to: 'delivered', expected: true, desc: '運送中 → 已送達' },
  { from: 'delivered', to: 'received', expected: true, desc: '已送達 → 已收到' },

  // 取消流程
  { from: 'pledged', to: 'cancelled', expected: true, desc: '已承諾 → 已取消' },
  { from: 'confirmed', to: 'cancelled', expected: true, desc: '已確認 → 已取消' },
  { from: 'in_transit', to: 'cancelled', expected: true, desc: '運送中 → 已取消' },

  // 非法轉換
  { from: 'pledged', to: 'in_transit', expected: false, desc: '已承諾 ✗→ 運送中（需先確認）' },
  { from: 'pledged', to: 'delivered', expected: false, desc: '已承諾 ✗→ 已送達' },
  { from: 'confirmed', to: 'delivered', expected: false, desc: '已確認 ✗→ 已送達（需先運送）' },
  { from: 'delivered', to: 'cancelled', expected: false, desc: '已送達 ✗→ 已取消（終止狀態）' },
  { from: 'received', to: 'cancelled', expected: false, desc: '已收到 ✗→ 已取消（終止狀態）' },
  { from: 'cancelled', to: 'confirmed', expected: false, desc: '已取消 ✗→ 已確認（終止狀態）' },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = canTransition(test.from, test.to);
  const status = result === test.expected ? '✅' : '❌';

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} ${test.desc}: ${result === test.expected ? 'PASS' : 'FAIL'}`);
  if (result !== test.expected) {
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`總計: ${testCases.length} 測試`);
console.log(`✅ 通過: ${passed}`);
console.log(`❌ 失敗: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
