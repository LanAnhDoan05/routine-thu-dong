"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import {
  IconProducts,
  IconOrders,
  IconCustomers,
  IconArchive,
  IconTikTok,
  IconFacebook,
  IconInstagram,
  IconLink,
} from "@/components/admin/icons";
import SocialLinkGeneratorModal from "@/components/admin/SocialLinkGeneratorModal";
import { fetchAdminDashboard } from "@/lib/analyticsService";
import { formatCurrency, formatCompactNumber, formatDate, formatNumber } from "@/lib/format";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminDashboard();
    if (data) {
      setDashboard(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadDashboardData();
    });
    return () => {
      ignore = true;
    };
  }, [loadDashboardData]);

  // Tự động cập nhật số liệu Dashboard theo thời gian thực
  useEffect(() => {
    function handleRealtimeSync() {
      loadDashboardData();
    }

    window.addEventListener("routine:order_created", handleRealtimeSync);
    window.addEventListener("routine:order_status_updated", handleRealtimeSync);
    window.addEventListener("routine:payment_confirmed", handleRealtimeSync);
    window.addEventListener("routine:customer_registered", handleRealtimeSync);
    window.addEventListener("routine:product_created", handleRealtimeSync);

    return () => {
      window.removeEventListener("routine:order_created", handleRealtimeSync);
      window.removeEventListener("routine:order_status_updated", handleRealtimeSync);
      window.removeEventListener("routine:payment_confirmed", handleRealtimeSync);
      window.removeEventListener("routine:customer_registered", handleRealtimeSync);
      window.removeEventListener("routine:product_created", handleRealtimeSync);
    };
  }, [loadDashboardData]);

  const kpi = dashboard?.kpi;
  const ecosystem = dashboard?.socialEcosystem;
  const recentOrders = dashboard?.recentOrders || [];
  const topSelling = dashboard?.topSellingProducts || [];
  const lowStock = dashboard?.inventoryAlerts?.lowStock || [];
  const outOfStock = dashboard?.inventoryAlerts?.outOfStock || [];

  const tiktokData = ecosystem?.breakdown?.TIKTOK || { clicks: 0, guestCount: 0, ordersCount: 0, registeredCount: 0, revenue: 0 };
  const fbData = ecosystem?.breakdown?.FACEBOOK || { clicks: 0, guestCount: 0, ordersCount: 0, registeredCount: 0, revenue: 0 };
  const igData = ecosystem?.breakdown?.INSTAGRAM || { clicks: 0, guestCount: 0, ordersCount: 0, registeredCount: 0, revenue: 0 };

  return (
    <div>
      <PageHeader
        title="Dashboard Quản Trị"
        subtitle="Tổng quan kinh doanh, đơn hàng thực tế và hiệu quả tiếp thị mạng xã hội thời gian thực từ Database MySQL"
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={loadDashboardData}
              title="Làm mới dữ liệu từ Database"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
            >
              <span>↻ Làm mới</span>
            </button>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={() => setGeneratorOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#0f172a", color: "#fff", borderColor: "#0f172a" }}
            >
              <IconLink size={15} />
              <span>Tạo Link Tiếp Thị Mạng Xã Hội</span>
            </button>
          </div>
        }
      />

      {/* ================= THẺ CHỈ SỐ KPI CHÍNH ================= */}
      <div className={styles.statGrid}>
        <StatCard
          label="Tổng Doanh Thu"
          value={kpi ? formatCurrency(kpi.totalRevenue) : "—"}
          helper={kpi ? `Đã thanh toán: ${formatCurrency(kpi.paidRevenue)}` : undefined}
          icon={<IconOrders size={16} />}
          tone="success"
        />
        <StatCard
          label="Tổng Đơn Hàng"
          value={kpi ? formatNumber(kpi.totalOrders) : "—"}
          helper={kpi ? `${kpi.validOrders} thành công · ${kpi.statusBreakdown?.cancelled || 0} đã huỷ (Tổng ${kpi.totalOrders})` : undefined}
          icon={<IconOrders size={16} />}
        />
        <StatCard
          label="Giá Trị Đơn TB (AOV)"
          value={kpi ? formatCurrency(kpi.averageOrderValue) : "—"}
          icon={<IconOrders size={16} />}
        />
        <StatCard
          label="Khách Hàng & Khách Vãng Lai"
          value={kpi ? formatNumber(kpi.totalCustomers) : "—"}
          helper={kpi ? `${kpi.totalCustomers} thành viên · ${kpi.totalGuests} phiên truy cập` : undefined}
          icon={<IconCustomers size={16} />}
        />
        <StatCard
          label="Sản Phẩm Trong Kho"
          value={kpi ? formatNumber(kpi.totalProducts) : "—"}
          helper={kpi ? `${kpi.activeProducts} còn hàng · ${kpi.lowStockProducts} sắp hết` : undefined}
          icon={<IconProducts size={16} />}
        />
        <StatCard
          label="Hết Hàng & Đánh Giá"
          value={kpi ? `${kpi.outOfStockProducts} hết hàng` : "—"}
          helper={kpi ? `⭐ ${kpi.averageRating}/5.0 (${kpi.totalReviews} lượt đánh giá)` : undefined}
          icon={<IconArchive size={16} />}
          tone={kpi && kpi.outOfStockProducts > 0 ? "danger" : undefined}
        />
      </div>

      {/* ================= BÁO CÁO PHỄU CHUYỂN ĐỔI (FUNNEL & CONVERSION - 2 THÁNG) ================= */}
      {dashboard?.funnel && (
        <section className={styles.section} style={{ background: "#ffffff", borderRadius: "var(--radius-md, 10px)", padding: "20px 24px", border: "1px solid var(--color-border, #e2e8f0)", marginBottom: 24 }}>
          <div className={styles.sectionHead} style={{ marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Báo Cáo Hiệu Suất & Phễu Chuyển Đổi</h2>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#dbeafe", color: "#1e40af" }}>
                  Kỳ báo cáo: {dashboard.funnel.reportingPeriod}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: 0 }}>
                Nguồn dữ liệu: <strong>{dashboard.funnel.dataSource}</strong> · Tỷ lệ hoàn tất mua hàng: <strong>{((dashboard.funnel.successfulOrders / dashboard.funnel.totalSessions) * 100).toFixed(1)}%</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 12 }}>
            <div style={{ background: "var(--color-bg-secondary, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", fontWeight: 600 }}>1. Phiên Truy Cập</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text)", margin: "4px 0" }}>{formatNumber(dashboard.funnel.totalSessions)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Social: {dashboard.funnel.socialSessions} · Organic: {dashboard.funnel.organicSessions}</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", fontWeight: 600 }}>2. Xem Sản Phẩm</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text)", margin: "4px 0" }}>{formatNumber(dashboard.funnel.productViewSessions)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{((dashboard.funnel.productViewSessions / dashboard.funnel.totalSessions) * 100).toFixed(0)}% trên tổng phiên</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", fontWeight: 600 }}>3. Thêm Vào Giỏ</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text)", margin: "4px 0" }}>{formatNumber(dashboard.funnel.addToCartSessions)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{((dashboard.funnel.addToCartSessions / dashboard.funnel.totalSessions) * 100).toFixed(1)}% tỷ lệ thêm giỏ</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", fontWeight: 600 }}>4. Bắt Đầu Thanh Toán</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text)", margin: "4px 0" }}>{formatNumber(dashboard.funnel.beginCheckoutSessions)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{((dashboard.funnel.beginCheckoutSessions / dashboard.funnel.addToCartSessions) * 100).toFixed(0)}% từ giỏ hàng</div>
            </div>

            <div style={{ background: "#ecfdf5", padding: "12px 14px", borderRadius: 8, border: "1px solid #a7f3d0" }}>
              <div style={{ fontSize: 11.5, color: "#065f46", fontWeight: 600 }}>5. Đơn Thành Công</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#047857", margin: "4px 0" }}>{formatNumber(dashboard.funnel.successfulOrders)}</div>
              <div style={{ fontSize: 11, color: "#059669" }}>{dashboard.funnel.successfulOrders} đơn hoàn tất</div>
            </div>

            <div style={{ background: "#fef2f2", padding: "12px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
              <div style={{ fontSize: 11.5, color: "#991b1b", fontWeight: 600 }}>6. Đơn Bị Hủy</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#b91c1c", margin: "4px 0" }}>{formatNumber(dashboard.funnel.cancelledOrders)}</div>
              <div style={{ fontSize: 11, color: "#dc2626" }}>{dashboard.funnel.cancelledOrders} đơn đã huỷ</div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "12px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 600 }}>7. Doanh Thu Thực</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#15803d", margin: "4px 0" }}>{formatCurrency(dashboard.funnel.realizedRevenue)}</div>
              <div style={{ fontSize: 11, color: "#16a34a" }}>AOV: {formatCurrency(dashboard.kpi?.averageOrderValue)}</div>
            </div>
          </div>
        </section>
      )}

      {/* ================= HỆ SINH THÁI MẠNG XÃ HỘI (TIKTOK, FACEBOOK, INSTAGRAM) ================= */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Hệ Sinh Thái Mạng Xã Hội (Social Ecosystem Tracking)</h2>
            <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Dữ liệu truy cập thực tế theo bảng `traffic_logs`, thành viên mới từ nguồn mạng xã hội và đơn hàng chốt thành công
            </p>
          </div>
          <Link href="/admin/customers" className={styles.viewAllBtn}>
            Xem Khách Hàng & Khách Vãng Lai →
          </Link>
        </div>

        <div className={styles.socialGrid}>
          {/* TIKTOK */}
          <div className={`${styles.socialCard} ${styles.socialCardTiktok}`}>
            <div className={styles.socialCardHeader}>
              <div className={styles.socialTitle}>
                <IconTikTok size={18} />
                <span>TikTok Platform</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>
                CR: {tiktokData.clicks > 0 ? ((tiktokData.ordersCount / tiktokData.clicks) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className={styles.socialStatRows}>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Lượt Clicks</div>
                <div className={styles.socialStatValue}>{tiktokData.clicks}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Khách vãng lai</div>
                <div className={styles.socialStatValue}>{tiktokData.guestCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Đơn hàng tạo</div>
                <div className={styles.socialStatValue}>{tiktokData.ordersCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Thành viên mới</div>
                <div className={styles.socialStatValue}>{tiktokData.registeredCount || 0}</div>
              </div>
            </div>
            <div className={styles.socialRevenueBox}>
              <span className={styles.socialRevenueLabel}>Doanh thu TikTok</span>
              <span className={styles.socialRevenueVal}>{formatCurrency(tiktokData.revenue)}</span>
            </div>
          </div>

          {/* FACEBOOK */}
          <div className={`${styles.socialCard} ${styles.socialCardFacebook}`}>
            <div className={styles.socialCardHeader}>
              <div className={styles.socialTitle}>
                <IconFacebook size={18} />
                <span>Facebook Platform</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1877f2" }}>
                CR: {fbData.clicks > 0 ? ((fbData.ordersCount / fbData.clicks) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className={styles.socialStatRows}>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Lượt Clicks</div>
                <div className={styles.socialStatValue}>{fbData.clicks}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Khách vãng lai</div>
                <div className={styles.socialStatValue}>{fbData.guestCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Đơn hàng tạo</div>
                <div className={styles.socialStatValue}>{fbData.ordersCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Thành viên mới</div>
                <div className={styles.socialStatValue}>{fbData.registeredCount || 0}</div>
              </div>
            </div>
            <div className={styles.socialRevenueBox}>
              <span className={styles.socialRevenueLabel}>Doanh thu Facebook</span>
              <span className={styles.socialRevenueVal}>{formatCurrency(fbData.revenue)}</span>
            </div>
          </div>

          {/* INSTAGRAM */}
          <div className={`${styles.socialCard} ${styles.socialCardInstagram}`}>
            <div className={styles.socialCardHeader}>
              <div className={styles.socialTitle}>
                <IconInstagram size={18} />
                <span>Instagram Platform</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#e1306c" }}>
                CR: {igData.clicks > 0 ? ((igData.ordersCount / igData.clicks) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className={styles.socialStatRows}>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Lượt Clicks</div>
                <div className={styles.socialStatValue}>{igData.clicks}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Khách vãng lai</div>
                <div className={styles.socialStatValue}>{igData.guestCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Đơn hàng tạo</div>
                <div className={styles.socialStatValue}>{igData.ordersCount}</div>
              </div>
              <div className={styles.socialStatBox}>
                <div className={styles.socialStatLabel}>Thành viên mới</div>
                <div className={styles.socialStatValue}>{igData.registeredCount || 0}</div>
              </div>
            </div>
            <div className={styles.socialRevenueBox}>
              <span className={styles.socialRevenueLabel}>Doanh thu Instagram</span>
              <span className={styles.socialRevenueVal}>{formatCurrency(igData.revenue)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= DANH SÁCH 10 ĐƠN HÀNG MỚI NHẤT ================= */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Đơn Hàng Gần Đây ({recentOrders.length})</h2>
            <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Các đơn hàng mới nhất đặt qua hệ thống Routine Thu Đông Storefront
            </p>
          </div>
          <Link href="/orders" target="_blank" className={styles.viewAllBtn}>
            Xem Cổng Khách Hàng →
          </Link>
        </div>
        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Tổng tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                  <th className={styles.actionCol}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--color-text-secondary)" }}>
                      Chưa có đơn hàng nào trong cơ sở dữ liệu.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className={styles.orderId}>#{order.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>
                          {order.phoneNumber ? `${order.phoneNumber} · ` : ""}{order.customerEmail}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={order.itemsSummary}>
                        <span style={{ fontWeight: 500 }}>{order.itemsCount} sản phẩm</span>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {order.itemsSummary || "—"}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--color-text)" }}>
                        {formatCurrency(order.total)}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: order.paymentStatus === "PAID" ? "#ecfdf5" : "#fef3c7", color: order.paymentStatus === "PAID" ? "#065f46" : "#92400e" }}>
                          {order.paymentMethod} · {order.paymentStatus === "PAID" ? "Đã trả" : "Chưa trả"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={order.orderStatus} />
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>{formatDate(order.createdAt)}</div>
                      </td>
                      <td className={styles.actionCol}>
                        <Link href={`/orders/${order.id}`} target="_blank" className={styles.linkBtn}>
                          Xem đơn
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= TỔNG QUAN SẢN PHẨM & TỒN KHO THỰC TẾ ================= */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Tổng Quan Sản Phẩm & Cảnh Báo Kho Hàng</h2>
            <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Top 5 sản phẩm bán chạy nhất tính từ các đơn hàng thực tế trong MySQL và cảnh báo số lượng tồn kho
            </p>
          </div>
          <Link href="/admin/products" className={styles.viewAllBtn}>
            Quản Lý Toàn Bộ Sản Phẩm →
          </Link>
        </div>

        <div className={styles.overviewGrid}>
          {/* Top Bán Chạy */}
          <ProductMiniList
            title="Top Sản Phẩm Bán Chạy Nhất"
            items={topSelling}
            emptyText="Chưa có dữ liệu bán hàng."
            showSales
          />

          {/* Sắp Hết Hàng */}
          <ProductMiniList
            title="Sắp Hết Hàng (Tồn kho ≤ 15)"
            items={lowStock}
            emptyText="Kho hàng ổn định, không có sản phẩm sắp hết."
            showStock
            badgeTone="warning"
          />

          {/* Hết Hàng */}
          <ProductMiniList
            title="Sản Phẩm Đã Hết Hàng (= 0)"
            items={outOfStock}
            emptyText="Tất cả sản phẩm đều còn hàng trong kho."
            showStock
            badgeTone="danger"
          />
        </div>
      </section>

      {/* Modal Tạo Link Tiếp Thị */}
      <SocialLinkGeneratorModal
        isOpen={generatorOpen}
        onClose={() => {
          setGeneratorOpen(false);
          loadDashboardData();
        }}
      />
    </div>
  );
}

function ProductMiniList({ title, items, emptyText, showStock, showSales, badgeTone }) {
  return (
    <div className={styles.miniListCard}>
      <h3 className={styles.miniListTitle}>{title}</h3>
      {items.length === 0 ? (
        <EmptyState title={emptyText} icon={<IconArchive size={18} />} />
      ) : (
        <ul className={styles.miniList}>
          {items.map((p) => (
            <li key={p.id} className={styles.miniItem}>
              <Image src={p.image || "/images/products/men-tshirt-1.avif"} alt={p.name} width={40} height={40} className={styles.miniThumb} />
              <div className={styles.miniInfo}>
                <Link href={`/product/${p.id}`} target="_blank" className={styles.miniName}>
                  {p.name}
                </Link>
                <span className={styles.miniMeta}>{p.categoryName || "Thời trang Routine Thu Đông"}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {showSales ? (
                  <>
                    <span className={styles.miniValue} style={{ color: "#059669" }}>
                      {p.totalSold} đã bán
                    </span>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {formatCurrency(p.totalSales)}
                    </div>
                  </>
                ) : showStock ? (
                  <span
                    className={styles.miniValue}
                    style={{
                      color: badgeTone === "danger" ? "#dc2626" : "#d97706",
                      background: badgeTone === "danger" ? "#fef2f2" : "#fffbeb",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    còn {p.stockQuantity} sp
                  </span>
                ) : (
                  <span className={styles.miniValue}>{formatCurrency(p.price)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
