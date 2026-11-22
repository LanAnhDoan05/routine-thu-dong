// productService.js
// Data-access layer connecting frontend directly to Routine Backend REST API (MySQL)
// with seamless fallback to verified catalog dataset for production CDN reliability.

import { fetchApi } from "./api";
import fallbackProducts from "@/data/productsFallback.json";

export async function fetchAllProducts() {
  try {
    const data = await fetchApi('/products?limit=1000');
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
  } catch (err) {
    console.warn('[productService] Backend fetch failed, using verified catalog dataset:', err.message);
  }
  return Array.isArray(fallbackProducts) && fallbackProducts.length > 0 ? fallbackProducts : [];
}

export async function fetchProductById(id) {
  try {
    const data = await fetchApi(`/products/${id}`);
    if (data && data.id) {
      return data;
    }
  } catch (err) {
    console.warn(`[productService] Failed to fetch product ${id}, using fallback:`, err.message);
  }
  return fallbackProducts.find((p) => p.id === id || p.slug === id) || null;
}

export async function fetchProductsByCategory(slug) {
  try {
    const data = await fetchApi(`/products?category=${encodeURIComponent(slug)}&limit=100`);
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
  } catch (err) {
    console.warn(`[productService] Failed to fetch category ${slug}, using fallback:`, err.message);
  }
  return fallbackProducts.filter(
    (p) => p.categoryId === slug || p.categorySlug === slug || p.category?.slug === slug
  );
}

export async function fetchProductsByStyle(styleSlug) {
  try {
    const data = await fetchApi(`/products?style=${encodeURIComponent(styleSlug)}&limit=100`);
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
  } catch (err) {
    console.warn(`[productService] Failed to fetch style ${styleSlug}, using fallback:`, err.message);
  }
  return fallbackProducts.filter((p) => {
    const styles = Array.isArray(p.styles) ? p.styles : Array.isArray(p.style) ? p.style : [];
    return styles.includes(styleSlug);
  });
}

export async function fetchProductsByIds(ids) {
  if (!ids || !ids.length) return [];
  const promises = ids.map((id) => fetchProductById(id));
  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

export async function fetchRelatedProducts(id, limit = 4) {
  try {
    const data = await fetchApi(`/products/${id}/related?limit=${limit}`);
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
  } catch (err) {
    console.warn(`[productService] Failed to fetch related for ${id}:`, err.message);
  }
  const current = fallbackProducts.find((p) => p.id === id);
  return fallbackProducts
    .filter((p) => p.id !== id && (!current || p.categoryId === current.categoryId))
    .slice(0, limit);
}

export async function searchProducts(query) {
  const q = query?.trim().toLowerCase();
  if (!q) return [];
  try {
    const data = await fetchApi(`/products?q=${encodeURIComponent(q)}&limit=50`);
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
  } catch (err) {
    console.warn(`[productService] Failed to search via backend, searching catalog:`, err.message);
  }
  return fallbackProducts.filter(
    (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  );
}

export function sortProducts(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
      return sorted.sort((a, b) => (b.badge === "NEW" ? 1 : 0) - (a.badge === "NEW" ? 1 : 0));
    case "recommended":
    default:
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
}

export function filterProducts(list, filters = {}) {
  let result = [...list];
  const { category, size, color, priceRange, style, gender } = filters;

  if (category) {
    result = result.filter((p) => p.category === category || p.categoryId === category || p.categorySlug === category);
  }
  if (gender) {
    result = result.filter((p) => p.gender === gender);
  }
  if (size) {
    result = result.filter((p) => p.sizes?.includes(size));
  }
  if (color) {
    result = result.filter((p) => p.colors?.includes(color));
  }
  if (style) {
    result = result.filter((p) => p.style?.includes(style) || p.styles?.includes(style));
  }
  if (priceRange) {
    const [min, max] = priceRange;
    result = result.filter((p) => p.price >= min && (max == null || p.price <= max));
  }
  return result;
}

export function getRelatedProducts(product, limit = 4) {
  return [];
}
