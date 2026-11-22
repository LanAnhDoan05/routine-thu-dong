"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoggedIn, hydrated, savedAddress, logout } = useUser();

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.replace("/login?redirect=/profile");
    }
  }, [hydrated, isLoggedIn, router]);

  if (!hydrated || !isLoggedIn) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  function handleLogout() {
    logout();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("routine_admin_token");
      window.localStorage.removeItem("routine_admin_user");
    }
    router.push("/login");
  }

  const defaultAddressStr = savedAddress
    ? [savedAddress.street, savedAddress.ward, savedAddress.district, savedAddress.city].filter(Boolean).join(", ")
    : "Chưa lưu địa chỉ giao hàng";

  return (
    <div className="container" style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
      <div className={styles.profileHeader}>
        <span className={styles.eyebrow}>ROUTINE THU ĐÔNG MEMBERSHIP</span>
        <h1 className={styles.title}>HỒ SƠ CÁ NHÂN</h1>
        <p className={styles.subtitle}>Quản lý thông tin tài khoản và trải nghiệm mua sắm của bạn.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>Thông tin tài khoản</h2>
        </div>
        <div className={styles.grid}>
          <div className={styles.infoGroup}>
            <span className={styles.label}>Họ và tên</span>
            <span className={styles.value}>{user?.name || user?.fullName || "Khách hàng Routine Thu Đông"}</span>
          </div>
          <div className={styles.infoGroup}>
            <span className={styles.label}>Số điện thoại</span>
            <span className={styles.value}>{user?.phoneNumber || user?.phone || "Chưa cập nhật"}</span>
          </div>
          <div className={styles.infoGroup}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user?.email || "Chưa cập nhật"}</span>
          </div>
          <div className={styles.infoGroup}>
            <span className={styles.label}>Phong cách ưa thích</span>
            <span className={styles.value} style={{ textTransform: "capitalize" }}>
              {user?.stylePreference || "Minimal"}
            </span>
          </div>
        </div>

        <div className={styles.addressSection}>
          <span className={styles.label}>Địa chỉ giao hàng mặc định</span>
          <p className={styles.addressValue}>{defaultAddressStr}</p>
        </div>

        <div className={styles.actions}>
          <Link href="/orders" className="btn btn-primary">
            📦 Xem đơn hàng của tôi
          </Link>
          <Link href="/wishlist" className="btn btn-secondary">
            ❤️ Sản phẩm yêu thích
          </Link>
          <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
