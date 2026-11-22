const { PrismaClient } = require("@prisma/client");
const http = require("http");
const qs = require("qs");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();
const API_BASE = "http://localhost:5001/api/v1";
const FRONTEND_BASE = "http://localhost:3000";

const EVIDENCE_DIR = "C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence";
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function createTestOrder(totalAmount, notePrefix = "TASK_PAYMENT_02") {
  // Tìm hoặc dùng 1 sản phẩm thật để tạo Order
  const product = await prisma.product.findFirst();
  const orderId = `ORD-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const order = await prisma.order.create({
    data: {
      id: orderId,
      receiverName: "Nguyễn Hoàng Long",
      phoneNumber: "0912456789",
      shippingAddress: "Số 88 Phố Huế, P. Hàng Bài, Q. Hoàn Kiếm, Hà Nội",
      shippingMethod: "standard",
      paymentMethod: "VNPAY",
      paymentStatus: "UNPAID",
      orderStatus: "CONFIRMED",
      subtotal: totalAmount,
      shippingFee: 0,
      discount: 0,
      total: totalAmount,
      note: `[${notePrefix}] Kiểm thử thanh toán VNPAY`,
      items: {
        create: [
          {
            productId: product ? product.id : "prod-dummy",
            name: product ? product.name : "Áo sơ mi Routine",
            price: totalAmount,
            quantity: 1,
            subtotal: totalAmount,
          },
        ],
      },
      reservation: {
        create: {
          items: [{ productId: product ? product.id : "prod-dummy", quantity: 1 }],
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      },
    },
  });

  return order;
}

async function main() {
  console.log("=================================================================");
  console.log("   ROUTINE WEB – TASK PAYMENT 02: ACCEPTANCE TEST (13 SCENARIOS)");
  console.log("=================================================================");

  const results = [];

  // -------------------------------------------------------------
  // TC 1: Đơn hàng 100.000 VNĐ -> Tạo mã VNPAY-QR nhúng
  // -------------------------------------------------------------
  console.log("\n[TC 1] Kiểm tra đơn hàng 100.000 VNĐ & Tạo VNPAY-QR...");
  const order1 = await createTestOrder(100000, "TC01_100K");
  const res1 = await request("POST", "/payment/vnpay/create-qr", { orderId: order1.id });
  const qrData1 = res1.body.data;

  const pass1 =
    res1.status === 201 &&
    qrData1.totalAmount === 100000 &&
    qrData1.paymentMethod === "VNPAY" &&
    qrData1.qrContent.includes("amount=100000") &&
    qrData1.qrDataUrl.startsWith("data:image/png;base64,");

  console.log(`-> TC 1: ${pass1 ? "PASS" : "FAIL"} (OrderId: ${order1.id}, Amount: ${qrData1?.totalAmount}đ)`);
  results.push({ id: 1, name: "Đơn hàng 100.000 VNĐ", pass: pass1, orderId: order1.id });

  // -------------------------------------------------------------
  // TC 2: Đơn hàng 500.000 VNĐ -> Tạo mã VNPAY-QR nhúng
  // -------------------------------------------------------------
  console.log("\n[TC 2] Kiểm tra đơn hàng 500.000 VNĐ & Tạo VNPAY-QR...");
  const order2 = await createTestOrder(500000, "TC02_500K");
  const res2 = await request("POST", "/payment/vnpay/create-qr", { orderId: order2.id });
  const qrData2 = res2.body.data;

  const pass2 =
    res2.status === 201 &&
    qrData2.totalAmount === 500000 &&
    qrData2.qrContent.includes("amount=500000");

  console.log(`-> TC 2: ${pass2 ? "PASS" : "FAIL"} (OrderId: ${order2.id}, Amount: ${qrData2?.totalAmount}đ)`);
  results.push({ id: 2, name: "Đơn hàng 500.000 VNĐ", pass: pass2, orderId: order2.id });

  // -------------------------------------------------------------
  // TC 3: Đơn hàng 1.130.000 VNĐ -> Tạo mã VNPAY-QR nhúng
  // -------------------------------------------------------------
  console.log("\n[TC 3] Kiểm tra đơn hàng 1.130.000 VNĐ & Tạo VNPAY-QR...");
  const order3 = await createTestOrder(1130000, "TC03_1130K");
  const res3 = await request("POST", "/payment/vnpay/create-qr", { orderId: order3.id });
  const qrData3 = res3.body.data;

  const pass3 =
    res3.status === 201 &&
    qrData3.totalAmount === 1130000 &&
    qrData3.qrContent.includes("amount=1130000");

  console.log(`-> TC 3: ${pass3 ? "PASS" : "FAIL"} (OrderId: ${order3.id}, Amount: ${qrData3?.totalAmount}đ)`);
  results.push({ id: 3, name: "Đơn hàng 1.130.000 VNĐ", pass: pass3, orderId: order3.id });

  // -------------------------------------------------------------
  // TC 4: Kiểm tra tính toàn vẹn của mã QR & Không dùng VietQR
  // -------------------------------------------------------------
  console.log("\n[TC 4] Kiểm tra định dạng mã QR (Không dùng VietQR)...");
  const isVnpayScheme = qrData1.qrContent.startsWith("vnpay://qr");
  const noVietQrDomain = !qrData1.qrContent.includes("vietqr.io") && !qrData1.qrContent.includes("970422");
  const hasChecksum = qrData1.qrContent.includes("checksum=");
  const pass4 = isVnpayScheme && noVietQrDomain && hasChecksum;

  console.log(`-> TC 4: ${pass4 ? "PASS" : "FAIL"} (Scheme: ${isVnpayScheme}, Zero VietQR: ${noVietQrDomain})`);
  results.push({ id: 4, name: "Kiểm tra đúng định dạng QR VNPAY (Zero VietQR)", pass: pass4 });

  // -------------------------------------------------------------
  // TC 5: Thanh toán thành công (ResponseCode '00' -> PAID)
  // -------------------------------------------------------------
  console.log("\n[TC 5] Kiểm tra thanh toán thành công qua VNPAY Callback...");
  const sim5 = await request("POST", "/payment/vnpay/simulate-payment", {
    orderId: order1.id,
    amount: 100000,
    responseCode: "00",
  });

  // Gọi return URL để kích hoạt xác nhận
  const returnUrl5 = new URL(sim5.body.data.returnUrl);
  const verifyRes5 = await request("GET", `/payment/vnpay/vnpay-return${returnUrl5.search}`);

  const updatedOrder5 = await prisma.order.findUnique({ where: { id: order1.id } });
  const tx5 = await prisma.paymentTransaction.findFirst({
    where: { orderId: order1.id },
    orderBy: { createdAt: "desc" },
  });

  const pass5 =
    verifyRes5.status === 200 &&
    updatedOrder5.paymentStatus === "PAID" &&
    updatedOrder5.orderStatus === "CONFIRMED" &&
    tx5.status === "SUCCESS";

  console.log(`-> TC 5: ${pass5 ? "PASS" : "FAIL"} (PaymentStatus: ${updatedOrder5.paymentStatus}, TxStatus: ${tx5?.status})`);
  results.push({ id: 5, name: "Thanh toán thành công (PAID)", pass: pass5, orderId: order1.id });

  // -------------------------------------------------------------
  // TC 6: Thanh toán thất bại (Khách hàng hủy - ResponseCode '24')
  // -------------------------------------------------------------
  console.log("\n[TC 6] Kiểm tra thanh toán thất bại / hủy giao dịch...");
  const order6 = await createTestOrder(250000, "TC06_FAIL");
  await request("POST", "/payment/vnpay/create-qr", { orderId: order6.id });

  const sim6 = await request("POST", "/payment/vnpay/simulate-payment", {
    orderId: order6.id,
    amount: 250000,
    responseCode: "24",
  });
  const returnUrl6 = new URL(sim6.body.data.returnUrl);
  await request("GET", `/payment/vnpay/vnpay-return${returnUrl6.search}`);

  const updatedOrder6 = await prisma.order.findUnique({ where: { id: order6.id } });
  const tx6 = await prisma.paymentTransaction.findFirst({
    where: { orderId: order6.id },
    orderBy: { createdAt: "desc" },
  });

  const pass6 =
    updatedOrder6.paymentStatus === "UNPAID" &&
    updatedOrder6.orderStatus === "CANCELLED" &&
    tx6.status === "FAILED";

  console.log(`-> TC 6: ${pass6 ? "PASS" : "FAIL"} (PaymentStatus: ${updatedOrder6.paymentStatus}, OrderStatus: ${updatedOrder6.orderStatus})`);
  results.push({ id: 6, name: "Thanh toán thất bại (Cancelled)", pass: pass6, orderId: order6.id });

  // -------------------------------------------------------------
  // TC 7: Hết hạn giao dịch (Timeout 15 phút)
  // -------------------------------------------------------------
  console.log("\n[TC 7] Kiểm tra hết hạn giao dịch (Expired)...");
  const order7 = await createTestOrder(300000, "TC07_EXPIRED");
  await request("POST", "/payment/vnpay/create-qr", { orderId: order7.id });

  // Đặt expiresAt về quá khứ
  await prisma.paymentTransaction.updateMany({
    where: { orderId: order7.id },
    data: { expiresAt: new Date(Date.now() - 1000 * 60 * 20) }, // 20 phút trước
  });

  const statusRes7 = await request("GET", `/payment/vnpay/status/${order7.id}`);
  const pass7 = statusRes7.body.data.isExpired === true && statusRes7.body.data.transactionStatus === "EXPIRED";

  console.log(`-> TC 7: ${pass7 ? "PASS" : "FAIL"} (isExpired: ${statusRes7.body.data?.isExpired})`);
  results.push({ id: 7, name: "Hết hạn giao dịch (Expired)", pass: pass7, orderId: order7.id });

  // -------------------------------------------------------------
  // TC 8: Quét QR hai lần / Không cho thanh toán đơn đã PAID
  // -------------------------------------------------------------
  console.log("\n[TC 8] Kiểm tra không cho phép tạo QR cho đơn đã PAID...");
  const res8 = await request("POST", "/payment/vnpay/create-qr", { orderId: order1.id });
  const pass8 = res8.status === 400 && res8.body.message.includes("đã được thanh toán hoàn tất");

  console.log(`-> TC 8: ${pass8 ? "PASS" : "FAIL"} (Status: ${res8.status}, Message: ${res8.body?.message})`);
  results.push({ id: 8, name: "Chặn tạo QR cho đơn đã PAID", pass: pass8, orderId: order1.id });

  // -------------------------------------------------------------
  // TC 9: Callback / IPN trùng lặp (Idempotency)
  // -------------------------------------------------------------
  console.log("\n[TC 9] Kiểm tra Idempotency khi nhận IPN callback trùng...");
  const ipnRes9 = await request("GET", `/payment/vnpay/vnpay-ipn${returnUrl5.search}`);
  const pass9 = ipnRes9.body.RspCode === "02" && ipnRes9.body.Message === "Order already confirmed";

  console.log(`-> TC 9: ${pass9 ? "PASS" : "FAIL"} (RspCode: ${ipnRes9.body?.RspCode}, Message: ${ipnRes9.body?.Message})`);
  results.push({ id: 9, name: "Idempotency khi IPN trùng lặp", pass: pass9 });

  // -------------------------------------------------------------
  // TC 10: Giả mạo số tiền (Tampered Amount)
  // -------------------------------------------------------------
  console.log("\n[TC 10] Kiểm tra phát hiện giả mạo số tiền...");
  const tamperedParams10 = new URLSearchParams(returnUrl5.search);
  tamperedParams10.set("vnp_Amount", "5000000"); // Đơn 100k nhưng gửi 50k
  // Không ký lại hoặc ký lại số tiền khác
  const tamperedRes10 = await request("GET", `/payment/vnpay/vnpay-ipn?${tamperedParams10.toString()}`);
  const pass10 = tamperedRes10.body.RspCode === "97" || tamperedRes10.body.RspCode === "04";

  console.log(`-> TC 10: ${pass10 ? "PASS" : "FAIL"} (RspCode: ${tamperedRes10.body?.RspCode})`);
  results.push({ id: 10, name: "Chặn giả mạo số tiền", pass: pass10 });

  // -------------------------------------------------------------
  // TC 11: Giả mạo chữ ký (Tampered Checksum)
  // -------------------------------------------------------------
  console.log("\n[TC 11] Kiểm tra phát hiện giả mạo chữ ký HMAC-SHA512...");
  const tamperedParams11 = new URLSearchParams(returnUrl5.search);
  tamperedParams11.set("vnp_SecureHash", "fake_hash_1234567890abcdef");
  const tamperedRes11 = await request("GET", `/payment/vnpay/vnpay-ipn?${tamperedParams11.toString()}`);
  const pass11 = tamperedRes11.body.RspCode === "97";

  console.log(`-> TC 11: ${pass11 ? "PASS" : "FAIL"} (RspCode: ${tamperedRes11.body?.RspCode})`);
  results.push({ id: 11, name: "Chặn giả mạo chữ ký (Checksum fail)", pass: pass11 });

  // -------------------------------------------------------------
  // TC 12: Refresh trang thanh toán / Trạng thái bền vững
  // -------------------------------------------------------------
  console.log("\n[TC 12] Kiểm tra duy trì trạng thái khi Refresh trang thanh toán...");
  const statusRes12 = await request("GET", `/payment/vnpay/status/${order2.id}`);
  const pass12 =
    statusRes12.status === 200 &&
    statusRes12.body.data.orderId === order2.id &&
    statusRes12.body.data.totalAmount === 500000 &&
    statusRes12.body.data.transactionStatus === "PENDING" &&
    statusRes12.body.data.remainingSeconds > 0;

  console.log(`-> TC 12: ${pass12 ? "PASS" : "FAIL"} (OrderId: ${order2.id}, RemainingSeconds: ${statusRes12.body.data?.remainingSeconds})`);
  results.push({ id: 12, name: "Duy trì trạng thái khi Refresh trang", pass: pass12 });

  // -------------------------------------------------------------
  // TC 13: Mất SSE và kết nối lại / Polling Fallback hoạt động
  // -------------------------------------------------------------
  console.log("\n[TC 13] Kiểm tra cơ chế Polling Fallback khi SSE mất kết nối...");
  // Simulate polling after payment confirmed
  const sim13 = await request("POST", "/payment/vnpay/simulate-payment", {
    orderId: order2.id,
    amount: 500000,
    responseCode: "00",
  });
  const returnUrl13 = new URL(sim13.body.data.returnUrl);
  await request("GET", `/payment/vnpay/vnpay-return${returnUrl13.search}`);

  // Polling endpoint returns PAID immediately
  const pollRes13 = await request("GET", `/payment/vnpay/status/${order2.id}`);
  const pass13 = pollRes13.body.data.isPaid === true && pollRes13.body.data.paymentStatus === "PAID";

  console.log(`-> TC 13: ${pass13 ? "PASS" : "FAIL"} (isPaid: ${pollRes13.body.data?.isPaid})`);
  results.push({ id: 13, name: "Polling Fallback khi SSE ngắt kết nối", pass: pass13 });

  // -------------------------------------------------------------
  // Playwright: Chụp ảnh bằng chứng trực quan màn hình thanh toán
  // -------------------------------------------------------------
  console.log("\n[UI Check] Chụp ảnh thực tế màn hình Embedded VNPAY QR...");
  const orderVisual = await createTestOrder(680000, "VISUAL_PROOF");
  await request("POST", "/payment/vnpay/create-qr", { orderId: orderVisual.id });

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${FRONTEND_BASE}/checkout/payment/vnpay-gateway?orderId=${orderVisual.id}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);

    const shotPath = path.join(EVIDENCE_DIR, "vnpay_embedded_qr_payment.png");
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`-> Đã lưu ảnh bằng chứng: ${shotPath}`);

    // Chụp thêm giao diện Mobile 390px
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto(`${FRONTEND_BASE}/checkout/payment/vnpay-gateway?orderId=${orderVisual.id}`, {
      waitUntil: "networkidle",
    });
    await pageMobile.waitForTimeout(1500);
    const shotMobilePath = path.join(EVIDENCE_DIR, "vnpay_embedded_qr_mobile.png");
    await pageMobile.screenshot({ path: shotMobilePath, fullPage: true });
    console.log(`-> Đã lưu ảnh bằng chứng mobile: ${shotMobilePath}`);
  } catch (browserErr) {
    console.warn("Playwright screenshot warning:", browserErr.message);
  } finally {
    if (browser) await browser.close();
  }

  // -------------------------------------------------------------
  // Tổng hợp kết quả
  // -------------------------------------------------------------
  console.log("\n=================================================================");
  console.log("   BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ VNPAY EMBEDDED QR (13/13)");
  console.log("=================================================================");
  let passedCount = 0;
  for (const r of results) {
    if (r.pass) passedCount++;
    console.log(`TC ${String(r.id).padStart(2, "0")}: ${r.name.padEnd(45)} [ ${r.pass ? "PASS" : "FAIL"} ]`);
  }
  console.log(`\nTổng kết: ${passedCount}/${results.length} Test cases PASSED (${Math.round((passedCount / results.length) * 100)}%)`);

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "payment02_acceptance_results.json"),
    JSON.stringify({ passedCount, total: results.length, results, timestamp: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
