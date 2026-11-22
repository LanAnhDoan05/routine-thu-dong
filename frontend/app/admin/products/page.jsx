"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import ProductFilters from "@/components/admin/ProductFilters";
import ProductTable from "@/components/admin/ProductTable";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatCard from "@/components/admin/StatCard";
import { useToast } from "@/components/admin/ToastProvider";
import {
  IconPlus,
  IconTrash,
  IconProducts,
  IconEye,
  IconArchive,
  IconAlertCircle,
  IconStar,
} from "@/components/admin/icons";
import {
  getProducts,
  deleteProduct,
  duplicateProduct,
  getProductStatistics,
} from "@/lib/adminProductService";
import { getCategories } from "@/lib/categoryService";
import { getStyles } from "@/lib/styleService";
import styles from "./page.module.css";

const DEFAULT_FILTERS = {
  search: "",
  categoryId: "ALL",
  gender: "ALL",
  styleId: "ALL",
  status: "ALL",
  stock: "ALL",
};

export default function ProductsPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [allStyles, setAllStyles] = useState([]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [products, setProducts] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null); // "bulk" | product | null
  const [deleting, setDeleting] = useState(false);

  async function loadStats() {
    try {
      const res = await getProductStatistics();
      if (res && typeof res.totalProducts === "number") {
        setStats(res);
      } else if (res?.data && typeof res.data.totalProducts === "number") {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Không thể tải thống kê sản phẩm:", err);
    }
  }

  useEffect(() => {
    let active = true;
    getCategories().then((cats) => {
      if (active && Array.isArray(cats)) setCategories(cats);
    });
    getStyles().then((sts) => {
      if (active && Array.isArray(sts)) setAllStyles(sts);
    });
    Promise.resolve().then(() => {
      if (active) loadStats();
    });
    return () => {
      active = false;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    setProducts(null);
    setLoadError("");
    try {
      const data = await getProducts(filters);
      setProducts(data);
    } catch (error) {
      setProducts([]);
      setLoadError(error.message || "Không thể tải sản phẩm từ máy chủ.");
    }
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadProducts();
    });
    return () => {
      ignore = true;
    };
  }, [loadProducts]);

  // Lắng nghe sự kiện đồng bộ thời gian thực từ Backend
  useEffect(() => {
    function handleRealtimeSync() {
      loadProducts();
      loadStats();
    }

    window.addEventListener("routine:product_created", handleRealtimeSync);
    window.addEventListener("routine:product_updated", handleRealtimeSync);
    window.addEventListener("routine:product_status_changed", handleRealtimeSync);
    window.addEventListener("routine:stock_updated", handleRealtimeSync);

    return () => {
      window.removeEventListener("routine:product_created", handleRealtimeSync);
      window.removeEventListener("routine:product_updated", handleRealtimeSync);
      window.removeEventListener("routine:product_status_changed", handleRealtimeSync);
      window.removeEventListener("routine:stock_updated", handleRealtimeSync);
    };
  }, [loadProducts]);

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleSelectAll(checked) {
    setSelectedIds(checked ? (products || []).map((p) => p.id) : []);
  }

  async function handleDuplicate(product) {
    await duplicateProduct(product.id);
    showToast(`Đã nhân bản “${product.name}”.`, "success");
    loadProducts();
    loadStats();
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      if (pendingDelete === "bulk") {
        await Promise.all(selectedIds.map((id) => deleteProduct(id)));
        showToast(`Đã xoá ${selectedIds.length} sản phẩm khỏi hệ thống.`, "success");
        setSelectedIds([]);
      } else if (pendingDelete) {
        const res = await deleteProduct(pendingDelete.id);
        const msg = res?.message || `Đã xoá “${pendingDelete.name}” thành công.`;
        showToast(msg, "success");
        setSelectedIds((prev) => prev.filter((id) => id !== pendingDelete.id));
      }
      await loadProducts();
      await loadStats();
    } catch (err) {
      showToast(err?.message || "Không thể xoá sản phẩm.", "error");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        actions={
          <Link href="/admin/products/new" className={styles.addBtn}>
            <IconPlus size={16} /> Add Product
          </Link>
        }
      />

      <div className={styles.statsGrid}>
        <StatCard
          label="Tổng sản phẩm"
          value={stats?.totalProducts ?? (products ? products.length : "—")}
          description="Tổng số sản phẩm trong Database"
          icon={<IconProducts size={18} />}
          tone="default"
        />
        <StatCard
          label="Đang trưng bày"
          value={stats?.activeProducts ?? "—"}
          description="Sản phẩm ACTIVE mở bán trên website"
          icon={<IconEye size={18} />}
          tone="success"
        />
        <StatCard
          label="Đang ẩn"
          value={stats?.inactiveProducts ?? "—"}
          description="Sản phẩm INACTIVE / bản nháp"
          icon={<IconArchive size={18} />}
          tone="warning"
        />
        <StatCard
          label="Hết hàng"
          value={stats?.outOfStockProducts ?? "—"}
          description="Sản phẩm có tồn kho khả dụng = 0"
          icon={<IconAlertCircle size={18} />}
          tone="danger"
        />
        <StatCard
          label="Hiển thị trang chủ"
          value={stats?.homepageProducts ?? "—"}
          description="Đủ điều kiện xuất hiện trên trang chủ"
          icon={<IconStar size={18} />}
          tone="info"
        />
      </div>

      <ProductFilters filters={filters} onChange={handleFilterChange} categories={categories} styleOptions={allStyles} />

      {products !== null && !loadError ? (
        <div className={styles.countBar}>
          <span>
            Đang hiển thị <strong>{products.length}</strong> / <strong>{products.length}</strong> sản phẩm
            {filters.search || filters.categoryId !== "ALL" || filters.gender !== "ALL" || filters.styleId !== "ALL" || filters.status !== "ALL" || filters.stock !== "ALL" ? (
              <span className={styles.filterNote}> (theo bộ lọc hiện tại)</span>
            ) : null}
          </span>
          <span className={styles.totalBadge}>
            Toàn hệ thống: {stats?.totalProducts ?? products.length} sản phẩm
          </span>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className={styles.bulkBar}>
          <span>{selectedIds.length} sản phẩm được chọn</span>
          <button type="button" className={styles.bulkDeleteBtn} onClick={() => setPendingDelete("bulk")}>
            <IconTrash size={14} /> Delete selected
          </button>
        </div>
      ) : null}

      {products === null ? (
        <p className={styles.loadingText}>Đang tải sản phẩm…</p>
      ) : loadError ? (
        <div role="alert" className={styles.loadingText}>
          <p>{loadError}</p>
          <button type="button" onClick={loadProducts}>Thử lại</button>
        </div>
      ) : (
        <ProductTable
          products={products}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onDuplicate={handleDuplicate}
          onDeleteRequest={setPendingDelete}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title={pendingDelete === "bulk" ? "Xoá các sản phẩm đã chọn?" : `Xoá “${pendingDelete?.name}”?`}
        description={
          pendingDelete === "bulk"
            ? "Sản phẩm chưa có đơn hàng sẽ bị xoá vĩnh viễn khỏi Database. Sản phẩm đã có đơn hàng sẽ được chuyển sang trạng thái Ẩn."
            : `Sản phẩm “${pendingDelete?.name}” nếu chưa có đơn hàng sẽ bị xoá vĩnh viễn khỏi Database. Bạn có chắc chắn muốn xoá?`
        }
        confirmLabel="Xác nhận xoá"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
