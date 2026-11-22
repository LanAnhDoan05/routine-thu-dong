import { formatPrice } from "@/lib/format";

export default function OrderSummary({ order }) {
  const shippingFee = order.shippingFee ?? order.shipping ?? order.shipping_fee ?? 0;
  const shippingZone = order.shippingZone || order.shipping_zone;
  const discountAmount = order.discount ?? order.discount_amount ?? 0;
  const totalAmount = order.total ?? order.total_amount ?? 0;

  return (
    <div className="order-summary">
      <h2 style={{ fontSize: 16, marginBottom: 20, letterSpacing: "0.04em" }}>CHI TIẾT HÓA ĐƠN (ORDER SUMMARY)</h2>

      <div className="order-summary-row">
        <span>Tạm tính (Subtotal)</span>
        <span>{formatPrice(order.subtotal)}</span>
      </div>
      <div className="order-summary-row">
        <span>
          Phí vận chuyển {shippingZone ? `(${shippingZone})` : ""}
        </span>
        <span style={{ fontWeight: 600 }}>
          {shippingFee === 0 ? "Miễn phí (0đ)" : formatPrice(shippingFee)}
        </span>
      </div>
      {discountAmount > 0 && (
        <div className="order-summary-row" style={{ color: "var(--color-success)" }}>
          <span>Giảm giá {order.appliedCoupon ? `(${order.appliedCoupon})` : ""}</span>
          <span>-{formatPrice(discountAmount)}</span>
        </div>
      )}
      <div className="order-summary-row order-summary-total">
        <span>TỔNG THANH TOÁN</span>
        <span style={{ color: "var(--color-primary, #000)" }}>{formatPrice(totalAmount)}</span>
      </div>

      <style>{`
        .order-summary {
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          padding: 24px;
        }
        .order-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        .order-summary-total {
          border-top: 1px solid var(--color-border);
          margin-top: 8px;
          padding-top: 16px;
          font-weight: 600;
          font-size: 16px;
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
