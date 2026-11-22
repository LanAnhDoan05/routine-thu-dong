const { normalizeFashionQuery } = require('../utils/fashionThesaurus');
const shippingService = require('./shippingService');
const orderService = require('./orderService');

const VALID_GENDERS = new Set(['men', 'women', 'unisex']);
const CATEGORY_GROUPS = {
  top: ['top', 'tops', 'ao', 'ao-thun', 'ao-somi', 'ao-polo', 'cat-polo', 'ao-len', 'ao-ni', 'cat-blazer', 'ao-vest'],
  bottom: ['bottoms', 'quan-jeans', 'quan-tay', 'quan-short', 'quan-kaki', 'vay'],
  outerwear: ['ao-khoac', 'outerwear'],
  accessory: ['accessories', 'phu-kien', 'non-bang-do'],
};
const CATEGORY_NAME_TERMS = {
  'ao-somi': ['shirt', 'so mi'],
  'ao-thun': ['t-shirt', 'tee', 'ao thun', 'ao phong'],
  'ao-polo': ['polo'],
  'ao-len': ['sweater', 'knit', 'cardigan', 'ao len'],
  'ao-ni': ['hoodie', 'sweatshirt', 'ao ni'],
  'quan-jeans': ['jeans', 'jean', 'denim', 'quan bo'],
  'quan-tay': ['trouser', 'dress pant', 'quan tay', 'quan au'],
  'quan-short': ['shorts', 'short', 'quan dui'],
  'quan-kaki': ['khaki', 'kaki', 'chino'],
  'vay': ['skirt', 'dress', 'vay', 'dam'],
  'cat-blazer': ['blazer', 'vest'],
};

function boundedText(value, maxLength = 100) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function boundedInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function productCategory(product) {
  return String(product.categorySlug || product.categoryId || product.category || '').toLowerCase();
}

function classifyProduct(product) {
  const category = productCategory(product);
  const name = normalizeText(product.name);
  if (CATEGORY_GROUPS.outerwear.some((item) => category.includes(item)) ||
      /\b(ao khoac|jacket|coat|bomber|cardigan|blazer)\b/.test(name)) return 'outerwear';
  if (CATEGORY_GROUPS.bottom.some((item) => category.includes(item)) ||
      /\b(quan|jeans|trouser|pants|skirt|shorts|vay|dam)\b/.test(name)) return 'bottom';
  if (CATEGORY_GROUPS.accessory.some((item) => category.includes(item)) ||
      /\b(bag|belt|hat|sneaker|giay|non|mu|tui|that lung)\b/.test(name)) return 'accessory';
  if (CATEGORY_GROUPS.top.some((item) => category.includes(item)) ||
      /\b(ao|blouse|shirt|tee|polo|sweater|hoodie)\b/.test(name)) return 'top';
  return null;
}

function productMatchesCategory(product, category) {
  if (!category) return true;
  const value = String(category).toLowerCase();
  const parsed = normalizeFashionQuery(value);
  const expected = parsed.category || (Array.isArray(parsed.categories) ? parsed.categories[0] : null);
  const actual = productCategory(product);
  if (expected) {
    if (actual === expected || actual.includes(expected) || (actual.includes('polo') && expected.includes('polo'))) return true;
    const categoryTerms = CATEGORY_NAME_TERMS[expected] || [];
    if (['ao', 'tops', 'bottoms', 'cat-jeans'].includes(actual)) {
      const name = normalizeText(product.name);
      if (expected === 'ao-somi' && /\bt[- ]?shirt\b|\btee\b/.test(name)) return false;
      return categoryTerms.some((term) => name.includes(normalizeText(term)));
    }
    if (expected === 'quan-jeans' && actual.includes('jean')) return true;
    return false;
  }
  const slot = Object.keys(CATEGORY_GROUPS).find((key) => CATEGORY_GROUPS[key].includes(value));
  if (slot) return classifyProduct(product) === slot;
  return actual.includes(value);
}

