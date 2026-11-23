"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductGrid from "@/components/product/ProductGrid";
import ProductReviews from "@/components/product/ProductReviews";
import { fetchProductById, fetchRelatedProducts } from "@/lib/productService";
import { recordAttributionFromUrl, trackEvent } from "@/lib/attribution";
import { isProductOutOfStock } from "@/data/products";
import { trackViewItem } from "@/lib/ga4";

export default function ProductDetailClient({ initialProduct, initialRelated = [], productId }) {
  const [product, setProduct] = useState(initialProduct);
  const [related, setRelated] = useState(initialRelated);
  const [loading, setLoading] = useState(!initialProduct);
  const trackedProductIdRef = useRef(null);

  useEffect(() => {
    if (product && product.id && trackedProductIdRef.current !== product.id) {
      trackedProductIdRef.current = product.id;
      try {
        trackViewItem({ item: product });
      } catch (err) {}
    }
  }, [product]);

  useEffect(() => {
    let active = true;
    const targetId = productId || initialProduct?.id;
    if (!targetId) return;

    // Ghi nhận nguồn tiếp thị từ URL (nếu có ?source=tiktok/facebook/instagram)
    recordAttributionFromUrl();
    trackEvent({ productId: targetId, action: "VIEW" });

    // Nếu chưa có dữ liệu ban đầu từ SSR, fetch từ client
    if (!initialProduct) {
      fetchProductById(targetId)
        .then((p) => {
          if (active) {
            setProduct(p);
            setLoading(false);
            if (p) {
              fetchRelatedProducts(p.id, 4).then((rel) => {
                if (active) setRelated(rel || []);
              });
            }
          }
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    } else if (initialRelated.length === 0 && initialProduct?.id) {
      fetchRelatedProducts(initialProduct.id, 4).then((rel) => {
        if (active) setRelated(rel || []);
      });
    }

    // Lắng nghe sự kiện đồng bộ giá, tồn kho hoặc ẩn sản phẩm thời gian thực từ Admin
    function handleRealtimeUpdate(e) {
      const data = e.detail;
      if (!data) return;
      if (data.id === targetId || data.productId === targetId || (data.items && data.items.some((it) => it.productId === targetId))) {
        fetchProductById(targetId).then((updated) => {
          if (active && updated) {
            setProduct(updated);
          }
        }).catch(() => {});
      }
    }

    window.addEventListener("routine:product_updated", handleRealtimeUpdate);
    window.addEventListener("routine:product_status_changed", handleRealtimeUpdate);
    window.addEventListener("routine:stock_updated", handleRealtimeUpdate);

    return () => {
      active = false;
      window.removeEventListener("routine:product_updated", handleRealtimeUpdate);
      window.removeEventListener("routine:product_status_changed", handleRealtimeUpdate);
      window.removeEventListener("routine:stock_updated", handleRealtimeUpdate);
    };
  }, [productId, initialProduct, initialRelated.length]);

  if (loading) {
    return (
      <div className="container section" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container section" style={{ minHeight: "50vh", textAlign: "center", padding: "60px 20px" }}>
        <h2>Không tìm thấy sản phẩm</h2>
        <p style={{ color: "var(--color-text-secondary)", margin: "16px 0 24px" }}>
          Sản phẩm bạn đang tìm kiếm có thể đã hết hàng hoặc không tồn tại.
        </p>
        <Link href="/" className="btn btn-primary">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <nav className="breadcrumb" style={{ marginBottom: 24 }} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/category/${typeof product.category === 'object' ? (product.category?.slug || product.category?.id || '') : (product.categorySlug || product.category || '')}`}>
          {typeof product.category === 'object' ? (product.category?.name || product.category?.slug || '') : (product.categoryName || product.category || '')}
        </Link>
        <span>/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="product-detail-layout">
        <ProductGallery
          key={`gallery-${product.id}-${(product.images || []).join("-")}`}
          images={product.images}
          productName={product.name}
          isOutOfStock={isProductOutOfStock(product)}
        />
        <ProductInfo
          key={`info-${product.id}-${product.updatedAt || ""}-${(product.colors || []).join("-")}-${(product.sizes || []).join("-")}`}
          product={product}
          isOutOfStock={isProductOutOfStock(product)}
        />
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && (
        <section style={{ marginTop: 72 }}>
          <div className="section-header">
            <span className="eyebrow">You may also like</span>
            <h2 className="section-title">Related Products</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      )}

      <style>{`
        .product-detail-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
        }
        @media (max-width: 1023px) {
          .product-detail-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>
    </div>
  );
}
