"""ฟังก์ชันคำนวณตัวชี้วัดของบ้านสบาย ช็อป

ทุกฟังก์ชันรับ DataFrame ที่ได้จาก load_orders() เป็นพารามิเตอร์แรก
นิยามตัวชี้วัดอยู่ใน CLAUDE.md
"""
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"

DELIVERED = "จัดส่งสำเร็จ"
CANCELLED = "ยกเลิก"
RETURNED = "คืนสินค้า"


def load_orders(path: Path | str = DATA / "orders.csv") -> pd.DataFrame:
    """อ่าน orders.csv แล้วเพิ่มคอลัมน์ที่ใช้บ่อย: net, unit_cost, gp, month, date"""
    df = pd.read_csv(path, encoding="utf-8-sig")
    products = pd.read_csv(DATA / "products.csv", encoding="utf-8-sig")
    df = df.merge(products[["product_id", "unit_cost"]], on="product_id", how="left")
    df["net"] = df["qty"] * df["unit_price"] * (1 - df["discount_pct"] / 100)
    df["gp"] = df["net"] - df["qty"] * df["unit_cost"]
    df["month"] = df["order_datetime"].str[:7]
    df["date"] = df["order_datetime"].str[:10]
    return df


def net_sales(df: pd.DataFrame) -> float:
    """ยอดขายสุทธิรวม (บาท)"""
    return df.loc[df["status"] == DELIVERED, "net"].sum()


def gross_profit(df: pd.DataFrame) -> float:
    """กำไรขั้นต้นรวม (บาท)"""
    return df.loc[df["status"] == DELIVERED, "gp"].sum()


def aov(df: pd.DataFrame) -> float:
    """ยอดขายสุทธิเฉลี่ยต่อคำสั่งซื้อที่จัดส่งสำเร็จ (บาท)"""
    delivered = df.loc[df["status"] == DELIVERED]
    return delivered["net"].sum() / len(delivered)


def cancel_rate(df: pd.DataFrame) -> float:
    """อัตรายกเลิกของคำสั่งซื้อทั้งหมดใน df (เปอร์เซ็นต์ 0–100)"""
    return (df["status"] == CANCELLED).sum() / len(df) * 100


def monthly_sales(df: pd.DataFrame) -> pd.Series:
    """ยอดขายสุทธิรายเดือน index = 'YYYY-MM' เรียงตามเวลา"""
    delivered = df.loc[df["status"] == DELIVERED]
    return delivered.groupby("month")["net"].sum().sort_index()


def best_month(df: pd.DataFrame) -> str:
    """เดือนที่ยอดขายสุทธิสูงสุด ('YYYY-MM')"""
    return monthly_sales(df).idxmax()


def channel_share(df: pd.DataFrame, channel: str, start_month: str, end_month: str) -> float:
    """สัดส่วนยอดขายสุทธิของช่องทางในช่วงเดือน start_month..end_month (รวมทั้งสองเดือน) เป็นเปอร์เซ็นต์"""
    in_range = (
        (df["status"] == DELIVERED)
        & (df["month"] >= start_month)
        & (df["month"] <= end_month)
    )
    total = df.loc[in_range, "net"].sum()
    part = df.loc[in_range & (df["channel"] == channel), "net"].sum()
    return part / total * 100


def rating_by_ship_bucket(df: pd.DataFrame) -> dict[str, float]:
    """คะแนนรีวิวเฉลี่ยตามระยะส่ง คืน dict คีย์ '1-2', '3-4', '5-6', '7+'"""
    def bucket_of(days: float) -> str:
        if days <= 2:
            return "1-2"
        if days <= 4:
            return "3-4"
        if days <= 6:
            return "5-6"
        return "7+"

    shipped = df.dropna(subset=["ship_days"]).copy()
    shipped["bucket"] = shipped["ship_days"].apply(bucket_of)
    rated = shipped.dropna(subset=["rating"])
    means = rated.groupby("bucket")["rating"].mean()
    return {key: means.get(key) for key in ["1-2", "3-4", "5-6", "7+"]}


def top_province(df: pd.DataFrame, region: str) -> str:
    """จังหวัดที่มียอดขายสุทธิสูงสุดในภูมิภาคที่ระบุ"""
    in_region = df.loc[(df["status"] == DELIVERED) & (df["region"] == region)]
    return in_region.groupby("province")["net"].sum().idxmax()


def avg_ship_days(df: pd.DataFrame, region: str | None = None, carrier: str | None = None,
                  start_date: str | None = None, end_date: str | None = None) -> float:
    """ระยะส่งเฉลี่ย (วัน) ตามตัวกรองที่ให้มา วันที่เป็น 'YYYY-MM-DD' และรวมทั้งสองวัน"""
    mask = pd.Series(True, index=df.index)
    if region is not None:
        mask &= df["region"] == region
    if carrier is not None:
        mask &= df["carrier"] == carrier
    if start_date is not None:
        mask &= df["date"] >= start_date
    if end_date is not None:
        mask &= df["date"] <= end_date
    return df.loc[mask, "ship_days"].dropna().mean()


def return_rate(df: pd.DataFrame, product_id: str | None = None,
                start_date: str | None = None, end_date: str | None = None) -> float:
    """อัตราคืนสินค้า (เปอร์เซ็นต์) ของสินค้าและช่วงวันที่ที่ระบุ"""
    mask = pd.Series(True, index=df.index)
    if product_id is not None:
        mask &= df["product_id"] == product_id
    if start_date is not None:
        mask &= df["date"] >= start_date
    if end_date is not None:
        mask &= df["date"] <= end_date
    subset = df.loc[mask]
    return (subset["status"] == RETURNED).sum() / len(subset) * 100


def month_orders(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """แถวคำสั่งซื้อทุกสถานะของเดือน month ('YYYY-MM')"""
    return df.loc[df["month"] == month]


def previous_month(df: pd.DataFrame, month: str) -> str | None:
    """เดือนก่อนหน้าที่มีข้อมูลใน df (ไม่มีให้คืน None)"""
    earlier = sorted(m for m in df["month"].unique() if m < month)
    return earlier[-1] if earlier else None


def top_products(df: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """สินค้าที่ยอดขายสุทธิสูงสุด n อันดับ คอลัมน์ product_id, product_name, qty, net"""
    delivered = df.loc[df["status"] == DELIVERED]
    out = (delivered.groupby(["product_id", "product_name"], as_index=False)
           .agg(qty=("qty", "sum"), net=("net", "sum"))
           .sort_values(["net", "product_id"], ascending=[False, True])
           .head(n)
           .reset_index(drop=True))
    return out
