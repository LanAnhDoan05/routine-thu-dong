"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getApiBase } from "@/lib/api";

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const pathname = usePathname();
  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));
  const prevIsAdminRef = useRef(isAdminRoute);

  const [isLive, setIsLive] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Đóng kết nối cũ nếu có
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const apiBase = getApiBase();
    const isAdminRoute = window.location.pathname.startsWith("/admin");
    const adminToken = window.localStorage.getItem("routine_admin_token");
    const customerToken = window.localStorage.getItem("routine_token") || window.localStorage.getItem("token");
    const activeToken = isAdminRoute ? adminToken : customerToken;
    const guestSessionId = window.localStorage.getItem("routine_guest_session_id") || "";

    const params = new URLSearchParams();
    if (activeToken) params.set("token", activeToken);
    if (guestSessionId) params.set("guestSessionId", guestSessionId);

    const streamUrl = `${apiBase}/realtime/stream?${params.toString()}`;

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener("CONNECTED", (e) => {
        setIsLive(true);
        setConnectionError(null);
      });

      // Danh sách sự kiện nghiệp vụ theo đặc tả hệ thống
      const businessEvents = [
        "PRODUCT_CREATED",
        "PRODUCT_UPDATED",
        "PRODUCT_STATUS_CHANGED",
        "STOCK_UPDATED",
        "ORDER_CREATED",
        "ORDER_STATUS_UPDATED",
        "PAYMENT_CONFIRMED",
        "CUSTOMER_REGISTERED",
        "SHIPPING_FEE_UPDATED",
        "CATEGORY_UPDATED",
        "CONSULTATION_REQUESTED",
        "STAFF_MESSAGE_SENT",
        "CUSTOMER_MESSAGE_SENT",
        "LEAD_STATUS_UPDATED",
        "NOTIFICATION_NEW",
        "NOTIFICATION_READ",
        "NOTIFICATION_ALL_READ",
      ];

      businessEvents.forEach((eventType) => {
        es.addEventListener(eventType, (e) => {
          try {
            const data = JSON.parse(e.data);
            const evtObj = { type: eventType, data, timestamp: new Date().toISOString() };
            setLastEvent(evtObj);

            // Bắn CustomEvent lên window để các component lắng nghe độc lập
            window.dispatchEvent(new CustomEvent(`routine:${eventType.toLowerCase()}`, { detail: data }));
            window.dispatchEvent(new CustomEvent("routine:realtime_event", { detail: evtObj }));
          } catch (err) {
            console.warn(`[Realtime SSE] Lỗi giải mã sự kiện ${eventType}:`, err);
          }
        });
      });

      es.onerror = () => {
        setIsLive(false);
        setConnectionError("Mất kết nối với máy chủ thời gian thực. Đang tự động kết nối lại...");
      };
    } catch (err) {
      setIsLive(false);
      setConnectionError(err.message);
    }
  }, []);

  useEffect(() => {
    // Chỉ reconnect nếu chưa có kết nối hoặc đổi khu vực giữa Storefront và Admin
    if (!eventSourceRef.current || prevIsAdminRef.current !== isAdminRoute) {
      prevIsAdminRef.current = isAdminRoute;
      connect();
    }

    function handleStorageChange(e) {
      if (e.key === "routine_admin_token" || e.key === "routine_token" || e.key === "token") {
        connect();
      }
    }

    function handleAuthEvent() {
      connect();
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("routine:auth_change", handleAuthEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("routine:auth_change", handleAuthEvent);
    };
  }, [connect, isAdminRoute]);

  // Hàm thủ công gọi reconnect nếu cần (ví dụ sau khi đăng nhập đổi role)
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return (
    <RealtimeContext.Provider value={{ isLive, lastEvent, connectionError, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  return ctx || { isLive: false, lastEvent: null, connectionError: null, reconnect: () => {} };
}
