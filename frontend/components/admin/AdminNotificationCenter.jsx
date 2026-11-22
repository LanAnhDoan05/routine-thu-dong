"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  IconBell,
  IconCheck,
  IconOrders,
  IconAlertCircle,
  IconStyles,
  IconDashboard,
} from "./icons";
import styles from "./AdminNotificationCenter.module.css";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;

    return past.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getEventIcon(type) {
  switch (type) {
    case "ORDER_CREATED":
      return <IconOrders size={17} className={styles.iconOrder} />;
    case "PAYMENT_SUCCESS":
      return <IconCheck size={17} className={styles.iconSuccess} />;
    case "PAYMENT_FAILED":
      return <IconAlertCircle size={17} className={styles.iconDanger} />;
    case "CONSULTATION_REQUESTED":
      return <IconStyles size={17} className={styles.iconConsult} />;
    case "ORDER_STATUS_UPDATED":
      return <IconOrders size={17} className={styles.iconInfo} />;
    default:
      return <IconBell size={17} className={styles.iconDefault} />;
  }
}

export default function AdminNotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNewPulse, setHasNewPulse] = useState(false);

  const containerRef = useRef(null);

  // Tải danh sách thông báo từ Backend API
  const loadNotifications = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);

      const res = await fetchApi("/notifications?limit=25");
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn("[AdminNotificationCenter] Lỗi tải thông báo:", err.message);
      setError("Không thể tải thông báo. Vui lòng thử lại.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Lấy unread count khi khởi động hoặc đổi tuyến đường
  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadNotifications(true);
    });
    return () => {
      ignore = true;
    };
  }, [loadNotifications, pathname]);

  // Lắng nghe sự kiện SSE thời gian thực từ Window CustomEvents
  useEffect(() => {
    function handleNewNotification(e) {
      const data = e.detail;
      if (!data) return;

      const newNotif = data.notification || data;
      if (newNotif && newNotif.id) {
        setNotifications((prev) => {
          // Tránh thêm trùng lặp
          const exists = prev.some((item) => item.id === newNotif.id);
          if (exists) return prev;
          return [newNotif, ...prev];
        });

        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((c) => c + 1);
        }

        // Kích hoạt hiệu ứng nhấp nháy chuông
        setHasNewPulse(true);
        setTimeout(() => setHasNewPulse(false), 2500);
      }
    }

    function handleNotificationRead(e) {
      const data = e.detail;
      if (!data) return;

      if (data.id) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === data.id ? { ...item, isRead: true } : item
          )
        );
      }
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    }

    function handleNotificationAllRead(e) {
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    }

    // Lắng nghe trực tiếp các sự kiện nghiệp vụ để đảm bảo đồng bộ
    function handleBusinessEventRefresh() {
      loadNotifications(false);
    }

    window.addEventListener("routine:notification_new", handleNewNotification);
    window.addEventListener("routine:notification_read", handleNotificationRead);
    window.addEventListener("routine:notification_all_read", handleNotificationAllRead);
    window.addEventListener("routine:order_created", handleBusinessEventRefresh);
    window.addEventListener("routine:consultation_requested", handleBusinessEventRefresh);
    window.addEventListener("routine:payment_confirmed", handleBusinessEventRefresh);

    return () => {
      window.removeEventListener("routine:notification_new", handleNewNotification);
      window.removeEventListener("routine:notification_read", handleNotificationRead);
      window.removeEventListener("routine:notification_all_read", handleNotificationAllRead);
      window.removeEventListener("routine:order_created", handleBusinessEventRefresh);
      window.removeEventListener("routine:consultation_requested", handleBusinessEventRefresh);
      window.removeEventListener("routine:payment_confirmed", handleBusinessEventRefresh);
    };
  }, [loadNotifications]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Đánh dấu 1 thông báo là đã đọc và điều hướng
  async function handleNotificationClick(item) {
    if (!item.isRead) {
      try {
        await fetchApi(`/notifications/${item.id}/read`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn("[AdminNotificationCenter] Lỗi đánh dấu đã đọc:", err.message);
      }
    }

    setIsOpen(false);

    if (item.link) {
      router.push(item.link);
    }
  }

  // Đánh dấu tất cả thông báo là đã đọc
  async function handleMarkAllAsRead(e) {
    e.stopPropagation();
    if (unreadCount === 0) return;

    try {
      await fetchApi("/notifications/mark-all-read", { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn("[AdminNotificationCenter] Lỗi đánh dấu tất cả đã đọc:", err.message);
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.bellBtn} ${hasNewPulse ? styles.pulse : ""} ${
          isOpen ? styles.active : ""
        }`}
        aria-label="Thông báo quản trị"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            loadNotifications(false);
          }
        }}
      >
        <IconBell size={18} />
        {unreadCount > 0 ? (
          <span className={styles.badge} aria-label={`${unreadCount} thông báo chưa đọc`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Trung tâm thông báo">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleRow}>
              <h3 className={styles.headerTitle}>Thông báo</h3>
              {unreadCount > 0 && (
                <span className={styles.unreadPill}>{unreadCount} chưa đọc</span>
              )}
            </div>

            <button
              type="button"
              className={styles.markAllBtn}
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              title="Đánh dấu tất cả thông báo là đã đọc"
            >
              <IconCheck size={14} />
              <span>Đã đọc tất cả</span>
            </button>
          </div>

          {/* List Content */}
          <div className={styles.list}>
            {loading && notifications.length === 0 ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span>Đang tải thông báo...</span>
              </div>
            ) : error && notifications.length === 0 ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button
                  type="button"
                  className={styles.retryBtn}
                  onClick={() => loadNotifications(true)}
                >
                  Thử lại
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrapper}>
                  <IconBell size={28} />
                </div>
                <p className={styles.emptyTitle}>Chưa có thông báo nào</p>
                <p className={styles.emptySubtitle}>
                  Đơn hàng mới, thanh toán và yêu cầu tư vấn sẽ xuất hiện tại đây khi phát sinh.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.item} ${!item.isRead ? styles.unreadItem : ""}`}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                >
                  <div className={styles.itemIcon}>{getEventIcon(item.type)}</div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTopRow}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemTime}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className={styles.itemMessage}>{item.message}</p>
                  </div>
                  {!item.isRead && <span className={styles.unreadDot} aria-hidden="true" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/orders");
              }}
            >
              Quản lý Đơn hàng →
            </button>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/leads");
              }}
            >
              Yêu cầu Tư vấn →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
