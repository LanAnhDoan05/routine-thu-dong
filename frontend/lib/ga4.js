/**
 * Google Analytics 4 (GA4) Integration Library
 * Routine Thu Đông E-Commerce
 * Measurement ID: G-5NTJX557TG
 * Stream ID: 16398654820
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-5NTJX557TG";

export const GA_STREAM_ID = "16398654820";

/**
 * Kiểm tra xem trình duyệt có hỗ trợ window và gtag không
 */
function isClient() {
  return typeof window !== "undefined";
}

/**
 * Gọi lệnh gtag an toàn với cơ chế fallback vào dataLayer
 */
export function gtag(...args) {
  if (!isClient()) return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }
}

/**
 * Gửi sự kiện cơ bản lên Google Analytics
 */
export function event(action, params = {}) {
  if (!isClient() || !GA_MEASUREMENT_ID) return;

  // Luôn đảm bảo không gửi thông tin định danh cá nhân nhạy cảm (PII)
  const cleanParams = sanitizeParams(params);

  // Thêm cờ debug_mode khi đang ở môi trường dev hoặc có query ?debug_ga=true
  if (
    process.env.NODE_ENV !== "production" ||
    (typeof window !== "undefined" && window.location.search.includes("debug_ga=true"))
  ) {
    cleanParams.debug_mode = true;
  }

  gtag("event", action, cleanParams);
}

/**
 * Loại bỏ các trường PII (Email, Phone, Address, Full Name) trước khi gửi sang GA4
 */
function sanitizeParams(params = {}) {
  const p = { ...params };
  const sensitiveKeys = [
    "email",
    "phone",
    "phoneNumber",
    "password",
    "address",
    "shippingAddress",
    "fullName",
    "token",
    "jwt",
  ];
  sensitiveKeys.forEach((key) => {
    delete p[key];
  });
  return p;
}

/**
 * Chuẩn hóa đối tượng sản phẩm theo schema GA4 Standard Item
 */
export function formatGaItem(product = {}, quantity = 1, index = undefined) {
  if (!product) return {};

  const itemId = String(product.id || product.productId || product.sku || "");
  const itemName = String(product.name || product.title || "");
  const category = String(product.category || product.categoryName || "Fashion");
  const price = Number(product.price || 0);
  const qty = Number(quantity || product.quantity || 1);

  const variantParts = [product.color, product.size].filter(Boolean);
  const variant = variantParts.length > 0 ? variantParts.join(" / ") : undefined;

  const itemObj = {
    item_id: itemId,
    item_name: itemName,
    item_category: category,
    price,
    quantity: qty,
    currency: "VND",
  };

  if (variant) itemObj.item_variant = variant;
  if (index !== undefined) itemObj.index = index;

  return itemObj;
}

/**
 * 1. Nhóm truy cập: page_view
 */
export function trackPageView(url, title) {
  if (!isClient()) return;
  gtag("event", "page_view", {
    page_location: url || window.location.href,
    page_title: title || document?.title || "Routine Thu Đông",
    page_path: url ? new URL(url, "https://routine.vn").pathname : window.location.pathname,
  });
}

/**
 * Gán User ID (UUID ngẫu nhiên, không chứa email hay số điện thoại)
 */
export function setGaUserId(userId) {
  if (!isClient() || !userId) return;
  gtag("config", GA_MEASUREMENT_ID, {
    user_id: String(userId),
  });
}

/**
 * 2. Nhóm sản phẩm: view_item_list
 */
export function trackViewItemList({ listId = "product_list", listName = "Danh sách sản phẩm", items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return;
  event("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items: items.map((it, idx) => formatGaItem(it, it.quantity || 1, idx + 1)),
  });
}

/**
 * 2. Nhóm sản phẩm: select_item
 */
export function trackSelectItem({ listId = "product_list", listName = "Danh sách sản phẩm", item, index }) {
  if (!item) return;
  event("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [formatGaItem(item, 1, index)],
  });
}

/**
 * 2. Nhóm sản phẩm: view_item
 */
export function trackViewItem({ item }) {
  if (!item) return;
  const formatted = formatGaItem(item);
  event("view_item", {
    currency: "VND",
    value: formatted.price,
    items: [formatted],
  });
}

/**
 * 2. Nhóm sản phẩm: search
 */
export function trackSearch({ searchTerm }) {
  if (!searchTerm || !searchTerm.trim()) return;
  event("search", {
    search_term: searchTerm.trim(),
  });
}

/**
 * 2. Nhóm sản phẩm: add_to_wishlist
 */
export function trackAddToWishlist({ item }) {
  if (!item) return;
  const formatted = formatGaItem(item);
  event("add_to_wishlist", {
    currency: "VND",
    value: formatted.price,
    items: [formatted],
  });
}

/**
 * 3. Nhóm giỏ hàng: view_cart
 */
