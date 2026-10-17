// วัดผล W2-A: เทียบไฟล์ทำนายกับ gold ด้วย ticket_id
const fs = require('fs');

// รองรับฟิลด์ที่ครอบด้วย "..." ซึ่งอาจมี comma หรือขึ้นบรรทัดใหม่อยู่ข้างใน (RFC4180 แบบย่อ)
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter(r => !(r.length === 1 && r[0] === ''));
  const headers = nonEmpty[0];
  return nonEmpty.slice(1).map(cells => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i]; });
    return obj;
  });
}

const predFile = process.argv[2] || 'w2a_pred_v1.csv';
const goldFile = process.argv[3] || 'data/tickets_dev_gold.csv';
const messagesFile = process.argv[4] || 'data/tickets_dev.csv';

const pred = parseCsv(fs.readFileSync(predFile, 'utf8'));
const gold = parseCsv(fs.readFileSync(goldFile, 'utf8'));
const messages = parseCsv(fs.readFileSync(messagesFile, 'utf8'));

const predMap = {};
pred.forEach(r => { predMap[r.ticket_id] = r; });
const msgMap = {};
messages.forEach(r => { msgMap[r.ticket_id] = r.message; });

let total = 0;
let correctCategory = 0, correctSentiment = 0, correctUrgency = 0;
const confusion = {}; // confusion[gold][pred] = count
const mismatches = [];

gold.forEach(g => {
  const p = predMap[g.ticket_id];
  if (!p) { console.log('ไม่มีคำทำนายสำหรับ', g.ticket_id); return; }
  total++;
  const catOk = p.category === g.category;
  const sentOk = p.sentiment === g.sentiment;
  const urgOk = p.urgency === g.urgency;
  if (catOk) correctCategory++;
  if (sentOk) correctSentiment++;
  if (urgOk) correctUrgency++;

  confusion[g.category] = confusion[g.category] || {};
  confusion[g.category][p.category] = (confusion[g.category][p.category] || 0) + 1;

  if (!catOk || !sentOk || !urgOk) {
    mismatches.push({
      ticket_id: g.ticket_id,
      message: msgMap[g.ticket_id],
      gold: `${g.category}/${g.sentiment}/${g.urgency}`,
      pred: `${p.category}/${p.sentiment}/${p.urgency}`,
    });
  }
});

console.log('จำนวนทั้งหมด:', total);
console.log('Accuracy - category :', (correctCategory / total * 100).toFixed(1) + '%', `(${correctCategory}/${total})`);
console.log('Accuracy - sentiment:', (correctSentiment / total * 100).toFixed(1) + '%', `(${correctSentiment}/${total})`);
console.log('Accuracy - urgency  :', (correctUrgency / total * 100).toFixed(1) + '%', `(${correctUrgency}/${total})`);

console.log('\n--- Confusion matrix (category): แถว = gold, คอลัมน์ = pred ---');
const categories = [...new Set(gold.map(g => g.category))].sort();
const colWidth = 10;
let header = ''.padEnd(24);
categories.forEach(c => { header += c.slice(0, colWidth).padEnd(colWidth); });
console.log(header);
categories.forEach(gc => {
  let row = gc.padEnd(24);
  categories.forEach(pc => {
    const count = (confusion[gc] && confusion[gc][pc]) || 0;
    row += String(count).padEnd(colWidth);
  });
  console.log(row);
});

console.log('\n--- แถวที่ผิด (' + mismatches.length + ' แถว แสดง 10 แถวแรก) ---');
mismatches.slice(0, 10).forEach(m => {
  console.log(`[${m.ticket_id}] ${m.message}`);
  console.log(`   gold: ${m.gold}  |  pred: ${m.pred}`);
});
