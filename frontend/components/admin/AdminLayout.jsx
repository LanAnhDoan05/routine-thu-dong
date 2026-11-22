"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useUser } from "@/context/UserContext";
import { fetchApi } from "@/lib/api";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useUser();
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Nhận diện phiên đăng nhập Admin độc lập với phiên Khách hàng
  const effectiveUser = (() => {
    if (typeof window === "undefined") return null;
    try {
      const rawAdmin = window.localStorage.getItem("routine_admin_user");
      if (rawAdmin) {
        const parsed = JSON.parse(rawAdmin);
        if (parsed && parsed.role === "ADMIN") return parsed;
      }
      if (user && user.role === "ADMIN") return user;
      const rawUser = window.localStorage.getItem("routine_user_v1");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      if (parsedUser && parsedUser.role === "ADMIN") return parsedUser;
      return null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      const token =
        (typeof window !== "undefined" && window.localStorage.getItem("routine_admin_token")) ||
        (typeof window !== "undefined" && window.localStorage.getItem("routine_token")) ||
        (typeof window !== "undefined" && window.localStorage.getItem("token"));

      let tokenValid = false;
      try {
        const payload = token ? JSON.parse(window.atob(token.split(".")[1])) : null;
        tokenValid = Boolean(payload && (!payload.exp || payload.exp * 1000 > Date.now()));
      } catch {
        tokenValid = false;
      }

      if (!effectiveUser || effectiveUser.role !== "ADMIN" || !tokenValid) {
        console.log('[DEBUG AdminLayout] Admin Check failed:', { hasUser: !!effectiveUser, role: effectiveUser?.role, tokenValid });
        setCheckingAccess(false);
        router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
        return;
      }

      fetchApi("/auth/me")
        .then((data) => {
          if (!cancelled && data?.user?.role === "ADMIN") {
            setCheckingAccess(false);
          } else if (!cancelled) {
            throw new Error("Admin access denied");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          console.log('[DEBUG AdminLayout] fetchApi /auth/me caught error:', err.message);
          setCheckingAccess(false);
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, user, effectiveUser, pathname, router]);

  // Đóng drawer mỗi khi chuyển route.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  if (!hydrated || checkingAccess || !effectiveUser || effectiveUser.role !== "ADMIN") return null;

  return (
    <div className={styles.shell}>
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className={styles.contentColumn}>
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