export function trackViewCart({ items = [], value = 0 }) {
  if (!Array.isArray(items) || items.length === 0) return;
  const formattedItems = items.map((it) => formatGaItem(it, it.quantity || 1));
  const totalValue =
    Number(value) ||
    formattedItems.reduce((acc, cur) => acc + cur.price * (cur.quantity || 1), 0);

  event("view_cart", {
    currency: "VND",
    value: totalValue,
    items: formattedItems,
  });
}

/**
 * 3. Nhóm giỏ hàng: add_to_cart
 */
export function trackAddToCart({ item, items = [], value = 0 }) {
  let targetItems = [];
  if (item) {
    targetItems = [formatGaItem(item, item.quantity || 1)];
  } else if (Array.isArray(items) && items.length > 0) {
    targetItems = items.map((it) => formatGaItem(it, it.quantity || 1));
  }
  if (targetItems.length === 0) return;

  const totalValue =
    Number(value) ||
    targetItems.reduce((acc, cur) => acc + cur.price * (cur.quantity || 1), 0);

  event("add_to_cart", {
    currency: "VND",
    value: totalValue,
    items: targetItems,
  });
}

/**
 * 3. Nhóm giỏ hàng: remove_from_cart
 */
export function trackRemoveFromCart({ item, items = [], value = 0 }) {
  let targetItems = [];
  if (item) {
    targetItems = [formatGaItem(item, item.quantity || 1)];
  } else if (Array.isArray(items) && items.length > 0) {
    targetItems = items.map((it) => formatGaItem(it, it.quantity || 1));
  }
  if (targetItems.length === 0) return;

  const totalValue =
    Number(value) ||
    targetItems.reduce((acc, cur) => acc + cur.price * (cur.quantity || 1), 0);

  event("remove_from_cart", {
    currency: "VND",
    value: totalValue,
    items: targetItems,
  });
}

/**
 * 4. Nhóm thanh toán: begin_checkout
 */
export function trackBeginCheckout({ items = [], value = 0, coupon = undefined }) {
  if (!Array.isArray(items) || items.length === 0) return;
  const formattedItems = items.map((it) => formatGaItem(it, it.quantity || 1));
  const totalValue =
    Number(value) ||
    formattedItems.reduce((acc, cur) => acc + cur.price * (cur.quantity || 1), 0);

  event("begin_checkout", {
    currency: "VND",
    value: totalValue,
    coupon: coupon || undefined,
    items: formattedItems,
  });
}

/**
 * 4. Nhóm thanh toán: add_shipping_info
 */
export function trackAddShippingInfo({ items = [], value = 0, shippingTier = "Standard", coupon = undefined }) {
  if (!Array.isArray(items) || items.length === 0) return;
  const formattedItems = items.map((it) => formatGaItem(it, it.quantity || 1));

  event("add_shipping_info", {
    currency: "VND",
    value: Number(value || 0),
    shipping_tier: shippingTier,
    coupon: coupon || undefined,
    items: formattedItems,
  });
}

/**
 * 4. Nhóm thanh toán: add_payment_info
 */
export function trackAddPaymentInfo({ items = [], value = 0, paymentType = "COD", coupon = undefined }) {
  if (!Array.isArray(items) || items.length === 0) return;
  const formattedItems = items.map((it) => formatGaItem(it, it.quantity || 1));

  event("add_payment_info", {
    currency: "VND",
    value: Number(value || 0),
    payment_type: paymentType,
    coupon: coupon || undefined,
    items: formattedItems,
  });
}

/**
 * 4. Nhóm thanh toán: purchase (Chỉ ghi nhận khi Backend xác nhận thành công và chống trùng lặp)
 */
export function trackPurchase({
  transactionId,
  value = 0,
  tax = 0,
  shipping = 0,
  coupon = undefined,
  items = [],
}) {
  if (!isClient() || !transactionId) return false;

  // Deduplication: Chống gửi trùng lặp giao dịch khi người dùng F5 hoặc reload trang success
  const dedupKey = `ga_purchase_recorded_${transactionId}`;
  try {
    if (sessionStorage.getItem(dedupKey)) {
      console.log(`[GA4] Giao dịch ${transactionId} đã được ghi nhận trước đó, bỏ qua để tránh trùng lặp.`);
      return false;
    }
    sessionStorage.setItem(dedupKey, "true");
  } catch (err) {
    // SessionStorage có thể bị hạn chế trong private browsing
  }

  const formattedItems = Array.isArray(items)
    ? items.map((it) => formatGaItem(it, it.quantity || 1))
    : [];

  event("purchase", {
    transaction_id: String(transactionId),
    value: Number(value || 0),
    currency: "VND",
    tax: Number(tax || 0),
    shipping: Number(shipping || 0),
    coupon: coupon || undefined,
    items: formattedItems,
  });

  return true;
}

/**
 * 5. Nhóm tài khoản: sign_up
 */
export function trackSignUp({ method = "credentials" } = {}) {
  event("sign_up", {
    method,
  });
}

/**
 * 5. Nhóm tài khoản: login
 */
export function trackLogin({ method = "credentials" } = {}) {
  event("login", {
    method,
  });
}
