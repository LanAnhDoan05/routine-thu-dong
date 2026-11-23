"use client";

import { useEffect, useRef, Suspense } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/ga4";

/**
 * Subcomponent theo dõi chuyển trang SPA trong Next.js App Router
 * Cần bọc trong Suspense vì useSearchParams() kích hoạt client bailout khi static rendering.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrlRef = useRef("");

  useEffect(() => {
    if (!pathname) return;

    const queryString = searchParams?.toString();
    const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Tránh gửi trùng sự kiện page_view khi component re-render mà URL không đổi
    if (lastTrackedUrlRef.current === currentUrl) {
      return;
    }

    lastTrackedUrlRef.current = currentUrl;

    // Đợi 1 frame nhỏ để document.title cập nhật title mới từ router metadata
    const timer = setTimeout(() => {
      trackPageView(currentUrl, typeof document !== "undefined" ? document.title : "");
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      {/* 1. Tải thư viện gtag.js từ Google */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      {/* 2. Khởi tạo cấu hình ban đầu (tắt auto send_page_view để router SPA kiểm soát chính xác) */}
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false,
              transport_type: 'beacon'
            });
          `,
        }}
      />

      {/* 3. Lắng nghe chuyển trang để kích hoạt page_view chuẩn xác */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
