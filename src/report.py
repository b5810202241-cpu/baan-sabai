"""สร้างรายงานรายเดือน reports/monthly_report.md

ใช้งาน:  python -m src.report 2026-03
ทุกตัวเลขคำนวณผ่านฟังก์ชันใน src/metrics.py เท่านั้น
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

from src import metrics as m

REPORTS = Path(__file__).resolve().parent.parent / "reports"


def build_report(df: pd.DataFrame, month: str) -> dict:
    """คำนวณตัวเลขของรายงานเดือน month คืน dict ที่ใช้ทั้งเขียนไฟล์และทดสอบ"""
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise ValueError(f"รูปแบบเดือนต้องเป็น YYYY-MM ได้ {month!r}")
    cur = m.month_orders(df, month)
    if cur.empty:
        raise ValueError(f"ไม่มีข้อมูลเดือน {month}")
    prev_month = m.previous_month(df, month)
    net = m.net_sales(cur)
    prev_net = m.net_sales(m.month_orders(df, prev_month)) if prev_month else None
    change = (net / prev_net - 1) * 100 if prev_net else None
    start, end = cur["date"].min(), cur["date"].max()
    return {
        "month": month,
        "rows": len(cur),
        "status_counts": cur["status"].value_counts().to_dict(),
        "net_sales": net,
        "prev_month": prev_month,
        "prev_net_sales": prev_net,
        "change_pct": change,
        "top_products": m.top_products(cur, 5),
        "cancel_rate": m.cancel_rate(cur),
        "return_rate": m.return_rate(cur, start_date=start, end_date=end),
    }


def render_markdown(r: dict) -> str:
    baht = lambda x: f"{x:,.0f} บาท"
    lines = [f"# รายงานยอดขายรายเดือน · บ้านสบาย ช็อป · {r['month']}", ""]
    status = " · ".join(f"{k} {v:,}" for k, v in r["status_counts"].items())
    lines += [f"ตรวจข้อมูล: {r['rows']:,} แถว ({status})", ""]
    lines += ["## สรุป", "", "| ตัวชี้วัด | ค่า |", "|---|---:|",
              f"| ยอดขายสุทธิ | {baht(r['net_sales'])} |"]
    if r["prev_month"]:
        lines.append(f"| ยอดขายสุทธิเดือนก่อน ({r['prev_month']}) | {baht(r['prev_net_sales'])} |")
        lines.append(f"| เปลี่ยนแปลงจากเดือนก่อน | {r['change_pct']:+.1f}% |")
    else:
        lines.append("| เทียบเดือนก่อน | ไม่มีข้อมูลเดือนก่อน |")
    lines += [f"| อัตรายกเลิก | {r['cancel_rate']:.2f}% |",
              f"| อัตราคืนสินค้า | {r['return_rate']:.2f}% |", ""]
    lines += ["## 5 สินค้าขายดี (ตามยอดขายสุทธิ)", "",
              "| อันดับ | รหัส | สินค้า | จำนวนชิ้น | ยอดขายสุทธิ |", "|---:|---|---|---:|---:|"]
    for i, p in enumerate(r["top_products"].itertuples(index=False), 1):
        lines.append(f"| {i} | {p.product_id} | {p.product_name} | {p.qty:,} | {baht(p.net)} |")
    lines += ["", "_นิยามตาม CLAUDE.md: ยอดขายสุทธิ = qty × unit_price × (1 − discount_pct/100) "
              "เฉพาะ status = จัดส่งสำเร็จ ไม่รวม shipping_fee · อัตรายกเลิก/คืน = จำนวนแถวสถานะนั้น ÷ "
              "คำสั่งซื้อทั้งหมดของเดือน × 100_", ""]
    return "\n".join(lines)


def write_report(df: pd.DataFrame, month: str, out_dir: Path = REPORTS) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "monthly_report.md"
    path.write_text(render_markdown(build_report(df, month)), encoding="utf-8")
    return path


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="สร้าง reports/monthly_report.md")
    ap.add_argument("month", help="เดือนรูปแบบ YYYY-MM เช่น 2026-03")
    args = ap.parse_args(argv)
    path = write_report(m.load_orders(), args.month)
    print(f"เขียนรายงานแล้ว: {path}")


if __name__ == "__main__":
    main()
