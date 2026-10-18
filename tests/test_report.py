"""ทดสอบรายงานรายเดือน (W4-B) — เพิ่มใหม่ ไม่ได้แก้ test_metrics.py"""
import pytest

from src import metrics as m
from src import report


@pytest.fixture(scope="module")
def df():
    return m.load_orders()


def test_report_2026_03_net_sales(df):
    r = report.build_report(df, "2026-03")
    assert r["net_sales"] == pytest.approx(1_147_155, abs=1)
    assert r["prev_month"] == "2026-02"


def test_report_markdown_shows_net_sales(df, tmp_path):
    path = report.write_report(df, "2026-03", out_dir=tmp_path)
    text = path.read_text(encoding="utf-8")
    assert "1,147,155 บาท" in text
    assert "5 สินค้าขายดี" in text


def test_report_top5_and_rates(df):
    r = report.build_report(df, "2026-03")
    top = r["top_products"]
    assert len(top) == 5
    assert list(top["net"]) == sorted(top["net"], reverse=True)
    assert 0 <= r["cancel_rate"] <= 100 and 0 <= r["return_rate"] <= 100


def test_report_rejects_bad_month(df):
    with pytest.raises(ValueError):
        report.build_report(df, "2026/03")
