"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Loading from "@/components/common/Loading";
import { formatPrice } from "@/lib/format";
import {
  createEmbeddedVNPayQR,
  fetchPaymentStatus,
  cancelPaymentTransaction,
  simulateVNPayPayment,
} from "@/lib/vnpayService";
import { fetchApi } from "@/lib/api";
import QRCode from "qrcode";

export default function VNPayGatewayPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "120px 0" }}>
          <Loading />
          <p style={{ marginTop: 16, color: "#64748b", fontSize: "14.5px" }}>
            Đang khởi tạo cổng thanh toán Routine VNPAY-QR...
          </p>
        </div>
      }
    >
      <VNPayGatewayInner />
    </Suspense>
  );
}

function VNPayGatewayInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING"); // 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút (900s)
  const [copied, setCopied] = useState(false);

  // 1. Khởi tạo mã QR VNPAY nhúng và tra cứu chi tiết đơn hàng
  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      if (!orderId) {
        setErrorMessage("Không tìm thấy mã đơn hàng. Vui lòng quay lại giỏ hàng.");
        setLoading(false);
        return;
      }
      initPayment();
    });

    async function initPayment() {
      try {
        setLoading(true);
        // Tra cứu đơn hàng từ backend
        const orderData = await fetchApi(`/orders/${orderId}`);
        if (!isMounted) return;
        setOrder(orderData);

        if (orderData.paymentStatus === "PAID") {
          setStatus("SUCCESS");
          setLoading(false);
          return;
        }

        // Gọi Backend tạo Embedded Dynamic VNPAY QR
        const qrResponse = await createEmbeddedVNPayQR({
          orderId,
          bankCode: "VNPAYQR",
        });

        if (!isMounted) return;
        setQrData(qrResponse);

        if (qrResponse.qrDataUrl) {
          setQrImage(qrResponse.qrDataUrl);
        } else if (qrResponse.qrContent) {
          const generatedUrl = await QRCode.toDataURL(qrResponse.qrContent, {
            width: 320,
            margin: 1,
            errorCorrectionLevel: "M",
          });
          if (isMounted) setQrImage(generatedUrl);
        }

        if (qrResponse.expiresInSeconds) {
          setTimeLeft(qrResponse.expiresInSeconds);
        }
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("[VNPay Gateway] Lỗi khởi tạo QR:", err);
        setErrorMessage(err.message || "Không thể khởi tạo mã QR thanh toán VNPAY.");
        setLoading(false);
      }
    }

    initPayment();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // 2. Đồng hồ đếm ngược 15 phút thời hạn thanh toán
  useEffect(() => {
    if (status !== "PENDING" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handlePaymentSuccess = useCallback(() => {
    setStatus("SUCCESS");
    setIsProcessing(true);
    setTimeout(() => {
      router.push(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
    }, 2000);
  }, [orderId, router]);

  // 3. Lắng nghe sự kiện Realtime SSE (Server-Sent Events)
  useEffect(() => {
    if (!orderId || status === "SUCCESS") return;

    let eventSource = null;
    try {
      const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/v1/realtime/stream`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const evType = payload.type || payload.event;
          const data = payload.data || payload;

          if (
            (evType === "PAYMENT_CONFIRMED" || evType === "PAYMENT_UPDATED") &&
            (data.orderId === orderId || data.id === orderId) &&
            data.paymentStatus === "PAID"
          ) {
            handlePaymentSuccess();
          }
        } catch {
          // Bỏ qua tin nhắn không đúng định dạng
        }
      };

      eventSource.onerror = () => {
        // SSE có thể tạm thời ngắt, Polling fallback bên dưới sẽ duy trì kết nối
        eventSource.close();
      };
    } catch (e) {
      console.warn("[VNPay Gateway] Không thể kết nối SSE, chuyển sang cơ chế Polling:", e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [orderId, status, handlePaymentSuccess]);

  // 4. Cơ chế Polling Fallback: Truy vấn trạng thái Backend mỗi 4 giây
  useEffect(() => {
    if (!orderId || status !== "PENDING") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchPaymentStatus(orderId);
        if (res && (res.isPaid || res.paymentStatus === "PAID")) {
          handlePaymentSuccess();
          clearInterval(interval);
        } else if (res && res.isExpired) {
          setStatus("EXPIRED");
          clearInterval(interval);
        } else if (res && res.isCancelled) {
          setStatus("CANCELLED");
          clearInterval(interval);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderId, status, handlePaymentSuccess]);

  // 5. Thao tác kiểm tra thủ công trạng thái thanh toán
  async function handleCheckStatus() {
    setIsProcessing(true);
    try {
      const res = await fetchPaymentStatus(orderId);
      if (res && (res.isPaid || res.paymentStatus === "PAID")) {
        handlePaymentSuccess();
      } else if (res && res.isExpired) {
        setStatus("EXPIRED");
      } else {
        alert("Giao dịch đang chờ thanh toán. Vui lòng quét mã trên ứng dụng ngân hàng.");
      }
    } catch (err) {
      alert("Không thể kiểm tra trạng thái lúc này: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  // 6. Thao tác hủy giao dịch thanh toán
  async function handleCancel() {
    if (!confirm("Bạn có chắc chắn muốn hủy giao dịch thanh toán cho đơn hàng này?")) {
      return;
    }
    setIsProcessing(true);
    try {
      await cancelPaymentTransaction(orderId);
      setStatus("CANCELLED");
      setTimeout(() => {
        router.push("/cart");
      }, 1500);
    } catch (err) {
      alert("Lỗi khi hủy giao dịch: " + err.message);
      setIsProcessing(false);
    }
  }

  // 7. Thao tác mô phỏng thanh toán Sandbox (Test Scanner)
  async function handleSimulateSandboxPayment() {
    setIsProcessing(true);
    try {
      const simRes = await simulateVNPayPayment({
        orderId,
        amount: order?.total || qrData?.totalAmount || 0,
        bankCode: "VNPAYQR",
        responseCode: "00",
      });

      if (simRes && simRes.returnUrl) {
        // Gửi callback đến return URL để backend kích hoạt cập nhật trạng thái
        window.location.href = simRes.returnUrl;
      } else {
        handlePaymentSuccess();
      }
    } catch (err) {
      alert("Lỗi mô phỏng thanh toán Sandbox: " + err.message);
      setIsProcessing(false);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const finalAmount = order?.total || qrData?.totalAmount || 0;
  const subtotal = order?.subtotal || finalAmount;
  const shippingFee = order?.shippingFee || 0;
  const discount = order?.discount || 0;

  return (
    <div className="vnpay-embedded-container">
      {/* Top Header */}
      <header className="payment-top-bar">
        <div className="container payment-top-inner">
          <Link href="/" className="brand-logo" aria-label="Routine - về trang chủ">
            ROUTINE
          </Link>
          <div className="security-tag">
            <span className="lock-icon" aria-hidden="true">🔒</span>
            <span>Thanh toán an toàn qua cổng VNPAY</span>
            <span className="sandbox-pill">SANDBOX TEST</span>
          </div>
        </div>
      </header>

      {/* Main Payment Section */}
      <main className="container payment-main">
        {loading ? (
          <div className="loading-card">
            <Loading />
            <p style={{ marginTop: 16, color: "#64748b" }}>
              Đang tạo mã VNPAY-QR động cho đơn hàng #{orderId}...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h2>Không thể tải cổng thanh toán</h2>
            <p>{errorMessage}</p>
            <Link href="/cart" className="btn-back">
              Quay lại giỏ hàng
            </Link>
          </div>
        ) : (
          <div className="payment-grid">
            {/* CỘT TRÁI: MÃ QR THANH TOÁN & HƯỚNG DẪN */}
            <section className="qr-section">
              <div className="qr-card">
                <div className="qr-card-header">
                  <div className="vnpay-logo-badge">
                    <span className="vnp-blue">VN</span>
                    <span className="vnp-red">PAY</span>
                    <span className="vnp-qr">QR</span>
                  </div>
                  <h1 className="qr-title">Quét mã VNPAY-QR để thanh toán</h1>
                  <p className="qr-subtitle">
                    Sử dụng ứng dụng Ngân hàng hoặc Ví VNPAY hỗ trợ VNPAY-QR
                  </p>
                </div>

                {/* Vùng hiển thị Mã QR */}
                <div className="qr-display-box">
                  {status === "PENDING" && qrImage ? (
                    <div className="qr-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrImage}
                        alt={`Mã QR thanh toán đơn hàng ${orderId}`}
                        className="qr-image"
                        width={280}
                        height={280}
                      />
                      <div className="qr-scanner-line" aria-hidden="true" />
                    </div>
                  ) : status === "SUCCESS" ? (
                    <div className="qr-state-success">
                      <div className="success-icon">✓</div>
                      <h3>Thanh toán thành công!</h3>
                      <p>Hệ thống đang xác nhận đơn hàng và chuyển hướng...</p>
                    </div>
                  ) : status === "EXPIRED" ? (
                    <div className="qr-state-expired">
                      <div className="expired-icon">⏱</div>
                      <h3>Mã QR đã hết hạn</h3>
                      <p>Giao dịch 15 phút đã kết thúc. Vui lòng tạo lại đơn hàng.</p>
                      <button
                        type="button"
                        className="btn-retry"
                        onClick={() => window.location.reload()}
                      >
                        Tải lại mã QR mới
                      </button>
                    </div>
                  ) : (
                    <div className="qr-state-cancelled">
                      <div className="cancelled-icon">✕</div>
                      <h3>Giao dịch đã bị hủy</h3>
                      <p>Sản phẩm đã được giải phóng khỏi kho giữ hàng.</p>
                      <Link href="/cart" className="btn-retry">
                        Quay lại giỏ hàng
                      </Link>
                    </div>
                  )}
                </div>

                {/* Thời gian đếm ngược & Tiến độ */}
                {status === "PENDING" && (
                  <div className="countdown-bar">
                    <span className="countdown-label">Thời gian còn lại để quét mã:</span>
                    <strong className="countdown-time">{formattedCountdown}</strong>
                  </div>
                )}

                {/* Hướng dẫn quét mã */}
                <div className="instructions-box">
                  <h3 className="instructions-title">Hướng dẫn thanh toán</h3>
                  <ol className="instructions-list">
                    <li>
                      <span className="step-num">1</span>
                      <span>Mở ứng dụng <strong>Ngân hàng</strong> hoặc <strong>Ví VNPAY</strong> trên điện thoại</span>
                    </li>
                    <li>
                      <span className="step-num">2</span>
                      <span>Chọn tính năng <strong>Quét mã QR (QR Pay)</strong></span>
                    </li>
                    <li>
                      <span className="step-num">3</span>
                      <span>Hướng camera vào mã QR để xác nhận số tiền <strong>{formatPrice(finalAmount)}</strong></span>
                    </li>
                  </ol>
                </div>

                {/* Danh sách ngân hàng & ví liên kết */}
                <div className="supported-apps">
                  <span className="supported-title">Hỗ trợ thanh toán qua 40+ Ngân hàng & Ví điện tử:</span>
                  <div className="bank-badges">
                    <span className="bank-pill">Vietcombank</span>
                    <span className="bank-pill">BIDV</span>
                    <span className="bank-pill">VietinBank</span>
                    <span className="bank-pill">Agribank</span>
                    <span className="bank-pill">Techcombank</span>
                    <span className="bank-pill">MB Bank</span>
                    <span className="bank-pill">ACB</span>
                    <span className="bank-pill">VPBank</span>
                    <span className="bank-pill">TPBank</span>
                    <span className="bank-pill">Ví VNPAY</span>
                  </div>
                </div>
              </div>
            </section>

            {/* CỘT PHẢI: CHI TIẾT ĐƠN HÀNG & THAO TÁC */}
            <aside className="summary-section">
              <div className="summary-card">
                <h2 className="summary-title">Chi tiết đơn hàng</h2>

                <div className="order-meta-box">
                  <div className="meta-row">
                    <span className="meta-label">Mã đơn hàng</span>
                    <strong className="meta-value text-code">#{orderId}</strong>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Người nhận</span>
                    <span className="meta-value">{order?.receiverName || "Khách hàng Routine"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Số điện thoại</span>
                    <span className="meta-value">{order?.phoneNumber || "—"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Phương thức</span>
                    <span className="meta-value">VNPAY-QR (Trực tuyến)</span>
                  </div>
                </div>

                <div className="pricing-box">
                  <div className="pricing-row">
                    <span>Tổng tiền sản phẩm</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="pricing-row">
                    <span>Phí vận chuyển</span>
                    <span>{shippingFee > 0 ? formatPrice(shippingFee) : "Miễn phí"}</span>
                  </div>
                  {discount > 0 && (
                    <div className="pricing-row discount-row">
                      <span>Giảm giá khuyến mãi</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="pricing-total-row">
                    <span>Tổng thanh toán</span>
                    <strong className="total-amount">{formatPrice(finalAmount)}</strong>
                  </div>
                </div>

                {/* Trạng thái thanh toán hiện tại */}
                <div className={`status-pill status-${status.toLowerCase()}`}>
                  <span className="status-dot" />
                  <span>
                    {status === "PENDING"
                      ? "Đang chờ quét mã thanh toán..."
                      : status === "SUCCESS"
                      ? "Đã thanh toán thành công (PAID)"
                      : status === "EXPIRED"
                      ? "Giao dịch đã hết hạn"
                      : "Giao dịch đã hủy"}
                  </span>
                </div>

                {/* Các nút thao tác */}
                <div className="action-buttons-group">
                  {status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        className="btn-action btn-check"
                        onClick={handleCheckStatus}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Đang kiểm tra..." : "🔄 Tôi đã quét mã / Kiểm tra trạng thái"}
                      </button>

                      {qrData?.officialVnpayUrl && (
                        <a
                          href={qrData.officialVnpayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-action btn-gateway"
                        >
                          🌐 Mở cổng VNPAY Sandbox chính thức
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn-action btn-simulate"
                        onClick={handleSimulateSandboxPayment}
                        disabled={isProcessing}
                      >
                        ⚡ Mô phỏng quét mã thành công (Sandbox)
                      </button>

                      <button
                        type="button"
                        className="btn-action btn-cancel"
                        onClick={handleCancel}
                        disabled={isProcessing}
                      >
                        ✕ Hủy giao dịch này
                      </button>
                    </>
                  )}
                </div>

                <div className="routine-guarantee">
                  <span>🛡️ Giao dịch được bảo vệ và mã hóa 256-bit SSL</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <style jsx>{`
        .vnpay-embedded-container {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family: inherit;
          padding-bottom: 60px;
        }

        .payment-top-bar {
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px);
        }

        .payment-top-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .brand-logo {
          font-size: 22px;
          font-weight: 850;
          letter-spacing: 0.2em;
          color: #0f172a;
          text-decoration: none;
        }

        .security-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
        }

        .sandbox-pill {
          background: #fef3c7;
          color: #b45309;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid #fde68a;
          letter-spacing: 0.05em;
        }

        .payment-main {
          margin-top: 36px;
        }

        .loading-card,
        .error-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 60px 24px;
          text-align: center;
          max-width: 560px;
          margin: 40px auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .btn-back {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 24px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 32px;
          align-items: start;
        }

        @media (max-width: 1023px) {
          .payment-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        /* QR Card */
        .qr-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 36px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          text-align: center;
        }

        .vnpay-logo-badge {
          display: inline-flex;
          align-items: center;
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .vnp-blue {
          color: #005baa;
        }
        .vnp-red {
          color: #ed1c24;
        }
        .vnp-qr {
          background: #005baa;
          color: #ffffff;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 4px;
          vertical-align: middle;
        }

        .qr-title {
          font-size: 22px;
          font-weight: 700;
          margin: 6px 0 4px;
          color: #0f172a;
        }

        .qr-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .qr-display-box {
          margin: 28px auto;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 290px;
        }

        .qr-wrapper {
          position: relative;
          display: inline-block;
          padding: 16px;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .qr-image {
          display: block;
          border-radius: 8px;
        }

        .qr-scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #ef4444, transparent);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
          animation: scan-line 2.5s infinite linear;
        }

        @keyframes scan-line {
          0% {
            top: 0;
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0.2;
          }
        }

        .qr-state-success,
        .qr-state-expired,
        .qr-state-cancelled {
          padding: 40px 20px;
          border-radius: 16px;
          width: 100%;
          max-width: 320px;
        }

        .qr-state-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
        .success-icon {
          font-size: 42px;
          margin-bottom: 12px;
          font-weight: bold;
        }

        .qr-state-expired {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }
        .expired-icon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .qr-state-cancelled {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        .cancelled-icon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .btn-retry {
          margin-top: 16px;
          padding: 9px 20px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }

        .countdown-bar {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          background: #f1f5f9;
          border-radius: 9999px;
          font-size: 14px;
          color: #334155;
          margin-bottom: 24px;
        }

        .countdown-time {
          color: #dc2626;
          font-size: 16px;
          letter-spacing: 0.05em;
        }

        /* Instructions */
        .instructions-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: left;
          margin-top: 20px;
        }

        .instructions-title {
          font-size: 14.5px;
          font-weight: 700;
          margin: 0 0 12px;
          color: #0f172a;
        }

        .instructions-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .instructions-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: #475569;
          line-height: 1.4;
        }

        .step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Supported Apps */
        .supported-apps {
          margin-top: 24px;
          text-align: left;
        }

        .supported-title {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          display: block;
          margin-bottom: 10px;
        }

        .bank-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .bank-pill {
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #334155;
        }

        /* Summary Section */
        .summary-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .summary-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 18px;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 14px;
        }

        .order-meta-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          font-weight: 600;
          color: #0f172a;
        }

        .text-code {
          color: #2563eb;
          font-family: monospace;
          font-size: 14px;
        }

        .pricing-box {
          border-top: 1px dashed #e2e8f0;
          border-bottom: 1px dashed #e2e8f0;
          padding: 16px 0;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          color: #475569;
        }

        .discount-row {
          color: #16a34a;
        }

        .pricing-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
        }

        .total-amount {
          font-size: 20px;
          color: #ef4444;
          font-weight: 800;
        }

        /* Status Pill */
        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-pending {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .status-pending .status-dot {
          background: #2563eb;
          animation: pulse-dot 1.5s infinite;
        }

        .status-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .status-success .status-dot {
          background: #10b981;
        }

        .status-expired {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .status-expired .status-dot {
          background: #f59e0b;
        }

        .status-cancelled {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .status-cancelled .status-dot {
          background: #ef4444;
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }

        /* Action Buttons */
        .action-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-action {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          text-align: center;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-check {
          background: #0f172a;
          color: #ffffff;
        }
        .btn-check:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-1px);
        }

        .btn-gateway {
          background: #ffffff;
          color: #0284c7;
          border: 1px solid #bae6fd;
        }
        .btn-gateway:hover {
          background: #f0f9ff;
        }

        .btn-simulate {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .btn-simulate:hover:not(:disabled) {
          background: #dcfce7;
        }

        .btn-cancel {
          background: #ffffff;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .btn-cancel:hover:not(:disabled) {
          background: #f8fafc;
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .routine-guarantee {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
