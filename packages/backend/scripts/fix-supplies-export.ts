import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.join(__dirname, '../src/routes/csv.ts');
let content = fs.readFileSync(csvPath, 'utf8');

// 替換 SELECT 查詢
const oldQuery = `        \`SELECT
          sd.id, sd.donor_name, sd.donor_phone, sd.supply_items,
          sd.quantity, sd.status, sd.created_at,
          g.code as grid_code,
          da.name as area_name
        FROM supply_donations sd
        LEFT JOIN grids g ON sd.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY sd.created_at DESC\``;

const newQuery = `        \`SELECT
          sd.id, sd.donor_name, sd.donor_phone, sd.donor_email,
          sd.supply_name, sd.quantity, sd.unit,
          sd.delivery_method, sd.delivery_address, sd.delivery_time,
          sd.notes, sd.status, sd.created_at,
          g.code as grid_code,
          da.name as area_name
        FROM supply_donations sd
        LEFT JOIN grids g ON sd.grid_id = g.id
        LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
        ORDER BY sd.created_at DESC\``;

content = content.replace(oldQuery, newQuery);

// 替換 columns 映射
const oldColumns = `        columns: {
          id: 'ID',
          donor_name: '捐贈者姓名',
          donor_phone: '電話',
          supply_items: '物資項目',
          quantity: '數量',
          status: '狀態',
          grid_code: '網格代碼',
          area_name: '災區',
          created_at: '捐贈時間'
        }`;

const newColumns = `        columns: {
          id: 'ID',
          grid_code: '網格代碼',
          area_name: '災區',
          supply_name: '物資名稱',
          quantity: '數量',
          unit: '單位',
          donor_name: '捐贈者姓名',
          donor_phone: '聯絡電話',
          donor_email: 'Email',
          delivery_method: '配送方式',
          delivery_address: '送達地址',
          delivery_time: '預計送達時間',
          notes: '備註',
          status: '狀態',
          created_at: '捐贈時間'
        }`;

content = content.replace(oldColumns, newColumns);

fs.writeFileSync(csvPath, content, 'utf8');
console.log('✅ 已修復物資匯出功能');
