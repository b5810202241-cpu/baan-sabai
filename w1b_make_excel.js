const fs = require('fs');
const XLSX = require('xlsx');

const r = JSON.parse(fs.readFileSync('w1b_result.json', 'utf8'));
const wb = XLSX.utils.book_new();

// Sheet 1: สรุป
const summaryRows = [
  ['รายการ', 'ค่า'],
  ['จำนวนแถวทั้งหมด (orders.csv)', r.shape[0]],
  ['จำนวนแถว จัดส่งสำเร็จ', r.statusCount['จัดส่งสำเร็จ']],
  ['จำนวนแถว ยกเลิก', r.statusCount['ยกเลิก']],
  ['จำนวนแถว คืนสินค้า', r.statusCount['คืนสินค้า']],
  ['ยอดรวมแบบนับทุกสถานะ (ไม่หักส่วนลด)', r.sumAllStatus],
  ['ยอดขายสุทธิ (ตามนิยาม)', r.netSales],
  ['กำไรขั้นต้น', r.grossProfit],
  ['AOV (บาท/ออเดอร์)', r.aov],
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุป');

// Sheet 2: ยอดรายเดือน
const monthlyRows = [['เดือน', 'ยอดขายสุทธิ'], ...r.monthly.map(m => [m.month, m.netSales])];
const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyRows);
XLSX.utils.book_append_sheet(wb, wsMonthly, 'ยอดรายเดือน');

// Sheet 3: สัดส่วนช่องทาง
const channelRows = [['ช่องทาง', 'ยอดขายสุทธิ', 'สัดส่วน (%)'], ...r.channel.map(c => [c.channel, c.netSales, c.pct])];
const wsChannel = XLSX.utils.aoa_to_sheet(channelRows);
XLSX.utils.book_append_sheet(wb, wsChannel, 'สัดส่วนช่องทาง');

// Sheet 4: เทียบไตรมาส
const qKeys = Object.keys(r.quarterCompare);
const quarterRows = [
  ['รายการ', ...qKeys],
  ['จำนวนออเดอร์', ...qKeys.map(k => r.quarterCompare[k].orders)],
  ['ยอดขายสุทธิ', ...qKeys.map(k => r.quarterCompare[k].netSales)],
  ['กำไรขั้นต้น', ...qKeys.map(k => r.quarterCompare[k].grossProfit)],
  ['AOV', ...qKeys.map(k => r.quarterCompare[k].aov)],
];
const wsQuarter = XLSX.utils.aoa_to_sheet(quarterRows);
XLSX.utils.book_append_sheet(wb, wsQuarter, 'เทียบไตรมาส');

fs.mkdirSync('reports', { recursive: true });
XLSX.writeFile(wb, 'reports/w1b_summary.xlsx');
console.log('สร้างไฟล์ reports/w1b_summary.xlsx แล้ว');