function productColors(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return [
    ...(Array.isArray(product.colors) ? product.colors : []),
    ...variants.map((variant) => variant.colorName || variant.color).filter(Boolean),
  ];
}

function createFashionToolHandlers({
  productService,
  formatProduct,
  productColorMatches,
  assembleDynamicOutfit,
  message,
  history = [],
  userPreferences,
  currentUser = null,
  userId = null,
  sessionId = null,
}) {
  if (!productService || typeof formatProduct !== 'function' ||
      typeof productColorMatches !== 'function' || typeof assembleDynamicOutfit !== 'function') {
    throw new TypeError('Fashion tool dependencies are incomplete');
  }

  async function getAvailableProducts(args = {}) {
    const gender = VALID_GENDERS.has(args.gender) ? args.gender : undefined;
    const priceMin = boundedInteger(args.priceMin);
    const priceMax = boundedInteger(args.priceMax);
    const { items } = await productService.getProducts({
      gender,
      minPrice: priceMin,
      maxPrice: priceMax,
      page: 1,
      limit: 1000,
    });

    const category = boundedText(args.category);
    const keyword = boundedText(args.keyword);
    const normalizedQuery = normalizeFashionQuery(`${category} ${keyword}`.trim());
    const requestedColor = boundedText(args.color) || normalizedQuery.color;
    const requestedFit = boundedText(args.fit) || normalizedQuery.fit;
    const fitTerms = requestedFit === 'oversize'
      ? ['oversize', 'oversized', 'loose', 'baggy', 'form rong', 'dang rong']
      : requestedFit === 'slim-fit'
        ? ['slim', 'slim-fit', 'skinny', 'form om', 'dang om', 'fitted', 'form fitted']
        : requestedFit === 'regular'
          ? ['regular', 'classic', 'standard']
          : [];
    const queryTerms = normalizeText(keyword)
      .split(/\s+/)
      .filter((term) => term.length > 2 && !['tim', 'cho', 'minh', 'mot', 'chiec', 'duoi', 'tren'].includes(term));
    const hasStructuredFilter = Boolean(
      category ||
      normalizedQuery.category ||
      requestedColor ||
      requestedFit ||
      priceMin !== undefined ||
      priceMax !== undefined,
    );
    const available = items.filter((product) => {
      if (product.status !== 'ACTIVE' || Number(product.availableStock ?? product.stockQuantity) <= 0) return false;
      if (!productMatchesCategory(product, category || normalizedQuery.category)) return false;
      if (requestedColor && !productColorMatches(productColors(product), requestedColor)) return false;
      if (fitTerms.length > 0) {
        const searchable = normalizeText([
          product.name,
          product.description,
          product.shortDescription,
          ...(product.styles || []),
        ].join(' '));
        if (!fitTerms.some((term) => searchable.includes(normalizeText(term)))) return false;
      }
      if (queryTerms.length > 0) {
        const searchable = normalizeText([
          product.id,
          product.slug,
          product.name,
          product.description,
          product.shortDescription,
          productCategory(product),
        ].join(' '));
        if (!queryTerms.some((term) => searchable.includes(term))) return false;
      }
      return true;
    });

    return available
      .map((product) => formatProduct(product, {
        color: requestedColor,
        fit: requestedFit,
      }))
      .filter(Boolean);
  }

  function summarizeProduct(product) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      colors: product.colors,
      sizes: product.sizes,
      stockQuantity: product.stockQuantity,
      image: product.image,
      images: product.images,
    };
  }

  async function getProduct(productId) {
    const id = boundedText(productId, 191);
    if (!id) return null;
    return productService.getProductById(id);
  }

  async function searchProducts(args = {}) {
    const products = await getAvailableProducts(args);
    const page = Math.max(1, boundedInteger(args.page) || 1);
    const limit = Math.min(20, Math.max(1, boundedInteger(args.limit) || 8));
    const totalCount = products.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const results = products.slice(startIndex, startIndex + limit);
    return {
      totalCount,
      count: results.length,
      page,
      totalPages,
      hasMore: startIndex + results.length < totalCount,
      products: results,
      catalogFacts: results.map(summarizeProduct),
    };
  }

  async function getProductDetails(args = {}) {
    const source = await getProduct(args.productId);
    if (!source) return { found: false, product: null };
    const product = formatProduct(source);
    return {
      found: true,
      product: product || null,
      details: {
        id: source.id,
        name: source.name,
        price: Number(source.price),
        status: source.status,
        availableStock: Number(source.availableStock ?? source.stockQuantity ?? 0),
        category: productCategory(source),
        colors: productColors(source),
        sizes: Array.isArray(source.sizes) ? source.sizes : [],
      },
    };
  }

  async function getAvailableSizes(args = {}) {
    const source = await getProduct(args.productId);
    if (!source) return { found: false, availableSizes: [] };
    const variants = Array.isArray(source.variants) ? source.variants : [];
    if (variants.length > 0) {
      const availableVariants = variants
        .filter((variant) => variant.status !== 'INACTIVE' && Number(variant.stockQuantity) > 0)
        .map((variant) => ({
          size: variant.sizeName || variant.sizeId,
          color: variant.colorName || variant.colorId,
          stockQuantity: Number(variant.stockQuantity),
        }))
        .filter((variant) => variant.size);
      return {
        found: true,
        productId: source.id,
        productName: source.name,
        inventoryByVariant: true,
        availableSizes: availableVariants,
        product: formatProduct(source),
      };
    }

    return {
      found: true,
      productId: source.id,
      productName: source.name,
      inventoryByVariant: false,
      availableSizes: Number(source.availableStock ?? source.stockQuantity) > 0
        ? (Array.isArray(source.sizes) ? source.sizes : [])
        : [],
      note: 'Catalog hiện chỉ có tồn kho tổng của sản phẩm, không có tồn kho riêng cho từng size.',
      product: formatProduct(source),
    };
  }

  async function recommendOutfit(args = {}) {
    const parsed = normalizeFashionQuery(message);
    const intent = {
      ...parsed,
      isAskingForOutfit: true,
      requestType: 'new_outfit',
      gender: VALID_GENDERS.has(args.gender)
        ? args.gender
        : (userPreferences?.gender || parsed.gender || 'unisex'),
      style: boundedText(args.style) || userPreferences?.style || parsed.style,
      occasion: boundedText(args.occasion) || parsed.occasion,
      budget: boundedInteger(args.budget) ?? parsed.budget,
    };
    const requestedCategory = boundedText(args.category);
    if (requestedCategory) {
      const categoryIntent = normalizeFashionQuery(requestedCategory);
      intent.category = categoryIntent.category || requestedCategory.toLowerCase();
      intent.categories = categoryIntent.categories?.length
        ? categoryIntent.categories
        : [intent.category];
    }
    const outfit = await assembleDynamicOutfit(intent, null, message);
    return outfit
      ? { found: true, outfit }
      : { found: false, outfit: null, reason: 'Không tìm thấy đủ sản phẩm đang bán phù hợp tiêu chí trong catalog.' };
  }

  async function replaceOutfitItem(args = {}) {
    const slot = ['top', 'bottom', 'outerwear', 'accessory'].includes(args.replaceType)
      ? args.replaceType
      : null;
    if (!slot) return { replaced: false, reason: 'Loại sản phẩm cần thay không hợp lệ.' };

    let previousProductIds = [];
    const previousMessage = [...history].reverse().find((entry) => {
      if (entry?.role !== 'model') return false;
      if (Array.isArray(entry.productIds) && entry.productIds.length > 0) {
        previousProductIds = entry.productIds.filter((id) => typeof id === 'string');
        return true;
      }
      if (Array.isArray(entry.products) && entry.products.length > 0) {
        previousProductIds = entry.products.map((p) => (typeof p === 'object' && p?.id ? p.id : String(p))).filter(Boolean);
        return true;
      }
      if (typeof entry.text === 'string') {
        const matches = entry.text.match(/\b(p\d{3,4})\b/gi);
        if (matches && matches.length > 0) {
          previousProductIds = [...new Set(matches.map((m) => m.toLowerCase()))];
          return true;
        }
      }
      return false;
    });
    if (!previousMessage || previousProductIds.length === 0) {
      return { replaced: false, reason: 'Chưa có gợi ý sản phẩm trước đó để thay thế.' };
    }

    const sourceProducts = (await Promise.all(
      [...new Set(previousProductIds)]
        .map((id) => getProduct(id)),
    )).filter(Boolean);
    const previousProducts = sourceProducts
      .map((product) => ({ source: product, card: formatProduct(product) }))
      .filter((entry) => entry.card);
    const retained = previousProducts.filter((entry) => classifyProduct(entry.source) !== slot);
    const parsedQuery = normalizeFashionQuery(message);
    const requestedColor = boundedText(args.color) || parsedQuery.color;
    const requestedCategory = boundedText(args.category) || parsedQuery.category;
    const candidates = await getAvailableProducts({
      category: requestedCategory,
      color: requestedColor,
      gender: VALID_GENDERS.has(args.gender) && args.gender !== 'unisex' ? args.gender : undefined,
      priceMax: boundedInteger(args.budget),
    });
    const existingIds = new Set(sourceProducts.map((product) => product.id));
    const budget = boundedInteger(args.budget);
    const retainedTotal = retained.reduce((sum, entry) => sum + Number(entry.card.price), 0);
    let replacement = candidates.find((candidate) => (
      !existingIds.has(candidate.id) &&
      classifyProduct(sourceProducts.find((product) => product.id === candidate.id) || {
        category: candidate.category,
        name: candidate.name,
      }) === slot &&
      (!budget || retainedTotal + Number(candidate.price) <= budget)
    ));

    if (!replacement && args.gender) {
      const broaderCandidates = await getAvailableProducts({
        category: requestedCategory,
        color: requestedColor,
        priceMax: boundedInteger(args.budget),
      });
      replacement = broaderCandidates.find((candidate) => (
        !existingIds.has(candidate.id) &&
        classifyProduct(sourceProducts.find((product) => product.id === candidate.id) || {
          category: candidate.category,
          name: candidate.name,
        }) === slot &&
        (!budget || retainedTotal + Number(candidate.price) <= budget)
      ));
    }

    if (!replacement) {
      return { replaced: false, reason: 'Không tìm thấy món thay thế còn hàng, khớp yêu cầu và phù hợp ngân sách.' };
    }

    const products = [...retained.map((entry) => entry.card), replacement];
    const total = products.reduce((sum, product) => sum + Number(product.price), 0);
    const outfit = {
      id: `agent-outfit-${products.map((product) => product.id).join('-')}`,
      title: 'Sản phẩm thay thế từ catalog Routine',
      total,
      products,
    };
    return { replaced: true, slot, outfit };
  }

  async function explainRecommendations(args = {}) {
    const ids = Array.isArray(args.productIds)
      ? [...new Set(args.productIds.filter((id) => typeof id === 'string').slice(0, 10))]
      : [];
    const products = (await Promise.all(ids.map((id) => getProduct(id)))).filter(Boolean);
    return {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category: productCategory(product),
        price: Number(product.price),
        colors: productColors(product),
        materials: product.materials || null,
        availableStock: Number(product.availableStock ?? product.stockQuantity ?? 0),
      })),
    };
  }

  async function normalizeCustomerAddress(args = {}) {
    const raw = String(args.raw_address || '').trim();
    if (!raw) {
      return {
        status: 'NEED_MORE_INFORMATION',
        missing_fields: ['province', 'district', 'ward', 'street'],
        message: 'Vui lòng cung cấp địa chỉ giao hàng cụ thể.',
      };
    }
    const check = await shippingService.validateAndLocateAddress(raw);
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    let street = parts[0] || '';
    let ward = '';
    let district = '';
    let province = '';

    if (parts.length >= 4) {
      street = parts.slice(0, parts.length - 3).join(', ');
      ward = parts[parts.length - 3];
      district = parts[parts.length - 2];
      province = parts[parts.length - 1];
    } else if (parts.length === 3) {
      district = parts[parts.length - 2];
      province = parts[parts.length - 1];
      street = parts[0];
      if (/^(phường|xã|thị trấn|p\.|x\.)/i.test(parts[0])) {
        ward = parts[0];
        street = '';
      }
    } else if (parts.length === 2) {
      district = parts[0];
      province = parts[1];
    } else if (parts.length === 1) {
      province = parts[0];
    }

    const missing_fields = [];
    if (!province) missing_fields.push('province');
    if (!district) missing_fields.push('district');
    if (!ward) missing_fields.push('ward');
    if (!street) missing_fields.push('street');

    if (missing_fields.length > 0) {
      return {
        status: 'NEED_MORE_INFORMATION',
        raw_address: raw,
        components: { street, ward, district, province },
        missing_fields,
        message: `Địa chỉ còn thiếu: ${missing_fields.join(', ')}. Quý khách vui lòng bổ sung thêm thông tin để Routine giao hàng chính xác.`,
      };
    }

    return {
      status: check.valid ? 'VALID' : 'INVALID',
      raw_address: raw,
      formattedAddress: check.formattedAddress || raw,
      components: { street, ward, district, province },
      missing_fields: [],
      message: check.valid ? 'Địa chỉ hợp lệ.' : (check.message || 'Địa chỉ không hợp lệ.'),
    };
  }

  async function validateCustomerAddress(args = {}) {
    const province = String(args.province || '').trim();
    const district = String(args.district || '').trim();
    const ward = String(args.ward || '').trim();
    const street = String(args.street || '').trim();

    const missing_fields = [];
    if (!province) missing_fields.push('province');
    if (!district) missing_fields.push('district');
    if (!ward) missing_fields.push('ward');
    if (!street) missing_fields.push('street');

    if (missing_fields.length > 0) {
      return {
        status: 'NEED_MORE_INFORMATION',
        components: { street, ward, district, province },
        missing_fields,
        message: `Địa chỉ còn thiếu thông tin: ${missing_fields.join(', ')}. Quý khách vui lòng cung cấp thêm thông tin này.`,
      };
    }

    const check = await shippingService.validateAndLocateAddress({
      address: street,
      ward,
      district,
      city: province,
    });

    if (!check.valid) {
      return {
        status: 'INVALID',
        components: { street, ward, district, province },
        message: check.message || 'Đơn vị hành chính không hợp lệ. Vui lòng kiểm tra lại Tỉnh/Thành phố hoặc Quận/Huyện.',
      };
    }

    return {
      status: 'VALID',
      valid: true,
      formattedAddress: check.formattedAddress,
      components: { street, ward, district, province },
      missing_fields: [],
      message: 'Địa chỉ hợp lệ và đã được xác thực thành công.',
    };
  }

  async function calculateShippingFeeTool(args = {}) {
    const province = String(args.province || '').trim();
    const district = String(args.district || '').trim();
    const ward = String(args.ward || '').trim();
    const cartTotal = Number(args.cart_total) || 0;
    const method = String(args.shipping_method || 'standard').toLowerCase();

    if (!province) {
      return {
        status: 'NEED_MORE_INFORMATION',
        message: 'Cần có thông tin Tỉnh/Thành phố để tính phí giao hàng.',
      };
    }

    const result = await shippingService.calculateAdministrativeShippingFee(
      { city: province, province, district, ward },
      cartTotal,
      method
    );

    const standard = result.methods?.standard || {};
    const express = result.methods?.express || {};
    const selected = method === 'express' && express?.available ? express : standard;

    return {
      status: 'SUCCESS',
      zone: result.matchedZone || result.zone || 'Toàn quốc',
      shippingMethod: method,
      shippingFee: selected.fee !== undefined ? selected.fee : (result.effectiveFee || 30000),
      baseFee: selected.baseFee || 30000,
      discount: selected.discount || 0,
      discountNote: selected.discountNote || '',
      isFree: selected.isFree || false,
      freeShipThreshold: selected.freeShipThreshold || 499000,
      eta: selected.eta || '2-3 ngày',
      provider: selected.provider || 'Routine Logistics',
      cartTotal,
      finalTotal: cartTotal + (selected.fee !== undefined ? selected.fee : (result.effectiveFee || 30000)),
      expressAvailable: express?.available || false,
    };
  }

  function getShippingPolicyTool() {
    return {
      status: 'SUCCESS',
      policy: {
        brand: 'Routine Vietnam',
        freeShippingThreshold: 500000,
        freeShippingNote: 'Miễn phí giao hàng tiêu chuẩn toàn quốc cho đơn hàng từ 500.000đ.',
        innerUrbanFee: 20000,
        innerUrbanEta: '1-2 ngày làm việc (Nội thành Hà Nội, TP.HCM, Đà Nẵng)',
        outerUrbanFee: 30000,
        outerUrbanEta: '2-3 ngày làm việc (Ngoại thành Hà Nội, TP.HCM, Đà Nẵng)',
        nationwideFee: 35000,
        nationwideEta: '3-4 ngày làm việc (Các tỉnh thành khác)',
        remoteFee: 45000,
        remoteEta: '4-5 ngày làm việc (Vùng sâu vùng xa, miền núi, hải đảo)',
        expressInnerFee: 50000,
        expressEta: '2-4 giờ trong ngày (Áp dụng nội thành Hà Nội, TP.HCM, Đà Nẵng)',
      },
    };
  }

  async function lookupCustomerOrder(args = {}) {
    const orderId = boundedText(args.orderId, 100);
    if (!orderId) {
      return { found: false, error: 'Vui lòng cung cấp mã đơn hàng cần tra cứu.' };
    }
    try {
      const order = await orderService.getOrderById(orderId);
      if (!order) {
        return { found: false, error: 'Không tìm thấy đơn hàng với mã này trong hệ thống.' };
      }
      const orderUserId = order.userId;
      const orderGuestId = order.guestSessionId;
      const effectiveUserId = userId || currentUser?.id;
      const isAuthorized = (effectiveUserId && orderUserId && String(orderUserId) === String(effectiveUserId)) ||
                           (sessionId && orderGuestId && String(orderGuestId) === String(sessionId));
      if (!isAuthorized) {
        return {
          found: false,
          error: 'Bạn không có quyền truy cập thông tin đơn hàng này. Chỉ có thể tra cứu đơn hàng của chính tài khoản của bạn.',
        };
      }
      return {
        found: true,
        orderId: order.id,
        status: order.orderStatus || order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.total,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        receiverName: order.receiverName,
        createdAt: order.createdAt,
        itemsCount: Array.isArray(order.items) ? order.items.length : 0,
        items: (order.items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
      };
    } catch (err) {
      return { found: false, error: 'Lỗi khi tra cứu đơn hàng: ' + err.message };
    }
  }

  const handlers = {
    search_products: searchProducts,
    get_product_details: getProductDetails,
    recommend_outfit: recommendOutfit,
    replace_outfit_item: replaceOutfitItem,
    get_available_sizes: getAvailableSizes,
    get_recommendation_explanation: explainRecommendations,
    normalize_customer_address: normalizeCustomerAddress,
    validate_customer_address: validateCustomerAddress,
    calculate_shipping_fee: calculateShippingFeeTool,
    get_shipping_policy: getShippingPolicyTool,
    lookup_customer_order: lookupCustomerOrder,
  };

  return async function executeTool(name, args) {
    const handler = handlers[name];
    if (!handler) throw new Error(`Unknown fashion tool: ${String(name)}`);
    return handler(args);
  };
}

module.exports = { createFashionToolHandlers };
