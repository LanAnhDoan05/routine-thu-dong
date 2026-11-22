"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/components/common/Toast";
import { useCheckout } from "@/context/CheckoutContext";
import { getShippingFee } from "@/lib/checkoutConstants";
import { validateCouponApi } from "@/lib/couponService";
import { applyCouponApi, removeCouponApi } from "@/lib/cartService";

export default function CartSummary({ subtotal, checkoutHref = "/checkout", ctaLabel = "Proceed to Checkout" }) {
  const { shippingMethod, voucherCode, discount, applyVoucher, address } = useCheckout();
  const [inputCode, setInputCode] = useState(voucherCode || "");
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeSuggestion, setWelcomeSuggestion] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (voucherCode) {
      setInputCode(voucherCode);
    }
  }, [voucherCode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedVoucher = window.sessionStorage.getItem("routine_welcome_voucher");
        const storedCode = window.sessionStorage.getItem("routine_welcome_voucher_code");
        if (storedVoucher) {
          const parsed = JSON.parse(storedVoucher);
          setWelcomeSuggestion(parsed);
          if (!inputCode && !voucherCode) {
            setInputCode(parsed.code || "");
          }
        } else if (storedCode) {
          setWelcomeSuggestion({ code: storedCode, description: "Ưu đãi thành viên mới giảm 15%" });
          if (!inputCode && !voucherCode) {
            setInputCode(storedCode);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [voucherCode]);

  const shipping = subtotal === 0 ? 0 : getShippingFee(shippingMethod, address);
  const total = Math.max(subtotal + shipping - discount, 0);

  async function handleApplyCodeDirectly(codeToApply) {
    const cleanCode = (codeToApply || "").trim().toUpperCase();
    if (!cleanCode) return;
    setInputCode(cleanCode);
    setIsLoading(true);
    try {
      const res = await validateCouponApi(cleanCode, subtotal);
      if (res && res.valid) {
        applyVoucher(res.code, res.discountAmount);
        try {
          await applyCouponApi(res.code);
        } catch {
          // ignore cart sync error
        }
        showToast(res.description ? `Áp dụng "${res.code}": ${res.description}` : `Áp dụng mã "${res.code}" thành công.`);
      } else {
        showToast(res?.message || "Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện.");
      }
    } catch (err) {
      showToast(err.message || "Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyVoucher(e) {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast("Vui lòng nhập mã giảm giá.");
      return;
    }

    handleApplyCodeDirectly(cleanCode);
  }

  async function handleRemoveVoucher() {
    applyVoucher("", 0);
    setInputCode("");
    try {
      await removeCouponApi();
    } catch {
      // ignore
    }
    showToast("Đã hủy áp dụng mã giảm giá.");
  }

  return (
    <div className="cart-summary">
      <h2 style={{ fontSize: 16, marginBottom: 20, letterSpacing: "0.04em" }}>ORDER SUMMARY</h2>

      {voucherCode && discount > 0 ? (
        <div className="applied-coupon-box">
          <div className="applied-coupon-info">
            <span className="applied-coupon-tag">🏷️ {voucherCode}</span>
            <span className="applied-coupon-desc">Đã giảm {formatPrice(discount)}</span>
          </div>
          <button type="button" className="applied-coupon-remove" onClick={handleRemoveVoucher} title="Hủy mã">
            ✕ Gỡ
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {welcomeSuggestion && (
            <div className="welcome-coupon-suggest-card">
              <div className="welcome-coupon-suggest-header">
                <span className="welcome-coupon-suggest-badge">🎁 ƯU ĐÃI THÀNH VIÊN MỚI</span>
              </div>
              <div className="welcome-coupon-suggest-body">
                <div>
                  <div className="welcome-coupon-suggest-code">{welcomeSuggestion.code}</div>
                  <div className="welcome-coupon-suggest-desc">
                    {welcomeSuggestion.description || "Giảm 15% tối đa 150.000₫ cho đơn từ 400.000₫"}
                  </div>
                </div>
                <button
                  type="button"
                  className="welcome-coupon-apply-btn"
                  onClick={() => handleApplyCodeDirectly(welcomeSuggestion.code)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Áp dụng"}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleApplyVoucher} style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, textTransform: "uppercase" }}
              placeholder="Nhập mã ưu đãi (Voucher)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              aria-label="Mã giảm giá"
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={isLoading || !inputCode.trim()}>
              {isLoading ? "..." : "Áp dụng"}
            </button>
          </form>
        </div>
      )}

      <div className="cart-summary-row">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="cart-summary-row">
        <span>Shipping</span>
        <span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
      </div>
      {discount > 0 && (
        <div className="cart-summary-row" style={{ color: "var(--color-success)" }}>
          <span>Discount ({voucherCode || "Voucher"})</span>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}

      <div className="cart-summary-row cart-summary-total">
        <span>TOTAL</span>
        <span>{formatPrice(total)}</span>
      </div>

      <Link href={checkoutHref} className="btn btn-primary btn-full" style={{ marginTop: 20 }}>
        {ctaLabel}
      </Link>

      <style>{`
        .cart-summary {
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          padding: 24px;
        }
        .applied-coupon-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(46, 125, 50, 0.08);
          border: 1px dashed var(--color-success, #2e7d32);
          border-radius: var(--radius-sm, 6px);
          padding: 10px 14px;
          margin-bottom: 20px;
        }
        .applied-coupon-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .applied-coupon-tag {
          font-weight: 700;
          font-size: 13px;
          color: var(--color-success, #2e7d32);
          letter-spacing: 0.05em;
        }
        .applied-coupon-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .applied-coupon-remove {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .applied-coupon-remove:hover {
          color: var(--color-error, #d93025);
          background: rgba(217, 48, 37, 0.08);
        }
        .welcome-coupon-suggest-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 8px;
          padding: 12px 14px;
          color: #ffffff;
          margin-bottom: 12px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .welcome-coupon-suggest-header {
          margin-bottom: 4px;
        }
        .welcome-coupon-suggest-badge {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          color: #facc15;
          letter-spacing: 0.05em;
        }
        .welcome-coupon-suggest-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .welcome-coupon-suggest-code {
          font-family: monospace;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #ffffff;
        }
        .welcome-coupon-suggest-desc {
          font-size: 11.5px;
          color: #cbd5e1;
          margin-top: 2px;
        }
        .welcome-coupon-apply-btn {
          white-space: nowrap;
          background: #ffffff !important;
          color: #0f172a !important;
          border: none !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          cursor: pointer;
        }
        .welcome-coupon-apply-btn:hover {
          background: #f1f5f9 !important;
        }
        .cart-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        .cart-summary-total {
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
