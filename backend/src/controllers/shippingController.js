const shippingService = require('../services/shippingService');
const realtimeService = require('../services/realtimeService');

/**
 * POST /api/v1/shipping/check-address
 * Xác thực địa chỉ với Google Maps / OpenStreetMap và tìm showroom Routine gần nhất
 */
async function checkAddress(req, res) {
  try {
    const { address, ward, district, city, fullAddress } = req.body || {};
    const input = fullAddress || { address, ward, district, city };

    const result = await shippingService.validateAndLocateAddress(input);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: result.message || "Địa chỉ không tồn tại hoặc không thể định vị trên Google Maps. Vui lòng nhập lại.",
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[shippingController] checkAddress error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi trong quá trình định vị địa chỉ. Vui lòng thử lại sau.",
    });
  }
}

/**
 * POST /api/v1/shipping/calculate
 * Tính toán biểu phí ship Tiêu chuẩn (Viettel Post) và Hỏa tốc theo khoảng cách & giá trị đơn hàng
 */
async function calculateShipping(req, res) {
  try {
    const { subtotal, distanceKm, nearestStore, address, city, province, district, ward, shippingMethod } = req.body || {};
    
    // Nếu có địa chỉ hành chính hoặc không có distanceKm, tự động dùng tính phí hành chính theo khu vực
    if ((city || province || district || address) && distanceKm === undefined) {
      const addrInput = address || { city: city || province, district, ward };
      const result = await shippingService.calculateAdministrativeShippingFee(addrInput, subtotal, shippingMethod);
      return res.json({
        success: true,
        data: {
          ...result,
          shippingFee: result.effectiveFee,
          zone: result.matchedZone,
          isFree: result.methods?.standard?.isFree || false,
        },
      });
    }

    const options = shippingService.calculateShippingOptions(subtotal, distanceKm, nearestStore);

    return res.json({
      success: true,
      data: options,
    });
  } catch (err) {
    console.error("[shippingController] calculateShipping error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tính phí vận chuyển.",
    });
  }
}

/**
 * POST /api/v1/shipping/calculate-by-region
 * Tính toán biểu phí ship theo khu vực hành chính (Không phụ thuộc Google Maps)
 */
async function calculateByRegion(req, res) {
  try {
    const { address, subtotal, shippingMethod } = req.body || {};
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp thông tin địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện, Phường/Xã)."
      });
    }

    const result = await shippingService.calculateAdministrativeShippingFee(address, subtotal, shippingMethod);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[shippingController] calculateByRegion error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi tính phí vận chuyển theo khu vực.",
    });
  }
}

/**
 * GET /api/v1/shipping/rules
 * Lấy danh sách quy tắc phí vận chuyển khu vực hành chính
 */
async function getShippingRules(req, res) {
  try {
    const prisma = require('../config/prisma');
    const rules = await prisma.shipping_rules.findMany({
      orderBy: { created_at: 'asc' }
    });
    return res.json({
      success: true,
      data: rules,
    });
  } catch (err) {
    console.error("[shippingController] getShippingRules error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách cấu hình phí vận chuyển.",
    });
  }
}

/**
 * POST /api/v1/shipping/rules (Admin)
 * Tạo quy tắc phí vận chuyển mới
 */
async function createShippingRule(req, res) {
  try {
    const prisma = require('../config/prisma');
    const { id, city, district, region, base_fee, free_ship_threshold, estimated_delivery } = req.body || {};

    if (!city || !base_fee) {
      return res.status(400).json({
        success: false,
        message: "Tên Tỉnh/Thành phố và Mức phí cơ bản là bắt buộc."
      });
    }

    const ruleId = id || `rule-${Date.now()}`;
    const newRule = await prisma.shipping_rules.create({
      data: {
        id: ruleId,
        city,
        district: district || null,
        region: region || 'NORTH',
        base_fee: Number(base_fee),
        free_ship_threshold: free_ship_threshold ? Number(free_ship_threshold) : 499000,
        estimated_delivery: estimated_delivery || '2-3 ngày',
        is_active: true
      }
    });

    realtimeService.emit('SHIPPING_FEE_UPDATED', { action: 'CREATE', rule: newRule }, 'ALL');

    return res.status(201).json({
      success: true,
      message: "Tạo cấu hình phí vận chuyển thành công.",
      data: newRule
    });
  } catch (err) {
    console.error("[shippingController] createShippingRule error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo quy tắc phí vận chuyển: " + err.message,
    });
  }
}

/**
 * PUT /api/v1/shipping/rules/:id (Admin)
 * Cập nhật quy tắc phí vận chuyển
 */
async function updateShippingRule(req, res) {
  try {
    const prisma = require('../config/prisma');
    const { id } = req.params;
    const { city, district, region, base_fee, free_ship_threshold, estimated_delivery, is_active } = req.body || {};

    const updated = await prisma.shipping_rules.update({
      where: { id },
      data: {
        ...(city !== undefined && { city }),
        ...(district !== undefined && { district }),
        ...(region !== undefined && { region }),
        ...(base_fee !== undefined && { base_fee: Number(base_fee) }),
        ...(free_ship_threshold !== undefined && { free_ship_threshold: Number(free_ship_threshold) }),
        ...(estimated_delivery !== undefined && { estimated_delivery }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) })
      }
    });

    realtimeService.emit('SHIPPING_FEE_UPDATED', { action: 'UPDATE', rule: updated }, 'ALL');

    return res.json({
      success: true,
      message: "Cập nhật biểu phí thành công.",
      data: updated
    });
  } catch (err) {
    console.error("[shippingController] updateShippingRule error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật quy tắc phí vận chuyển: " + err.message,
    });
  }
}

/**
 * DELETE /api/v1/shipping/rules/:id (Admin)
 */
async function deleteShippingRule(req, res) {
  try {
    const prisma = require('../config/prisma');
    const { id } = req.params;

    await prisma.shipping_rules.delete({
      where: { id }
    });

    realtimeService.emit('SHIPPING_FEE_UPDATED', { action: 'DELETE', id }, 'ALL');

    return res.json({
      success: true,
      message: "Đã xóa quy tắc phí vận chuyển."
    });
  } catch (err) {
    console.error("[shippingController] deleteShippingRule error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa quy tắc: " + err.message
    });
  }
}

module.exports = {
  checkAddress,
  calculateShipping,
  calculateByRegion,
  getShippingRules,
  createShippingRule,
  updateShippingRule,
  deleteShippingRule,
};
