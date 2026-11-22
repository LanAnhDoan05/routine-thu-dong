const productService = require('../services/productService');
const realtimeService = require('../services/realtimeService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Lấy danh sách sản phẩm (có bộ lọc category, gender, style, minPrice, maxPrice, sort, q, page, limit)
 */
async function getProducts(req, res, next) {
  try {
    const { category, gender, style, badge, minPrice, maxPrice, q, sort, page, limit } = req.query;

    const result = await productService.getProducts({
      category,
      gender,
      style,
      badge,
      minPrice,
      maxPrice,
      q,
      sort,
      page,
      limit,
    });

    return sendSuccess(res, result, 'Lấy danh sách sản phẩm thành công');
  } catch (error) {
    next(error);
  }
}

async function getAdminProducts(req, res, next) {
  try {
    const { category, gender, style, badge, minPrice, maxPrice, q, sort, page, limit, status } = req.query;
    const result = await productService.getProducts({
      category,
      gender,
      style,
      badge,
      minPrice,
      maxPrice,
      q,
      sort,
      page,
      limit,
      status,
      includeNonPublic: true,
    });
    return sendSuccess(res, result, 'Lấy danh sách sản phẩm quản trị thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách sản phẩm nổi bật (Best Seller / Featured)
 */
async function getFeaturedProducts(req, res, next) {
  try {
    const { limit } = req.query;
    const items = await productService.getFeaturedProducts(limit);
    return sendSuccess(res, items, 'Lấy danh sách sản phẩm nổi bật thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách sản phẩm xu hướng (Trending, có thể lọc theo gender)
 */
async function getTrendingProducts(req, res, next) {
  try {
    const { gender, limit } = req.query;
    const items = await productService.getTrendingProducts(gender, limit);
    return sendSuccess(res, items, 'Lấy danh sách sản phẩm xu hướng thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy chi tiết một sản phẩm theo ID
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return sendError(res, `Không tìm thấy sản phẩm với mã: "${id}"`, 404);
    }

    return sendSuccess(res, product, 'Lấy thông tin sản phẩm thành công');
  } catch (error) {
    next(error);
  }
}

async function getAdminProductById(req, res, next) {
  try {
    const product = await productService.getAdminProductById(req.params.id);
    if (!product) {
      return sendError(res, `Không tìm thấy sản phẩm với mã: "${req.params.id}"`, 404);
    }
    return sendSuccess(res, product, 'Lấy thông tin sản phẩm quản trị thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy các sản phẩm liên quan (cùng category hoặc cùng phong cách)
 */
async function getRelatedProducts(req, res, next) {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const items = await productService.getRelatedProducts(id, limit);
    return sendSuccess(res, items, 'Lấy danh sách sản phẩm liên quan thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Thêm sản phẩm mới (Admin)
 */
async function createProduct(req, res, next) {
  try {
    const newProduct = await productService.createProduct(req.body);
    realtimeService.emit('PRODUCT_CREATED', newProduct, 'ALL');
    return sendSuccess(res, newProduct, 'Thêm sản phẩm mới thành công', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật sản phẩm (Admin)
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await productService.updateProduct(id, req.body);
    realtimeService.emit('PRODUCT_UPDATED', updated, 'ALL');
    if (req.body.status) {
      realtimeService.emit('PRODUCT_STATUS_CHANGED', { id, status: req.body.status }, 'ALL');
    }
    if (req.body.stockQuantity !== undefined) {
      realtimeService.emit('STOCK_UPDATED', { id, stockQuantity: req.body.stockQuantity }, 'ALL');
    }
    return sendSuccess(res, updated, 'Cập nhật sản phẩm thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa sản phẩm (Admin)
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await productService.deleteProduct(id);
    realtimeService.emit('PRODUCT_STATUS_CHANGED', { id, status: 'INACTIVE', deleted: true }, 'ALL');
    return sendSuccess(res, deleted, 'Xóa sản phẩm thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Nhân bản sản phẩm (Admin)
 */
async function duplicateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const duplicated = await productService.duplicateProduct(id);
    return sendSuccess(res, duplicated, 'Nhân bản sản phẩm thành công', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Kiểm tra mã SKU khả dụng
 */
async function checkSkuAvailability(req, res, next) {
  try {
    const { sku } = req.query;
    const excludeId = req.query.excludeProductId || req.query.excludeId;
    const result = await productService.checkSkuAvailability(sku, excludeId);
    return sendSuccess(res, result, 'Kiểm tra mã SKU thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa nhiều sản phẩm (Bulk Delete - Admin)
 */
async function bulkDeleteProducts(req, res, next) {
  try {
    const { ids } = req.body;
    const result = await productService.bulkDeleteProducts(ids);
    return sendSuccess(res, result, `Đã xóa ${result.deletedCount} sản phẩm thành công`);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/products/statistics
 * Thống kê tổng hợp số lượng sản phẩm cho Admin
 */
async function getProductStatistics(req, res, next) {
  try {
    const stats = await productService.getProductStatistics();
    return sendSuccess(res, stats, 'Lấy thống kê số lượng sản phẩm thành công');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getAdminProducts,
  getFeaturedProducts,
  getTrendingProducts,
  getProductById,
  getAdminProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  checkSkuAvailability,
  bulkDeleteProducts,
  getProductStatistics,
};

