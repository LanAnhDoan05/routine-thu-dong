"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { findActiveNavItem, getBreadcrumbTrailingLabel } from "@/lib/adminNav";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/components/admin/ToastProvider";
import { IconMenu, IconSearch, IconLogout } from "./icons";
import AdminNotificationCenter from "./AdminNotificationCenter";
import styles from "./AdminHeader.module.css";

export default function AdminHeader({ onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();
  const active = findActiveNavItem(pathname);
  const trailing = getBreadcrumbTrailingLabel(pathname);
  const primaryLabel = active?.label || "Dashboard";

  const adminUser = (() => {
    if (typeof window === "undefined") return user;
    try {
      const rawAdmin = window.localStorage.getItem("routine_admin_user");
      if (rawAdmin) return JSON.parse(rawAdmin);
      if (user?.role === "ADMIN") return user;
      const raw = window.localStorage.getItem("routine_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("routine_admin_token");
      window.localStorage.removeItem("routine_admin_user");
    }
    showToast("Đã đăng xuất khỏi trang quản trị.");
    router.push("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.menuBtn} aria-label="Mở menu" onClick={onMenuClick}>
          <IconMenu size={20} />
        </button>
        <span className={styles.mobileBrand}>ROUTINE</span>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <span className={styles.crumbCurrent}>{primaryLabel}</span>
          {trailing ? (
            <>
              <span className={styles.crumbSep}>/</span>
              <span className={styles.crumbCurrent}>{trailing}</span>
            </>
          ) : null}
        </nav>
      </div>

      <div className={styles.right}>
        <label className={styles.search}>
          <IconSearch size={16} />
          <input type="search" placeholder="Search..." aria-label="Tìm kiếm" />
        </label>

        <AdminNotificationCenter />

        <div className={styles.profile}>
          <Image src="/images/avatars/admin.svg" alt="Admin Avatar" width={32} height={32} className={styles.avatar} />
          <span className={styles.profileName}>{adminUser?.fullName || adminUser?.name || "Quản Trị Viên Routine"}</span>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
          aria-label="Đăng xuất khỏi trang quản trị"
          title="Đăng xuất"
          onClick={handleLogout}
        >
          <IconLogout size={17} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
