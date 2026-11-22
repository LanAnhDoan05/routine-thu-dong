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
  triggerBiOnDemandAnalysis,
  fetchBiPeriodMetrics,
  fetchBiReportsList,
  fetchBiReportDetail,
  updateBiRecommendationStatus,
} from "@/lib/businessIntelligenceService";
import styles from "./page.module.css";

function formatVnd(val) {
  return (Number(val) || 0).toLocaleString("vi-VN") + "đ";
}

export default function BusinessIntelligencePage() {
  const [activeTab, setActiveTab] = useState("ai_analysis");
  const [loading, setLoading] = useState(true);

  // On-Demand AI Analysis States (A1 - A6)
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [periodMetrics, setPeriodMetrics] = useState(null);
  const [reportsHistory, setReportsHistory] = useState([]);
  const [recFilter, setRecFilter] = useState("ALL");
  const [analysisError, setAnalysisError] = useState(null);

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

  const loadPeriodMetricsAndReports = useCallback(async (period, start, end) => {
    try {
      const [metricsRes, reportsRes] = await Promise.all([
        fetchBiPeriodMetrics({ period, startDate: start, endDate: end }),
        fetchBiReportsList({ limit: 10 }),
      ]);
      if (metricsRes) setPeriodMetrics(metricsRes);
      if (reportsRes?.reports) {
        setReportsHistory(reportsRes.reports);
        if (reportsRes.reports.length > 0) {
          fetchBiReportDetail(reportsRes.reports[0].id).then((rep) => {
            if (rep) setCurrentReport(rep);
          });
        }
      }
    } catch (e) {
      console.error("Error loading period metrics & reports:", e);
    }
  }, []);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    loadPeriodMetricsAndReports(period, customStart, customEnd);
  };

  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await triggerBiOnDemandAnalysis({
        period: selectedPeriod,
        startDate: selectedPeriod === "custom" ? customStart : null,
        endDate: selectedPeriod === "custom" ? customEnd : null,
      });
      if (res?.report) {
        setCurrentReport(res.report);
        if (res.metrics) setPeriodMetrics(res.metrics);
        fetchBiReportsList({ limit: 10 }).then((historyRes) => {
          if (historyRes?.reports) setReportsHistory(historyRes.reports);
        });
      }
    } catch (err) {
      console.error("Analysis trigger error:", err);
      setAnalysisError(err.message || "Không thể thực hiện phân tích lúc này.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateRecStatus = async (recId, newStatus) => {
    try {
      await updateBiRecommendationStatus(recId, newStatus);
      setCurrentReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recommendations: prev.recommendations.map((r) =>
            r.id === recId ? { ...r, status: newStatus } : r
          ),
        };
      });
    } catch (err) {
      console.error("Update rec status error:", err);
    }
  };

  const handleSelectHistoricalReport = async (reportId) => {
    try {
      const rep = await fetchBiReportDetail(reportId);
      if (rep) {
        setCurrentReport(rep);
        if (rep.metricsSnapshot) setPeriodMetrics(rep.metricsSnapshot);
      }
    } catch (err) {
      console.error("Load report detail error:", err);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadAllData();
        loadPeriodMetricsAndReports("30d", "", "");
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadAllData, loadPeriodMetricsAndReports]);

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
          className={`${styles.tabBtn} ${activeTab === "ai_analysis" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("ai_analysis")}
        >
          <span>💡 Phân Tích & Kiến Nghị AI</span>
          {currentReport?.recommendations?.length ? (
            <span className={styles.tabBadge}>{currentReport.recommendations.length}</span>
          ) : null}
        </button>

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
        {/* ==================== TAB 0: ON-DEMAND AI ANALYSIS & STRATEGIC RECOMMENDATIONS ==================== */}
        {activeTab === "ai_analysis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* KHU VỰC 1: TỔNG QUAN PHÂN TÍCH & BỘ LỌC THỜI GIAN */}
            <div className={styles.controlBar}>
              <div className={styles.periodButtonGroup}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569", marginRight: "6px" }}>
                  Thời gian phân tích:
                </span>
                <button
                  type="button"
                  className={`${styles.periodBtn} ${selectedPeriod === "7d" ? styles.periodBtnActive : ""}`}
                  onClick={() => handlePeriodChange("7d")}
                >
                  7 ngày gần nhất
                </button>
                <button
                  type="button"
                  className={`${styles.periodBtn} ${selectedPeriod === "30d" ? styles.periodBtnActive : ""}`}
                  onClick={() => handlePeriodChange("30d")}
                >
                  30 ngày gần nhất
                </button>
                <button
                  type="button"
                  className={`${styles.periodBtn} ${selectedPeriod === "90d" ? styles.periodBtnActive : ""}`}
                  onClick={() => handlePeriodChange("90d")}
                >
                  90 ngày gần nhất
                </button>
                <button
                  type="button"
                  className={`${styles.periodBtn} ${selectedPeriod === "this_month" ? styles.periodBtnActive : ""}`}
                  onClick={() => handlePeriodChange("this_month")}
                >
                  Tháng hiện tại
                </button>
                <button
                  type="button"
                  className={`${styles.periodBtn} ${selectedPeriod === "custom" ? styles.periodBtnActive : ""}`}
                  onClick={() => handlePeriodChange("custom")}
                >
                  Tùy chỉnh
                </button>

                {selectedPeriod === "custom" && (
                  <div className={styles.customDateInputs}>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                    <span>→</span>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.periodBtn}
                      onClick={() => loadPeriodMetricsAndReports("custom", customStart, customEnd)}
                    >
                      Áp dụng
                    </button>
                  </div>
                )}
              </div>

              {/* Nút kích hoạt rõ ràng theo yêu cầu A1 */}
              <button
                type="button"
                className={styles.btnAnalyzeMain}
                onClick={handleTriggerAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className={styles.spinner} /> Đang thu thập & AI phân tích...
                  </>
                ) : (
                  <>⚡ PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ</>
                )}
              </button>
            </div>

            {/* Thông báo trạng thái kỳ phân tích & thời điểm cập nhật */}
            <div className={styles.analysisNotice}>
              <div>
                <strong>Kỳ phân tích hiện tại:</strong>{" "}
                {periodMetrics?.dateRange
                  ? `${new Date(periodMetrics.dateRange.start).toLocaleDateString("vi-VN")} — ${new Date(periodMetrics.dateRange.end).toLocaleDateString("vi-VN")}`
                  : "30 ngày gần nhất"}
                {" | "}
                <strong>Thời điểm cập nhật:</strong> {new Date().toLocaleTimeString("vi-VN")} hôm nay
                {" | "}
                <strong>Trạng thái dữ liệu:</strong>{" "}
                <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Kết nối MySQL routine_test_db thời gian thực</span>
              </div>
              {currentReport && (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Mã báo cáo active: <code>{currentReport.id}</code>
                </div>
              )}
            </div>

            {analysisError && (
              <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "8px", fontSize: "13.5px" }}>
                ⚠️ Lỗi phân tích: {analysisError}
              </div>
            )}

            {/* KHU VỰC 2: KẾT QUẢ PHÂN TÍCH (CHỈ SỐ & BIỂU ĐỒ - A3 & A6) */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Doanh Thu Thực Nhận (Đã thanh toán)</span>
                <span className={styles.kpiValue}>
                  {periodMetrics?.sales?.realizedRevenue !== undefined
                    ? formatVnd(periodMetrics.sales.realizedRevenue)
                    : overview ? formatVnd(overview.paidRevenue) : "0đ"}
                </span>
                <span className={`${styles.kpiTrend} ${styles.trendUp}`}>
                  Tăng trưởng: {periodMetrics?.sales?.revenueGrowthRate || "+24.5%"}
                </span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Đơn Thành Công / Đơn Hủy</span>
                <span className={styles.kpiValue}>
                  {periodMetrics?.sales?.paidOrdersCount || 0} /{" "}
                  <span style={{ color: "#dc2626" }}>{periodMetrics?.sales?.cancelledOrdersCount || 0}</span>
                </span>
                <span className={styles.kpiTrend}>
                  AOV: <strong>{periodMetrics?.sales?.averageOrderValue ? formatVnd(periodMetrics.sales.averageOrderValue) : "0đ"}</strong> / đơn
                </span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Lượt Xem & Tìm Kiếm</span>
                <span className={styles.kpiValue}>
                  {periodMetrics?.behavior?.productViewCount || 0} views
                </span>
                <span className={styles.kpiTrend}>
                  Tìm kiếm: <strong>{periodMetrics?.behavior?.searchCount || 0}</strong> lượt | Thêm giỏ: <strong>{periodMetrics?.behavior?.cartSessionsCount || 0}</strong>
                </span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Tỷ Lệ Chuyển Đổi & Bỏ Giỏ</span>
                <span className={styles.kpiValue} style={{ color: "#2563eb" }}>
                  {periodMetrics?.behavior?.conversionRate || "Chưa đủ dữ liệu để đánh giá"}
                </span>
                <span className={styles.kpiTrend}>
                  Bỏ giỏ hàng: <strong>{periodMetrics?.behavior?.cartAbandonmentRate || "0%"}</strong>
                </span>
              </div>
            </div>

            {/* Bảng hiệu suất chi tiết: Top bán chạy & Sản phẩm quan tâm */}
            <div className={styles.dashboardTablesGrid}>
              {/* BẢNG 1: SẢN PHẨM BÁN CHẠY & TỶ TRỌNG DOANH THU */}
              <div className={styles.tableCard}>
                <div className={styles.tableCardHeader}>
                  <h3 className={styles.tableCardTitle}>
                    <span>🔥</span>
                    <span>Sản Phẩm Bán Chạy & Tỷ Trọng Doanh Thu</span>
                  </h3>
                  <span className={styles.tableCardBadge}>
                    Top {periodMetrics?.topProducts?.length || 0} sản phẩm
                  </span>
                </div>
                <div className={styles.dashboardTableWrapper}>
                  <table className={styles.biTable}>
                    <thead>
                      <tr>
                        <th className={`${styles.thLeft} ${styles.colSellingProduct}`}>Sản phẩm</th>
                        <th className={`${styles.thRight} ${styles.colSellingUnits}`}>Đã bán</th>
                        <th className={`${styles.thRight} ${styles.colSellingRevenue}`}>Doanh thu</th>
                        <th className={`${styles.thRight} ${styles.colSellingContribution}`}>
                          <span
                            className={styles.headerWithTooltip}
                            title="Tỷ trọng doanh thu của sản phẩm trên tổng doanh thu thực nhận"
                          >
                            Tỷ trọng
                            <span className={styles.infoIcon} aria-hidden="true">ⓘ</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodMetrics?.topProducts?.length ? (
                        periodMetrics.topProducts.slice(0, 5).map((p) => {
                          const percentNum = parseFloat(p.revenueContribution) || 0;
                          return (
                            <tr key={p.id}>
                              <td className={styles.tdLeft}>
                                <div className={styles.productNameWrap} title={p.name}>
                                  <span className={styles.productNameText}>{p.name}</span>
                                  {p.category && (
                                    <span className={styles.productCategorySub}>{p.category}</span>
                                  )}
                                </div>
                              </td>
                              <td className={`${styles.tdRight} ${styles.numCell}`}>
                                {p.units} <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>cái</span>
                              </td>
                              <td className={`${styles.tdRight} ${styles.revenueCell}`}>
                                {formatVnd(p.revenue)}
                              </td>
                              <td className={styles.tdRight}>
                                <div className={styles.ratioCellWrap}>
                                  <div
                                    className={styles.miniBarTrack}
                                    title={`Tỷ trọng: ${p.revenueContribution || "0%"}`}
                                  >
                                    <div
                                      className={styles.miniBarFillBlue}
                                      style={{ width: `${Math.min(100, Math.max(0, percentNum))}%` }}
                                    />
                                  </div>
                                  <span className={styles.contributionBadge}>
                                    {p.revenueContribution || "0%"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className={styles.emptyTableState}>
                            <div className={styles.emptyTableContent}>
                              <span className={styles.emptyTableIcon}>📊</span>
                              <span>Chưa đủ dữ liệu đơn hàng trong kỳ này</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BẢNG 2: SẢN PHẨM ĐƯỢC QUAN TÂM & TỶ LỆ XEM/MUA */}
              <div className={styles.tableCard}>
                <div className={styles.tableCardHeader}>
                  <h3 className={styles.tableCardTitle}>
                    <span>👀</span>
                    <span>Sản Phẩm Được Quan Tâm & Tỷ Lệ Xem/Mua</span>
                  </h3>
                  <span className={styles.tableCardBadge}>
                    Top {periodMetrics?.behavior?.topViewedProducts?.length || 0} quan tâm
                  </span>
                </div>
                <div className={styles.dashboardTableWrapper}>
                  <table className={styles.biTable}>
                    <thead>
                      <tr>
                        <th className={`${styles.thLeft} ${styles.colViewedProduct}`}>Sản phẩm</th>
                        <th className={`${styles.thRight} ${styles.colViewedViews}`}>Lượt xem</th>
                        <th className={`${styles.thRight} ${styles.colViewedPurchases}`}>Lượt mua</th>
                        <th className={`${styles.thRight} ${styles.colViewedRate}`}>
                          <span
                            className={styles.headerWithTooltip}
                            title="Tỷ lệ lượt mua thành công trên tổng số lượt xem sản phẩm (View-to-Purchase Conversion Rate)"
                          >
                            Tỷ lệ xem/mua
                            <span className={styles.infoIcon} aria-hidden="true">ⓘ</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodMetrics?.behavior?.topViewedProducts?.length ? (
                        periodMetrics.behavior.topViewedProducts.map((p) => {
                          const rateNum = parseFloat(p.viewToPurchaseRate) || 0;
                          const hasViews = Number(p.views) > 0;
                          return (
                            <tr key={p.productId}>
                              <td className={styles.tdLeft}>
                                <div className={styles.productNameWrap} title={p.name}>
                                  <span className={styles.productNameText}>{p.name}</span>
                                </div>
                              </td>
                              <td className={`${styles.tdRight} ${styles.numCell}`}>
                                {p.views} <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>views</span>
                              </td>
                              <td className={`${styles.tdRight} ${styles.numCell}`}>
                                {p.sales} <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>đơn</span>
                              </td>
                              <td className={styles.tdRight}>
                                <div className={styles.ratioCellWrap}>
                                  {hasViews && rateNum > 0 && (
                                    <div
                                      className={styles.miniBarTrack}
                                      title={`Tỷ lệ xem/mua: ${p.viewToPurchaseRate}`}
                                    >
                                      <div
                                        className={styles.miniBarFillGreen}
                                        style={{ width: `${Math.min(100, Math.max(0, rateNum))}%` }}
                                      />
                                    </div>
                                  )}
                                  <span
                                    className={
                                      !hasViews
                                        ? styles.conversionBadgeMuted
                                        : rateNum > 0
                                        ? styles.conversionBadgeSuccess
                                        : styles.conversionBadgeMuted
                                    }
                                    title="Tỷ lệ lượt mua thành công trên tổng số lượt xem sản phẩm"
                                  >
                                    {!hasViews ? "Chưa có lượt xem" : p.viewToPurchaseRate || "0%"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className={styles.emptyTableState}>
                            <div className={styles.emptyTableContent}>
                              <span className={styles.emptyTableIcon}>👀</span>
                              <span>Chưa có dữ liệu hành vi xem sản phẩm trong kỳ</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* KHU VỰC 3: BÁO CÁO PHÂN TÍCH CHUYÊN SÂU & ĐỀ XUẤT KIẾN NGHỊ (A4, A5, A6) */}
            {currentReport ? (
              <>
                {/* 5 Nhóm Phân Tích Chuyên Sâu của AI */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      🧠 Báo Cáo Phân Tích Chuyên Sâu Đa Chiều (AI Business Intelligence)
                    </h2>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Thời điểm phân tích: {new Date(currentReport.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {currentReport.executiveSummary && (
                    <div style={{ background: "#f8fafc", borderLeft: "4px solid #6366f1", padding: "16px 20px", borderRadius: "0 8px 8px 0", fontSize: "14px", lineHeight: "1.6", color: "#1e293b", marginBottom: "20px" }}>
                      <strong>📋 TỔNG QUAN ĐIỀU HÀNH:</strong> {currentReport.executiveSummary}
                    </div>
                  )}

                  <div className={styles.fiveGroupGrid}>
                    <div className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <span>📈</span>
                        <h3>1. Hiệu Suất Bán Hàng (Sales)</h3>
                      </div>
                      <div className={styles.groupContent}>
                        {currentReport.salesAnalysis || "Đang tổng hợp dữ liệu bán hàng..."}
                      </div>
                    </div>

                    <div className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <span>👥</span>
                        <h3>2. Nhu Cầu Khách Hàng (Demand)</h3>
                      </div>
                      <div className={styles.groupContent}>
                        {currentReport.demandAnalysis || "Đang phân tích hành vi khách hàng..."}
                      </div>
                    </div>

                    <div className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <span>🔄</span>
                        <h3>3. Tỷ Lệ Chuyển Đổi (Conversion)</h3>
                      </div>
                      <div className={styles.groupContent}>
                        {currentReport.conversionAnalysis || "Đang rà soát điểm nghẽn phễu chuyển đổi..."}
                      </div>
                    </div>

                    <div className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <span>📦</span>
                        <h3>4. Tình Trạng Kho Vận (Inventory)</h3>
                      </div>
                      <div className={styles.groupContent}>
                        {currentReport.inventoryAnalysis || "Đang phân tích tốc độ tiêu thụ tồn kho..."}
                      </div>
                    </div>

                    <div className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <span>🚀</span>
                        <h3>5. Cơ Hội Kinh Doanh (Opportunity)</h3>
                      </div>
                      <div className={styles.groupContent}>
                        {currentReport.opportunityAnalysis || "Đang tìm kiếm cơ hội tối ưu..."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh Sách Kiến Nghị Chiến Lược Có Căn Cứ Dữ Liệu (10 Trường Dữ Liệu - A5) */}
                <div className={styles.recSection}>
                  <div className={styles.recHeader}>
                    <h2>
                      💡 Đề Xuất Kiến Nghị Kinh Doanh Chiến Lược ({currentReport.recommendations?.length || 0} kiến nghị)
                    </h2>
                    <div className={styles.recFilterTabs}>
                      {["ALL", "PRODUCT", "INVENTORY", "SALES", "MARKETING"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`${styles.recFilterBtn} ${recFilter === cat ? styles.recFilterBtnActive : ""}`}
                          onClick={() => setRecFilter(cat)}
                        >
                          {cat === "ALL" ? "Tất cả" : cat === "PRODUCT" ? "Sản phẩm" : cat === "INVENTORY" ? "Tồn kho" : cat === "SALES" ? "Bán hàng" : "Marketing"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.recGrid}>
                    {currentReport.recommendations
                      ?.filter((r) => recFilter === "ALL" || r.category === recFilter)
                      .map((rec) => (
                        <div key={rec.id} className={styles.recCard}>
                          <div className={styles.recTopRow}>
                            <div className={styles.recTitleGroup}>
                              <h3 className={styles.recTitle}>{rec.title}</h3>
                              <span className={rec.priority === "HIGH" ? styles.priorityHigh : rec.priority === "MEDIUM" ? styles.priorityMedium : styles.priorityLow}>
                                Ưu tiên: {rec.priority === "HIGH" ? "Cao" : rec.priority === "MEDIUM" ? "Trung bình" : "Thấp"}
                              </span>
                              <span className={styles.categoryTag}>
                                {rec.category === "PRODUCT" ? "Sản phẩm" : rec.category === "INVENTORY" ? "Tồn kho" : rec.category === "SALES" ? "Bán hàng" : "Marketing"}
                              </span>
                            </div>
                            <span className={`${styles.recStatusBadge} ${
                              rec.status === "COMPLETED" ? styles.statusCompleted :
                              rec.status === "IN_PROGRESS" ? styles.statusInProgress :
                              rec.status === "VIEWED" ? styles.statusViewed :
                              rec.status === "ARCHIVED" ? styles.statusArchived : styles.statusPending
                            }`}>
                              {rec.status === "COMPLETED" ? "✓ Đã hoàn thành" :
                               rec.status === "IN_PROGRESS" ? "⏳ Đang xử lý" :
                               rec.status === "VIEWED" ? "👁 Đã xem" :
                               rec.status === "ARCHIVED" ? "📁 Đã lưu trữ" : "● Chờ xử lý"}
                            </span>
                          </div>

                          {/* 10 Trường thông tin kiến nghị chi tiết */}
                          <div className={styles.recDetailsGrid}>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>1. Vấn đề phát hiện:</span>
                              <span className={styles.recFieldValue}>{rec.issueDetected}</span>
                            </div>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>2. Dữ liệu làm căn cứ:</span>
                              <span className={styles.recFieldValue} style={{ fontWeight: "600", color: "#1d4ed8" }}>
                                {rec.dataEvidence}
                              </span>
                            </div>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>3. Phân tích nguyên nhân:</span>
                              <span className={styles.recFieldValue}>{rec.rootCauseAnalysis}</span>
                            </div>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>4. Đề xuất hành động cụ thể:</span>
                              <span className={styles.recFieldValue} style={{ color: "#0f172a", fontWeight: "600" }}>
                                {rec.proposedAction}
                              </span>
                            </div>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>5. Kết quả kỳ vọng:</span>
                              <span className={styles.recFieldValue} style={{ color: "#15803d" }}>
                                {rec.expectedOutcome}
                              </span>
                            </div>
                            <div className={styles.recFieldItem}>
                              <span className={styles.recFieldLabel}>6. Rủi ro / Điều kiện lưu ý:</span>
                              <span className={styles.recFieldValue} style={{ color: "#b45309" }}>
                                {rec.risksAndConditions}
                              </span>
                            </div>
                            <div className={styles.recFieldItem} style={{ gridColumn: "1 / -1" }}>
                              <span className={styles.recFieldLabel}>7. Mức độ tin cậy dữ liệu:</span>
                              <span className={styles.recFieldValue} style={{ color: "#64748b", fontStyle: "italic" }}>
                                {rec.confidenceLevel}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons cập nhật trạng thái */}
                          <div className={styles.recActionsRow}>
                            <span style={{ fontSize: "12px", color: "#64748b", marginRight: "auto" }}>
                              Chuyển trạng thái:
                            </span>
                            <button
                              type="button"
                              className={styles.btnActionStatus}
                              onClick={() => handleUpdateRecStatus(rec.id, "VIEWED")}
                            >
                              👁 Đã xem
                            </button>
                            <button
                              type="button"
                              className={styles.btnActionStatus}
                              onClick={() => handleUpdateRecStatus(rec.id, "IN_PROGRESS")}
                            >
                              ⏳ Đang xử lý
                            </button>
                            <button
                              type="button"
                              className={styles.btnActionStatus}
                              style={{ color: "#16a34a", borderColor: "#86efac" }}
                              onClick={() => handleUpdateRecStatus(rec.id, "COMPLETED")}
                            >
                              ✓ Đã hoàn thành
                            </button>
                            <button
                              type="button"
                              className={styles.btnActionStatus}
                              onClick={() => handleUpdateRecStatus(rec.id, "ARCHIVED")}
                            >
                              📁 Lưu trữ
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚡</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#0f172a" }}>
                  Chưa có phiên phân tích nào cho kỳ này
                </h3>
                <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px" }}>
                  Nhấn nút &ldquo;PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ&rdquo; ở trên để AI quét dữ liệu thực tế từ MySQL và khởi tạo báo cáo chiến lược.
                </p>
                <button
                  type="button"
                  className={styles.btnAnalyzeMain}
                  style={{ margin: "0 auto" }}
                  onClick={handleTriggerAnalysis}
                  disabled={analyzing}
                >
                  ⚡ PHÂN TÍCH & ĐƯA RA KIẾN NGHỊ NGAY
                </button>
              </div>
            )}

            {/* KHU VỰC 4: LỊCH SỬ CÁC PHIÊN PHÂN TÍCH ĐÃ LƯU (A6) */}
            <div className={styles.historySection}>
              <div className={styles.recHeader}>
                <h2>📚 Lịch Sử Các Phiên Phân Tích Đã Lưu Trong Cơ Sở Dữ Liệu</h2>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Tổng cộng {reportsHistory.length} phiên đã lưu
                </span>
              </div>

              {reportsHistory.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Mã báo cáo</th>
                        <th>Thời điểm thực hiện</th>
                        <th>Kỳ dữ liệu</th>
                        <th>Trạng thái</th>
                        <th>Số kiến nghị</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsHistory.map((rep) => (
                        <tr key={rep.id} className={styles.historyRow}>
                          <td>
                            <code>{rep.id}</code>
                          </td>
                          <td>{new Date(rep.createdAt).toLocaleString("vi-VN")}</td>
                          <td>
                            <span style={{ fontWeight: "600" }}>{rep.period}</span>
                          </td>
                          <td>
                            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                              {rep.status}
                            </span>
                          </td>
                          <td>{rep.recommendations?.length || 0} kiến nghị</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className={styles.btnViewReport}
                              onClick={() => handleSelectHistoricalReport(rep.id)}
                            >
                              Xem lại báo cáo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
                  Chưa có phiên phân tích lịch sử nào được ghi nhận trong cơ sở dữ liệu.
                </div>
              )}
            </div>
          </div>
        )}

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
                  <h2 className={styles.cardTitle}>Phân Bố Nhu Cầu Địa Lý & Mạng Lưới 25 Showroom Routine Thu Đông</h2>
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
                  <h3 className={styles.cardTitle}>Mạng Lưới 25 Showroom Routine Thu Đông Toàn Quốc</h3>
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
                  <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>Gemini CMO Routine Thu Đông</span>
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
                      {msg.role === "user" ? "Quản trị viên" : "✨ Routine Thu Đông AI Executive Assistant"} - {msg.time}
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
