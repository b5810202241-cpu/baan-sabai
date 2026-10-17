// W1-A: ยอดขายสุทธิ = qty * unit_price * (1 - discount_pct/100), เฉพาะ status = "จัดส่งสำเร็จ", ไม่รวมค่าส่ง
const fs = require('fs');

function parseCsv(text) {
  // ตัด BOM ถ้ามี
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

const raw = fs.readFileSync('data/orders_sample_80.csv', 'utf8');
const rows = parseCsv(raw);

console.log('จำนวนแถวทั้งหมดที่อ่านได้:', rows.length);

// นับจำนวนแต่ละ status
const statusCount = {};
rows.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
console.log('จำนวนแต่ละ status:', statusCount);

// คัดเฉพาะ status = จัดส่งสำเร็จ
const delivered = rows.filter(r => r.status === 'จัดส่งสำเร็จ');
const excluded = rows.length - delivered.length;

const netSales = delivered.reduce((sum, r) => {
  const qty = Number(r.qty);
  const unitPrice = Number(r.unit_price);
  const discountPct = Number(r.discount_pct);
  return sum + qty * unitPrice * (1 - discountPct / 100);
}, 0);

console.log('จำนวนแถวที่ถูกนับ (status = จัดส่งสำเร็จ):', delivered.length);
console.log('จำนวนแถวที่ตัดออก:', excluded, '(status อื่นที่ไม่ใช่ "จัดส่งสำเร็จ" เช่น ยกเลิก, คืนสินค้า ฯลฯ)');
console.log('ยอดขายสุทธิ:', netSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'บาท');
