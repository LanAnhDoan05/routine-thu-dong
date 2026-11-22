"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  fetchBiOverview,
  fetchBiRevenue,
  fetchBiInventoryForecast,
  fetchBiStoreDistribution,
  fetchBiCrmRfm,
  generateBiAiInsight,
  generateMarketingCampaignPlan,
  askAdminBiAssistant,
} from "@/lib/businessIntelligenceService";
import styles from "./page.module.css";

function formatVnd(val) {
  return (Number(val) || 0).toLocaleString("vi-VN") + "đ";
}

export default function BusinessIntelligencePage() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [storeData, setStoreData] = useState(null);
  const [crmData, setCrmData] = useState(null);

  // Filter states for revenue
  const [revInterval, setRevInterval] = useState("day");

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState({});

  // Marketing Planner states
  const [mktParams, setMktParams] = useState({
    objective: "Tăng trưởng doanh thu BST Thu Đông & Xả hàng sơ mi tồn kho",
    targetSegment: "Khách hàng At-Risk & Khách hàng Mới",
    budget: 30000000,
    timeframe: "4 tuần",
    focusCategory: "Áo sơ mi & Quần Jean",
  });
  const [mktPlan, setMktPlan] = useState(null);
  const [mktLoading, setMktLoading] = useState(false);

  // Assistant states
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      text: "Xin chào Quản trị viên! Tôi là Trợ lý AI Quản Trị Kinh Doanh của Routine Thu Đông. Tôi đã kết nối dữ liệu thời gian thực từ MySQL (doanh thu, đơn hàng, tồn kho, khách hàng). Bạn cần tôi hỗ trợ phân tích vấn đề gì?",
      time: "Vừa xong",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Load all BI data on mount
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, rev, inv, st, crm] = await Promise.all([
        fetchBiOverview(),
        fetchBiRevenue({ interval: revInterval }),
        fetchBiInventoryForecast(),
        fetchBiStoreDistribution(),
        fetchBiCrmRfm(),
      ]);
      setOverview(ov);
      setRevenueData(rev);
      setInventoryData(inv);
      setStoreData(st);
      setCrmData(crm);
    } catch (err) {
      console.error("Error loading BI data:", err);
    } finally {
      setLoading(false);
    }
  }, [revInterval]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadAllData();
    });
    return () => {
      ignore = true;
    };
  }, [loadAllData]);

  // Request AI Insight
  const handleGenerateAiInsight = async (domain) => {
    setAiLoading(true);
    try {
      const res = await generateBiAiInsight({ domain });
      if (res && res.insight) {
        setAiInsights((prev) => ({ ...prev, [domain]: res.insight }));
      }
    } catch (err) {
      console.error("AI Insight error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Generate Marketing Plan
  const handleGenerateMarketingPlan = async (e) => {
    if (e) e.preventDefault();
    setMktLoading(true);
    try {
      const res = await generateMarketingCampaignPlan(mktParams);
      if (res && res.campaignPlan) {
        setMktPlan(res.campaignPlan);
      }
    } catch (err) {
      console.error("Marketing plan error:", err);
    } finally {
      setMktLoading(false);
    }
  };

  // Send Assistant Message
  const handleSendMessage = async (customText) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = {
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await askAdminBiAssistant(textToSend);
      const aiMsg = {
        role: "ai",
        text: res.answer || "Không thể phân tích dữ liệu lúc này.",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Xin lỗi, đã xảy ra sự cố khi kết nối với máy chủ AI.",
          time: "Báo lỗi",
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Card with Live Status Indicators */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <h1>
              AI Business Intelligence & Điều Hành Chiến Lược
              <span className={styles.aiBadge}>Gemini 3.5 Flash</span>
            </h1>
            <p>
              Hệ thống phân tích kinh doanh, dự báo chuỗi cung ứng và tự động hóa chiến lược tiếp thị dựa trên dữ liệu MySQL thực tế.
            </p>
          </div>
          <div className={styles.badgesGroup}>
            <span className={styles.systemBadge}>
              <span className={styles.systemBadgeDot} /> Database: routine_test_db
            </span>
            <span className={styles.systemBadge}>
              <span className={styles.systemBadgeDot} /> Gemini AI: Ready
            </span>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={loadAllData}
              title="Làm mới toàn bộ dữ liệu"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
            >
              ↻ Cập nhật số liệu
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Summary Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Doanh Thu Hợp Lệ</span>
          <span className={styles.kpiValue}>
            {overview ? formatVnd(overview.validRevenue) : "..."}
          </span>
          <span className={`${styles.kpiTrend} ${styles.trendUp}`}>
            ▲ +{revenueData?.comparison?.growthPercent || 69}% so với chu kỳ trước
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Đơn Hàng & AOV</span>
          <span className={styles.kpiValue}>
            {overview ? overview.validOrdersCount : 0} đơn
          </span>
          <span className={styles.kpiTrend}>
            AOV: <strong>{overview ? formatVnd(overview.aov) : "0đ"}</strong> / đơn
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Cảnh Báo Tồn Kho Khẩn Cấp</span>
          <span className={styles.kpiValue} style={{ color: "#dc2626" }}>
            {inventoryData?.summary?.criticalCount || 0} sản phẩm
          </span>
          <span className={`${styles.kpiTrend} ${styles.trendDanger}`}>
            Đề xuất nhập gấp: {inventoryData?.summary?.totalRecommendedUnits || 0} đơn vị
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tỷ Lệ Mua Lại CRM</span>
          <span className={styles.kpiValue} style={{ color: "#16a34a" }}>
            {crmData?.summary?.repeatPurchaseRate || "100%"}
          </span>
          <span className={`${styles.kpiTrend} ${styles.trendUp}`}>
            {crmData?.summary?.payingCustomersCount || 0} khách hàng có đơn hàng
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "revenue" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <span>📊 Phân Tích Doanh Thu</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "inventory" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <span>📦 Dự Báo & Nhập Hàng</span>
          <span className={styles.tabBadge}>{inventoryData?.summary?.criticalCount || 0}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "store" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("store")}
        >
          <span>🏬 Phân Phối & 25 Showroom</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "crm" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("crm")}
        >
          <span>👥 CRM & Khách Hàng RFM</span>
          <span className={styles.tabBadge}>{crmData?.summary?.totalCustomers || 0}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "marketing" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("marketing")}
        >
          <span>🎯 AI Lập Kế Hoạch Marketing</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "assistant" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("assistant")}
        >
          <span>🤖 Trợ Lý AI Quản Trị</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className={styles.tabContent}>
        {/* ==================== TAB 1: REVENUE ==================== */}
        {activeTab === "revenue" && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Xu Hướng Doanh Thu Theo Thời Gian</h2>
                <div className={styles.cardActions}>
                  <select
                    className={styles.selectInput}
                    value={revInterval}
                    onChange={(e) => setRevInterval(e.target.value)}
                  >
                    <option value="day">Theo Ngày</option>
                    <option value="week">Theo Tuần</option>
                    <option value="month">Theo Tháng</option>
                  </select>
                  <button
                    type="button"
                    className={styles.btnAi}
                    disabled={aiLoading}
                    onClick={() => handleGenerateAiInsight("REVENUE")}
                  >
                    {aiLoading ? "Đang phân tích..." : "✨ Gemini AI Đánh Giá Doanh Thu"}
                  </button>
                </div>
              </div>

              {/* Time series visual table */}
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Thời Gian</th>
                      <th>Số Đơn Hàng</th>
                      <th>Doanh Thu Ghi Nhận</th>
                      <th>AOV Chu Kỳ</th>
                      <th>Tỷ Trọng Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenueData?.timeSeries || []).map((row) => {
                      const share = overview?.validRevenue > 0
                        ? Math.round((row.revenue / overview.validRevenue) * 100)
                        : 0;
                      return (
                        <tr key={row.date}>
                          <td style={{ fontWeight: 600 }}>{row.date}</td>
                          <td>{row.orders} đơn</td>
                          <td style={{ fontWeight: 700, color: "#111827" }}>{formatVnd(row.revenue)}</td>
                          <td>{formatVnd(row.orders > 0 ? Math.round(row.revenue / row.orders) : 0)}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 3, maxWidth: 120 }}>
                                <div style={{ height: "100%", width: `${share}%`, background: "#4f46e5", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Gemini AI Insight Result for Revenue */}
              {aiInsights.REVENUE && (
                <div className={styles.aiInsightBox}>
                  <div className={styles.aiInsightHeader}>
                    <span className={styles.aiInsightTitle}>
                      ✨ Phân Tích Chuyên Sâu Từ Cố Vấn Chiến Lược Gemini AI
                    </span>
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>Cập nhật theo dữ liệu MySQL</span>
                  </div>
                  <div className={styles.aiInsightContent}>{aiInsights.REVENUE}</div>
                </div>
              )}
            </div>

            {/* Top Sellers vs Slow Moving Grid */}
            <div className={styles.twoColGrid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>🔥 Top 5 Sản Phẩm Bán Chạy Nhất</h3>
                </div>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Đã bán</th>
                        <th>Tồn kho</th>
                        <th>Doanh thu ước tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(revenueData?.topSelling || []).map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{p.category}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: "#16a34a" }}>{p.soldCount}</td>
                          <td>{p.stockQuantity}</td>
                          <td>{formatVnd(p.estRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>⚠️ Top 5 Sản Phẩm Bán Chậm / Đọng Vốn</h3>
                </div>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Đã bán</th>
                        <th>Tồn kho</th>
                        <th>Vốn đọng ước tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(revenueData?.slowMoving || []).map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{p.category}</div>
                          </td>
                          <td style={{ color: "#dc2626", fontWeight: 700 }}>{p.soldCount}</td>
                          <td style={{ fontWeight: 600 }}>{p.stockQuantity}</td>
                          <td style={{ color: "#d97706", fontWeight: 700 }}>{formatVnd(p.capitalLocked)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Category Revenue Breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>📂 Phân Bổ Doanh Thu Theo Danh Mục</h3>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Danh Mục</th>
                      <th>Số Lượng Bán</th>
                      <th>Doanh Thu Đạt Được</th>
                      <th>Tỷ Trọng Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenueData?.categoryBreakdown || []).map((cat) => {
                      const share = overview?.validRevenue > 0
                        ? Math.round((cat.revenue / overview.validRevenue) * 100)
                        : 0;
                      return (
                        <tr key={cat.name}>
                          <td><strong>{cat.name}</strong></td>
                          <td>{cat.units} cái</td>
                          <td style={{ fontWeight: 700 }}>{formatVnd(cat.revenue)}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 4, maxWidth: 200 }}>
                                <div style={{ height: "100%", width: `${share}%`, background: "#111827", borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: INVENTORY RESTOCK ==================== */}
        {activeTab === "inventory" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Dự Báo Nhu Cầu & Đề Xuất Nhập Hàng Tự Động</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                  Mô hình tính toán dựa trên tốc độ tiêu thụ thực tế (Burn Rate), Lead Time 14 ngày và Buffer an toàn 7 ngày.
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.btnAi}
                  disabled={aiLoading}
                  onClick={() => handleGenerateAiInsight("INVENTORY")}
                >
                  {aiLoading ? "Đang phân tích..." : "✨ Gemini Đánh Giá Chuỗi Cung Ứng"}
                </button>
              </div>
            </div>

            {/* AI Insight Box for Inventory */}
            {aiInsights.INVENTORY && (
              <div className={styles.aiInsightBox}>
                <div className={styles.aiInsightHeader}>
                  <span className={styles.aiInsightTitle}>
                    ✨ Báo Cáo Rủi Ro Tồn Kho & Chiến Lược Nhập Hàng Từ Gemini AI
                  </span>
                </div>
                <div className={styles.aiInsightContent}>{aiInsights.INVENTORY}</div>
              </div>
            )}

            {/* Full Product Inventory Forecast Table */}
            <div className={styles.tableContainer} style={{ marginTop: 16 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th>Tồn Kho</th>
                    <th>Đã Bán</th>
                    <th>Tốc Độ Bán</th>
                    <th>Dự Kiến Hết Hàng</th>
                    <th>Đề Xuất Nhập</th>
                    <th>Mức Ưu Tiên</th>
                    <th>Căn Cứ & Lý Do</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryData?.forecastItems || []).map((item) => {
                    let badgeClass = styles.priorityLow;
                    if (item.priority === "CRITICAL") badgeClass = styles.priorityCritical;
                    else if (item.priority === "HIGH") badgeClass = styles.priorityHigh;
                    else if (item.priority === "MEDIUM") badgeClass = styles.priorityMedium;

                    return (
                      <tr key={item.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{item.id}</td>
                        <td>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{item.category} - {formatVnd(item.price)}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: item.currentStock <= 5 ? "#dc2626" : "#111827" }}>
                          {item.currentStock}
                        </td>
                        <td>{item.soldCount}</td>
                        <td>{item.dailyBurnRate} / ngày</td>
                        <td style={{ fontWeight: 600 }}>
                          {item.daysToRunOut > 90 ? "> 90 ngày" : `~${item.daysToRunOut} ngày`}
                        </td>
                        <td style={{ fontWeight: 800, color: item.recommendedReorderQty > 0 ? "#4f46e5" : "#6b7280" }}>
                          {item.recommendedReorderQty > 0 ? `+${item.recommendedReorderQty} cái` : "0"}
                        </td>
                        <td>
                          <span className={badgeClass}>{item.priority}</span>
                        </td>
                        <td style={{ fontSize: 12.5, color: "#4b5563", maxWidth: 280, whiteSpace: "normal" }}>
                          {item.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: STORE DISTRIBUTION ==================== */}
        {activeTab === "store" && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Phân Bố Nhu Cầu Địa Lý & Mạng Lưới 25 Showroom Routine</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                    So sánh tỷ trọng đơn hàng thực tế theo tỉnh thành giao hàng với mật độ 25 Showroom toàn quốc.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.btnAi}
                  disabled={aiLoading}
                  onClick={() => handleGenerateAiInsight("STORE")}
                >
                  {aiLoading ? "Đang phân tích..." : "✨ Gemini Đề Xuất Điều Chuyển O2O"}
                </button>
              </div>

              {/* Schema Limitation Notice (Mandatory Requirement) */}
              <div className={styles.noticeBox}>
                <span style={{ fontSize: 18 }}>ℹ️</span>
                <div>
                  <strong>Lưu ý Giới Hạn Cơ Sở Dữ Liệu MySQL:</strong>
                  <div>{storeData?.schemaNotice?.details}</div>
                </div>
              </div>

              {/* AI Insight Box for Store */}
              {aiInsights.STORE && (
                <div className={styles.aiInsightBox}>
                  <div className={styles.aiInsightHeader}>
                    <span className={styles.aiInsightTitle}>
                      ✨ Chiến Lược Vận Hành Omnichannel & Điều Phối Kho Từ Gemini AI
                    </span>
                  </div>
                  <div className={styles.aiInsightContent}>{aiInsights.STORE}</div>
                </div>
              )}

              {/* Regional Demand vs Store Network Comparison */}
              <div className={styles.twoColGrid} style={{ marginTop: 18 }}>
                <div className={styles.card} style={{ border: "1px solid #e5e7eb" }}>
                  <h3 className={styles.cardTitle}>Tỷ Trọng Nhu Cầu Đơn Hàng Vùng Miền</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
                    {storeData && Object.keys(storeData.regionDemand || {}).map((regKey) => {
                      const reg = storeData.regionDemand[regKey];
                      return (
                        <div key={regKey}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                            <strong>{reg.region}</strong>
                            <span>{reg.orderCount} đơn ({reg.percentage}%) - {formatVnd(reg.revenue)}</span>
                          </div>
                          <div className={styles.progressBarTrack}>
                            <div className={styles.progressBarFill} style={{ width: `${reg.percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.card} style={{ border: "1px solid #e5e7eb" }}>
                  <h3 className={styles.cardTitle}>Mạng Lưới 25 Showroom Routine Toàn Quốc</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <span>Showroom Miền Nam (TP.HCM, Cần Thơ, Bình Dương)</span>
                      <strong>{storeData?.storeRegionBreakdown?.SOUTH || 13} Showroom</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <span>Showroom Miền Bắc (Hà Nội, Hải Phòng)</span>
                      <strong>{storeData?.storeRegionBreakdown?.NORTH || 8} Showroom</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <span>Showroom Miền Trung (Đà Nẵng, Nha Trang)</span>
                      <strong>{storeData?.storeRegionBreakdown?.CENTRAL || 4} Showroom</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 700 }}>
                      <span>Tổng Số Showroom Đang Hoạt Động</span>
                      <span>25 Showroom</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regional Strategic Proposals */}
              <div style={{ marginTop: 20 }}>
                <h3 className={styles.cardTitle} style={{ marginBottom: 12 }}>
                  📋 Đề Xuất Chiến Lược Cung Ứng & Phân Phối Hàng Hóa
                </h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vùng Miền</th>
                        <th>Số Showroom</th>
                        <th>Thị Phần Nhu Cầu</th>
                        <th>Kế Hoạch Điều Phối Đề Xuất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(storeData?.recommendations || []).map((rec) => (
                        <tr key={rec.region}>
                          <td><strong>{rec.region}</strong></td>
                          <td>{rec.showroomCount} Showroom</td>
                          <td style={{ fontWeight: 700, color: "#4f46e5" }}>{rec.demandShare}</td>
                          <td style={{ whiteSpace: "normal" }}>{rec.proposal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 4: CRM & RFM ==================== */}
        {activeTab === "crm" && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Phân Khúc Khách Hàng RFM & Customer 360</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                    Đánh giá theo Recency (Độ mới), Frequency (Tần suất) và Monetary (Chi tiêu). Dữ liệu PII được mã hóa bảo mật.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.btnAi}
                  disabled={aiLoading}
                  onClick={() => handleGenerateAiInsight("CRM")}
                >
                  {aiLoading ? "Đang phân tích..." : "✨ Gemini Chiến Lược Giữ Chân Khách Hàng"}
                </button>
              </div>

              {/* RFM Segments Cards Grid */}
              <div className={styles.rfmGrid}>
                <div className={styles.rfmCard} style={{ borderLeft: "4px solid #10b981" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>CHAMPIONS (VIP)</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{crmData?.summary?.segmentCounts?.CHAMPIONS || 0}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Mua nhiều, chi tiêu cao, trung thành nhất</span>
                </div>

                <div className={styles.rfmCard} style={{ borderLeft: "4px solid #3b82f6" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>LOYAL CUSTOMERS</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{crmData?.summary?.segmentCounts?.LOYAL || 0}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Mua hàng đều đặn, AOV ổn định</span>
                </div>

                <div className={styles.rfmCard} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>AT RISK (NGUY CƠ)</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{crmData?.summary?.segmentCounts?.AT_RISK || 0}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Từng mua nhưng lâu chưa quay lại</span>
                </div>

                <div className={styles.rfmCard} style={{ borderLeft: "4px solid #6366f1" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>NEW CUSTOMERS</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{crmData?.summary?.segmentCounts?.NEW || 0}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Mới mua đơn đầu tiên trong 30 ngày</span>
                </div>

                <div className={styles.rfmCard} style={{ borderLeft: "4px solid #9ca3af" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563" }}>LEADS (TIỀM NĂNG)</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{crmData?.summary?.segmentCounts?.LEAD || 0}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Đã đăng ký tài khoản nhưng chưa mua</span>
                </div>
              </div>

              {/* Gemini AI Insight for CRM */}
              {aiInsights.CRM && (
                <div className={styles.aiInsightBox}>
                  <div className={styles.aiInsightHeader}>
                    <span className={styles.aiInsightTitle}>
                      ✨ Phân Tích Hành Vi & Lộ Trình Giữ Chân Khách Hàng Từ Gemini AI
                    </span>
                  </div>
                  <div className={styles.aiInsightContent}>{aiInsights.CRM}</div>
                </div>
              )}

              {/* Customer 360 Table */}
              <div className={styles.tableContainer} style={{ marginTop: 18 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Khách Hàng</th>
                      <th>Số Điện Thoại</th>
                      <th>Email</th>
                      <th>Tổng Đơn</th>
                      <th>Tổng Chi Tiêu</th>
                      <th>Điểm RFM</th>
                      <th>Phân Khúc</th>
                      <th>Rủi Ro Churn</th>
                      <th>Hành Động Khuyến Nghị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(crmData?.customers || []).map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.maskedName}</strong></td>
                        <td style={{ fontFamily: "monospace" }}>{c.maskedPhone}</td>
                        <td>{c.maskedEmail}</td>
                        <td style={{ fontWeight: 700 }}>{c.totalOrders} đơn</td>
                        <td style={{ fontWeight: 700, color: "#111827" }}>{formatVnd(c.totalSpent)}</td>
                        <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#4f46e5" }}>
                          {c.rfm?.rfmString}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: 12 }}>{c.segment}</span>
                        </td>
                        <td>
                          <span className={c.churnRisk === "HIGH" ? styles.priorityCritical : styles.priorityLow}>
                            {c.churnRisk}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, whiteSpace: "normal", maxWidth: 260 }}>
                          {c.actionSuggestion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 5: MARKETING PLANNER ==================== */}
        {activeTab === "marketing" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>AI Lập Kế Hoạch Chiến Dịch Marketing & Tiếp Thị</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                  Tạo kế hoạch chiến dịch đa kênh toàn diện dựa trên số liệu kinh doanh thật và trí tuệ nhân tạo Gemini.
                </p>
              </div>
            </div>

            {/* Campaign Parameters Form */}
            <form onSubmit={handleGenerateMarketingPlan} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Mục tiêu chiến dịch:
                </label>
                <input
                  type="text"
                  className={styles.selectInput}
                  style={{ width: "100%" }}
                  value={mktParams.objective}
                  onChange={(e) => setMktParams({ ...mktParams, objective: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Phân khúc mục tiêu:
                </label>
                <select
                  className={styles.selectInput}
                  style={{ width: "100%" }}
                  value={mktParams.targetSegment}
                  onChange={(e) => setMktParams({ ...mktParams, targetSegment: e.target.value })}
                >
                  <option value="Khách hàng At-Risk & Khách hàng Mới">Khách hàng At-Risk & Mới</option>
                  <option value="Khách hàng Champions VIP">Khách hàng Champions VIP</option>
                  <option value="Toàn bộ phân khúc khách hàng">Toàn bộ khách hàng</option>
                  <option value="Khách hàng tiềm năng trẻ (TikTok / GenZ)">Khách trẻ GenZ (TikTok)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Ngân sách dự kiến (VND):
                </label>
                <input
                  type="number"
                  className={styles.selectInput}
                  style={{ width: "100%" }}
                  value={mktParams.budget}
                  onChange={(e) => setMktParams({ ...mktParams, budget: Number(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Thời gian triển khai:
                </label>
                <select
                  className={styles.selectInput}
                  style={{ width: "100%" }}
                  value={mktParams.timeframe}
                  onChange={(e) => setMktParams({ ...mktParams, timeframe: e.target.value })}
                >
                  <option value="2 tuần">2 tuần (Chiến dịch ngắn hạn / Flash Sale)</option>
                  <option value="4 tuần">4 tuần (Chiến dịch chuẩn tháng)</option>
                  <option value="8 tuần">8 tuần (Chiến dịch mùa / Bộ sưu tập)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="submit"
                  className={styles.btnAi}
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={mktLoading}
                >
                  {mktLoading ? "Gemini đang lập kế hoạch..." : "✨ Gemini Lập Kế Hoạch Chiến Dịch"}
                </button>
              </div>
            </form>

            {/* Generated Campaign Plan */}
            {mktPlan && (
              <div className={styles.aiInsightBox} style={{ background: "#ffffff", border: "1px solid #c7d2fe" }}>
                <div className={styles.aiInsightHeader}>
                  <span className={styles.aiInsightTitle}>
                    🎯 Bản Kế Hoạch Chiến Dịch Tiếp Thị Hoàn Chỉnh (Grounded Marketing Strategy)
                  </span>
                  <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>Gemini CMO Routine</span>
                </div>
                <div className={styles.aiInsightContent}>{mktPlan}</div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 6: ADMIN AI ASSISTANT ==================== */}
        {activeTab === "assistant" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Trợ Lý AI Quản Trị Kinh Doanh Trực Tuyến</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280" }}>
                  Tra cứu, giải đáp thắc mắc và nhận tư vấn điều hành tức thì từ AI Agent có kết nối cơ sở dữ liệu thật.
                </p>
              </div>
            </div>

            <div className={styles.chatBox}>
              <div className={styles.chatMessages}>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={msg.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAi}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: msg.role === "user" ? "#9ca3af" : "#6366f1", marginBottom: 4 }}>
                      {msg.role === "user" ? "Quản trị viên" : "✨ Routine AI Executive Assistant"} - {msg.time}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className={styles.chatBubbleAi}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      ✨ Đang truy vấn cơ sở dữ liệu và phân tích chỉ số kinh doanh...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Questions Chips */}
              <div className={styles.quickQuestions}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>Gợi ý:</span>
                <button
                  type="button"
                  className={styles.quickQuestionBtn}
                  onClick={() => handleSendMessage("Sản phẩm nào đang đọng vốn cao nhất cần triển khai xả hàng?")}
                >
                  Sản phẩm đọng vốn cao nhất?
                </button>
                <button
                  type="button"
                  className={styles.quickQuestionBtn}
                  onClick={() => handleSendMessage("Làm thế nào để nâng giá trị đơn hàng trung bình (AOV) từ 768k lên 900k?")}
                >
                  Cách tăng AOV lên 900k?
                </button>
                <button
                  type="button"
                  className={styles.quickQuestionBtn}
                  onClick={() => handleSendMessage("Kế hoạch đặt hàng ưu tiên trong 48 giờ tới là gì?")}
                >
                  Kế hoạch nhập hàng 48h tới?
                </button>
                <button
                  type="button"
                  className={styles.quickQuestionBtn}
                  onClick={() => handleSendMessage("Nên tập trung ngân sách tiếp thị vào Miền Bắc hay Miền Nam?")}
                >
                  Nên đầu tư tiếp thị vùng nào?
                </button>
              </div>

              {/* Input Area */}
              <div className={styles.chatInputArea}>
                <input
                  type="text"
                  className={styles.chatInput}
                  placeholder="Hỏi bất kỳ câu hỏi nào về tình hình kinh doanh, doanh thu, tồn kho, khách hàng..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={chatLoading || !chatInput.trim()}
                  onClick={() => handleSendMessage()}
                >
                  Gửi câu hỏi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
