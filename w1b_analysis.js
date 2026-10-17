// W1-B: ยอดขายสุทธิ, กำไรขั้นต้น, AOV, ยอดรายเดือน, สัดส่วนช่องทาง, เทียบไตรมาส
// นิยาม: ยอดขายสุทธิ = qty * unit_price * (1 - discount_pct/100), เฉพาะ status = "จัดส่งสำเร็จ", ไม่รวมค่าส่ง
const fs = require('fs');

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

const orders = parseCsv(fs.readFileSync('data/orders.csv', 'utf8'));
const products = parseCsv(fs.readFileSync('data/products.csv', 'utf8'));

// df.shape เทียบเท่า
console.log('df.shape ของ orders.csv: (', orders.length, ',', Object.keys(orders[0]).length, ')');

// จำนวนแต่ละ status
const statusCount = {};
orders.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
console.log('จำนวนแต่ละ status:', statusCount);

// ยอดรวมแบบนับทุกสถานะ (ไม่หักส่วนลด, รวมค่าส่ง) เทียบกับแบบที่ถูกต้อง
const sumAllStatus = orders.reduce((s, r) => s + Number(r.qty) * Number(r.unit_price), 0);
const costMap = {};
products.forEach(p => { costMap[p.product_id] = Number(p.unit_cost); });

const delivered = orders.filter(r => r.status === 'จัดส่งสำเร็จ');

let netSales = 0;
let totalCost = 0;
delivered.forEach(r => {
  const qty = Number(r.qty);
  const unitPrice = Number(r.unit_price);
  const discountPct = Number(r.discount_pct);
  const lineNet = qty * unitPrice * (1 - discountPct / 100);
  netSales += lineNet;
  totalCost += qty * (costMap[r.product_id] || 0);
});
const grossProfit = netSales - totalCost;
const aov = netSales / delivered.length;

console.log('\n--- เทียบยอดรวม ---');
console.log('ยอดรวมแบบนับทุกสถานะ (qty*unit_price ไม่หักส่วนลด):', sumAllStatus.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'บาท');
console.log('ยอดขายสุทธิ (ตามนิยาม ถูกต้อง):', netSales.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'บาท');
console.log('\n--- สรุปหลัก (เฉพาะ จัดส่งสำเร็จ จำนวน', delivered.length, 'แถว) ---');
console.log('ยอดขายสุทธิ:', netSales.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'บาท');
console.log('กำไรขั้นต้น:', grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'บาท');
console.log('AOV:', aov.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'บาท/ออเดอร์');

// ยอดรายเดือน (เฉพาะ delivered)
const monthly = {};
delivered.forEach(r => {
  const ym = r.order_datetime.slice(0, 7); // YYYY-MM
  const qty = Number(r.qty);
  const unitPrice = Number(r.unit_price);
  const discountPct = Number(r.discount_pct);
  const lineNet = qty * unitPrice * (1 - discountPct / 100);
  monthly[ym] = (monthly[ym] || 0) + lineNet;
});
const monthlySorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));

console.log('\n--- ยอดขายสุทธิรายเดือน ---');
monthlySorted.forEach(([ym, v]) => console.log(ym, ':', v.toLocaleString('th-TH', { minimumFractionDigits: 2 })));

// สัดส่วนยอดขายตามช่องทาง (เฉพาะ delivered)
const channelSales = {};
delivered.forEach(r => {
  const qty = Number(r.qty);
  const unitPrice = Number(r.unit_price);
  const discountPct = Number(r.discount_pct);
  const lineNet = qty * unitPrice * (1 - discountPct / 100);
  channelSales[r.channel] = (channelSales[r.channel] || 0) + lineNet;
});
const channelSorted = Object.entries(channelSales).sort(([, a], [, b]) => b - a);
console.log('\n--- สัดส่วนยอดขายตามช่องทาง ---');
channelSorted.forEach(([ch, v]) => console.log(ch, ':', v.toLocaleString('th-TH', { minimumFractionDigits: 2 }), '(', (v / netSales * 100).toFixed(1), '%)'));

// เทียบไตรมาส ต.ค.-ธ.ค. 2025 vs ก.ค.-ก.ย. 2026
function inRange(dateStr, start, end) {
  return dateStr >= start && dateStr < end;
}
function quarterStats(start, end) {
  const rows = delivered.filter(r => inRange(r.order_datetime, start, end));
  let ns = 0, cost = 0;
  rows.forEach(r => {
    const qty = Number(r.qty);
    const unitPrice = Number(r.unit_price);
    const discountPct = Number(r.discount_pct);
    ns += qty * unitPrice * (1 - discountPct / 100);
    cost += qty * (costMap[r.product_id] || 0);
  });
  return { orders: rows.length, netSales: ns, grossProfit: ns - cost, aov: rows.length ? ns / rows.length : 0 };
}

const q1 = quarterStats('2025-10-01', '2026-01-01'); // ต.ค.-ธ.ค. 2025
const q2 = quarterStats('2026-07-01', '2026-10-01'); // ก.ค.-ก.ย. 2026

console.log('\n--- เทียบไตรมาส ---');
console.log('ต.ค.-ธ.ค. 2025:', JSON.stringify(q1));
console.log('ก.ค.-ก.ย. 2026:', JSON.stringify(q2));
console.log('เปลี่ยนแปลงยอดขายสุทธิ:', ((q2.netSales - q1.netSales) / q1.netSales * 100).toFixed(1), '%');
console.log('เปลี่ยนแปลงกำไรขั้นต้น:', ((q2.grossProfit - q1.grossProfit) / q1.grossProfit * 100).toFixed(1), '%');

// บันทึกผลเป็น JSON ไว้ใช้สร้าง Excel และกราฟต่อ
const result = {
  shape: [orders.length, Object.keys(orders[0]).length],
  statusCount,
  sumAllStatus,
  netSales,
  grossProfit,
  aov,
  deliveredCount: delivered.length,
  monthly: monthlySorted.map(([ym, v]) => ({ month: ym, netSales: v })),
  channel: channelSorted.map(([ch, v]) => ({ channel: ch, netSales: v, pct: v / netSales * 100 })),
  quarterCompare: {
    'ต.ค.-ธ.ค. 2025': q1,
    'ก.ค.-ก.ย. 2026': q2,
  },
};
fs.writeFileSync('w1b_result.json', JSON.stringify(result, null, 2));
console.log('\nบันทึกผลลง w1b_result.json แล้ว');
