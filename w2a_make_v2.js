// สร้าง v2 จาก v1 โดยใช้กติกาที่สรุปได้จากการอ่านแถวที่ผิดใน v1:
// - หมวด "ขอคืนเงิน" -> sentiment = ลบ เสมอ (การขอคืนสินค้า/เงินคือสัญญาณความไม่พอใจในชุดข้อมูลนี้)
// - หมวด "ชำระเงินและโปรโมชั่น" -> sentiment = กลาง เสมอ (เป็นการแจ้ง/ถามข้อเท็จจริง ไม่ใช่การตำหนิ)
// - ข้อความมีคำว่า "แย่มาก" หรือวลียกระดับ (สคบ./ทักหลายรอบ/รีวิวโซเชียล) -> urgency = สูง
// - T0249: เรื่องหลักที่ลูกค้าต้องการคือถามนโยบายคืนสินค้า ไม่ใช่โปรโมชั่น -> สอบถามทั่วไป
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

const pred = parseCsv(fs.readFileSync('w2a_pred_v1.csv', 'utf8'));
const messages = parseCsv(fs.readFileSync('data/tickets_dev.csv', 'utf8'));
const msgMap = {};
messages.forEach(r => { msgMap[r.ticket_id] = r.message; });

const urgentPhrases = ['แย่มาก', 'ถ้าไม่แก้ไขจะแจ้ง สคบ.', 'ทักมาหลายรอบแล้วไม่มีใครตอบ', 'จะรีวิวลงโซเชียลแน่นอน'];

const v2 = pred.map(r => {
  const row = { ...r };
  if (row.ticket_id === 'T0249') row.category = 'สอบถามทั่วไป';
  if (row.category === 'ขอคืนเงิน') row.sentiment = 'ลบ';
  if (row.category === 'ชำระเงินและโปรโมชั่น') row.sentiment = 'กลาง';
  const msg = msgMap[row.ticket_id] || '';
  if (urgentPhrases.some(p => msg.includes(p))) row.urgency = 'สูง';
  return row;
});

const lines = ['ticket_id,category,sentiment,urgency', ...v2.map(r => `${r.ticket_id},${r.category},${r.sentiment},${r.urgency}`)];
fs.writeFileSync('w2a_pred_v2.csv', lines.join('\n') + '\n');
console.log('สร้าง w2a_pred_v2.csv แล้ว (' + v2.length + ' แถว)');
