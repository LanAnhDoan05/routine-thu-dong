import { fetchApi } from "./api";

/**
 * 1. Gọi backend tạo URL thanh toán VNPay Sandbox truyền thống (Redirect)
 */
export async function createVNPayPaymentUrl({
  orderId,
  amount,
  orderInfo,
  bankCode = "",
  locale = "vn",
}) {
  try {
    const data = await fetchApi("/payment/vnpay/create-payment-url", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        amount,
        orderInfo,
        bankCode,
        locale,
      }),
    });
    return data;
  } catch (error) {
    console.error("[vnpayService] createVNPayPaymentUrl failed:", error.message);
    throw error;
  }
}

/**
 * 2. Gọi backend tạo mã QR VNPAY nhúng trực tiếp (Embedded Dynamic VNPAY QR)
 */
export async function createEmbeddedVNPayQR({
  orderId,
  bankCode = "VNPAYQR",
  locale = "vn",
}) {
  try {
    const data = await fetchApi("/payment/vnpay/create-qr", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        bankCode,
        locale,
      }),
    });
    return data;
  } catch (error) {
    console.error("[vnpayService] createEmbeddedVNPayQR failed:", error.message);
    throw error;
  }
}

/**
 * 3. Kiểm tra trạng thái thanh toán đơn hàng (Polling fallback cho SSE)
 */
export async function fetchPaymentStatus(orderId) {
  try {
    const data = await fetchApi(`/payment/vnpay/status/${orderId}`);
    return data;
  } catch (error) {
    console.error("[vnpayService] fetchPaymentStatus failed:", error.message);
    throw error;
  }
}

/**
 * 4. Hủy giao dịch thanh toán
 */
export async function cancelPaymentTransaction(orderId) {
  try {
    const data = await fetchApi(`/payment/vnpay/cancel/${orderId}`, {
      method: "POST",
    });
    return data;
  } catch (error) {
    console.error("[vnpayService] cancelPaymentTransaction failed:", error.message);
    throw error;
  }
}

/**
 * 5. Gọi backend xác thực kết quả thanh toán từ Return URL của VNPay
 */
export async function verifyVNPayReturn(searchQueryString) {
  try {
    const qs = searchQueryString.startsWith("?")
      ? searchQueryString.slice(1)
      : searchQueryString;
    const data = await fetchApi(`/payment/vnpay/verify-return?${qs}`);
    return data;
  } catch (error) {
    console.error("[vnpayService] verifyVNPayReturn failed:", error.message);
    throw error;
  }
}

/**
 * 6. Gọi backend tạo URL phản hồi mô phỏng thành công (Sandbox QR Demo)
 */
export async function simulateVNPayPayment({
  orderId,
  amount,
  bankCode = "VNPAYQR",
  responseCode = "00",
}) {
  try {
    const data = await fetchApi("/payment/vnpay/simulate-payment", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        amount,
        bankCode,
        responseCode,
      }),
    });
    return data;
  } catch (error) {
    console.error("[vnpayService] simulateVNPayPayment failed:", error.message);
    throw error;
  }
}
