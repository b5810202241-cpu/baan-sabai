// ทดลองตัดเงื่อนไขทีละข้อ เทียบกับค่าฐาน (ตามนิยามเต็ม)
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

const rows = parseCsv(fs.readFileSync('data/orders_sample_80.csv', 'utf8'));
const fmt = n => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calc({ filterStatus = true, applyDiscount = true, includeShipping = false }) {
  const filtered = filterStatus ? rows.filter(r => r.status === 'จัดส่งสำเร็จ') : rows;
  const total = filtered.reduce((sum, r) => {
    const qty = Number(r.qty);
    const unitPrice = Number(r.unit_price);
    const discountPct = applyDiscount ? Number(r.discount_pct) : 0;
    const shipping = includeShipping ? Number(r.shipping_fee || 0) : 0;
    return sum + qty * unitPrice * (1 - discountPct / 100) + shipping;
  }, 0);
  return { rowsUsed: filtered.length, total };
}

const base = calc({});
const noStatusFilter = calc({ filterStatus: false });
const noDiscount = calc({ applyDiscount: false });
const withShipping = calc({ includeShipping: true });

console.log('ฐาน (นิยามเต็ม):              แถว =', base.rowsUsed, '| ยอดขายสุทธิ =', fmt(base.total), 'บาท');
console.log('ตัดเงื่อนไข status:            แถว =', noStatusFilter.rowsUsed, '| ยอด =', fmt(noStatusFilter.total), 'บาท  (เปลี่ยน', fmt(noStatusFilter.total - base.total), ')');
console.log('ตัดเงื่อนไข discount:          แถว =', noDiscount.rowsUsed, '| ยอด =', fmt(noDiscount.total), 'บาท  (เปลี่ยน', fmt(noDiscount.total - base.total), ')');
console.log('รวมค่าส่งเข้าไปด้วย:            แถว =', withShipping.rowsUsed, '| ยอด =', fmt(withShipping.total), 'บาท  (เปลี่ยน', fmt(withShipping.total - base.total), ')');
