"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import StepIndicator from "@/components/auth/StepIndicator";
import StyleGrid from "@/components/auth/StyleGrid";
import PrimaryButton from "@/components/auth/PrimaryButton";
import { useRegistration } from "@/context/RegistrationContext";
import { useUser } from "@/context/UserContext";
import { register as registerUser } from "@/lib/authService";
import styles from "./page.module.css";
import styleList from "@/data/styles";
import { getStyles } from "@/lib/styleService";

const MAX_STYLES = 3;

export default function RegisterStylePage() {
  const router = useRouter();
  const { data, isHydrated, saveSelectedStyles, clearRegistrationData } = useRegistration();
  const { login } = useUser();
  const [selectedIds, setSelectedIds] = useState([]);
  const [availableStyles, setAvailableStyles] = useState(styleList);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [welcomeCoupon, setWelcomeCoupon] = useState(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    let isMounted = true;
    getStyles()
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          const activeList = res.filter((item) => item.status !== "INACTIVE");
          if (activeList.length > 0) {
            setAvailableStyles(activeList);
          }
        }
      })
      .catch((err) => {
        console.warn("Lỗi tải phong cách từ API, sử dụng danh sách mặc định:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Nếu chưa hoàn thành /register (không có sđt trong dữ liệu tạm), quay
  // người dùng lại bước nhập thông tin tài khoản. Đợi context hydrate xong
  // từ sessionStorage trước khi kiểm tra, để tránh redirect nhầm khi user
  // tải lại trang /register/style trực tiếp.
  useEffect(() => {
    if (isHydrated && !data.phone && !isSuccess) {
      router.replace("/register");
    }
  }, [isHydrated, data.phone, isSuccess, router]);

  const maxReached = selectedIds.length >= MAX_STYLES;

  function toggleStyle(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= MAX_STYLES) {
        return prev;
      }
      return [...prev, id];
    });
  }

  async function submitRegistration(stylesToSave) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError("");

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        gender: data.gender || "unisex",
        dateOfBirth: data.dateOfBirth || data.date || null,
        date: data.dateOfBirth || data.date || null,
        selectedStyles: stylesToSave,
      };

      const res = await registerUser(payload);
      if (!res.success) {
        setServerError(res.message || "Đăng ký không thành công. Vui lòng thử lại.");
        setIsSubmitting(false);
        return;
      }

      // Đăng nhập người dùng ngay sau khi tạo tài khoản thành công
      const preferredStyle = stylesToSave[0] || "minimal";
      const customerData = res.data?.user ? {
        ...res.data.user,
        role: "CUSTOMER",
        name: res.data.user.fullName || data.name,
      } : {
        name: data.name,
        fullName: data.name,
        email: data.email,
        phoneNumber: data.phone,
        gender: data.gender || "unisex",
        role: "CUSTOMER",
        dateOfBirth: data.dateOfBirth || data.date || null,
        date: data.dateOfBirth || data.date || null,
        stylePreference: preferredStyle,
      };
      login(
        customerData,
        preferredStyle,
        res.data?.token
      );

      // Nhận voucher chào mừng từ backend
      const coupon = res.data?.welcomeCoupon || {
        code: "WELCOME2026",
        type: "percent",
        value: 15,
        maxDiscount: 150000,
        minOrderValue: 400000,
        description: "Ưu đãi thành viên mới giảm 15% (tối đa 150.000₫) cho đơn từ 400.000₫",
      };
      setWelcomeCoupon(coupon);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("routine_welcome_voucher", JSON.stringify(coupon));
        window.sessionStorage.setItem("routine_welcome_voucher_code", coupon.code);
      }

      clearRegistrationData();
      setIsSuccess(true);
    } catch (err) {
      setServerError(err.message || "Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  }

  // Đếm ngược tự động chuyển hướng nhưng cho phép người dùng dừng lại xem voucher
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/smart-outfit");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, router]);

  function handleCopy(code) {
    if (!code) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        setCopied(true);
      });
    } else {
      setCopied(true);
    }
  }

  function handleContinue() {
    saveSelectedStyles(selectedIds);
    submitRegistration(selectedIds);
  }

  function handleSkip() {
    saveSelectedStyles([]);
    submitRegistration([]);
  }

  if (isSuccess) {
    const couponCode = welcomeCoupon?.code || "WELCOME2026";
    const discountText =
      welcomeCoupon?.type === "percent"
        ? `Giảm ${welcomeCoupon.value}% (Tối đa ${(welcomeCoupon.maxDiscount || 150000).toLocaleString("vi-VN")}₫)`
        : `Giảm ${(welcomeCoupon?.value || 50000).toLocaleString("vi-VN")}₫`;
    const minOrderText = `Đơn từ ${(welcomeCoupon?.minOrderValue || 400000).toLocaleString("vi-VN")}₫`;

    return (
      <AuthLayout contentMaxWidth="580px">
        <div className={styles.successState}>
          <span className={styles.successIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <h1 className={styles.successTitle}>Đăng ký thành công!</h1>
          <p className={styles.successSubtitle}>
            Chào mừng bạn đến với Routine Thu Đông. Chúng tôi đã chuẩn bị sẵn món quà đặc biệt dành riêng cho bạn:
          </p>

          {/* Thẻ Voucher chào mừng */}
          <div className={styles.voucherCard}>
            <div className={styles.voucherHeader}>
              <span className={styles.voucherBadge}>🎁 QUÀ TẶNG THÀNH VIÊN MỚI</span>
              <span className={styles.voucherExpiry}>Hạn dùng 30 ngày</span>
            </div>

            <div className={styles.voucherMain}>
              <div className={styles.voucherDiscount}>{discountText}</div>
              <div className={styles.voucherCondition}>{minOrderText} · Áp dụng cho đơn hàng đầu tiên</div>
            </div>

            <div className={styles.voucherCodeBox}>
              <span className={styles.voucherCode}>{couponCode}</span>
              <button
                type="button"
                className={`${styles.copyButton} ${copied ? styles.copyButtonSuccess : ""}`}
                onClick={() => handleCopy(couponCode)}
              >
                {copied ? "✓ Đã chép mã" : "Sao chép mã"}
              </button>
            </div>

            <div className={styles.voucherFooterNotice}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Mã đã tự động lưu vào ví ưu đãi & gửi tới email của bạn.</span>
            </div>
          </div>

          <div className={styles.autoRedirectNotice}>
            Tự động chuyển đến bộ sưu tập Smart Outfit sau <strong>{countdown}s</strong>...
          </div>

          <div className={styles.successActions}>
            <PrimaryButton type="button" onClick={() => router.push("/smart-outfit")}>
              Khám phá Smart Outfit ngay →
            </PrimaryButton>
            <button
              type="button"
              className={styles.skipButton}
              onClick={() => router.push("/")}
              style={{ marginTop: 4 }}
            >
              Về trang chủ Routine Thu Đông
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout contentMaxWidth="640px">
      <AuthHeader
        title="Bạn yêu thích phong cách nào?"
        subtitle="Chọn tối đa 3 phong cách để chúng tôi cá nhân hóa trải nghiệm và gợi ý outfit phù hợp với bạn."
      />

      <StepIndicator currentStep={2} />

      <div className={styles.counterRow}>
        <span className={`${styles.counter} ${selectedIds.length > 0 ? styles.counterActive : ""}`}>
          {selectedIds.length}/{MAX_STYLES} phong cách đã chọn
        </span>
      </div>

      <div className={styles.grid}>
        <StyleGrid
          styleList={availableStyles}
          selectedIds={selectedIds}
          maxReached={maxReached}
          onToggle={toggleStyle}
        />
      </div>

      {maxReached && (
        <p className={styles.maxHint}>Bạn đã chọn tối đa 3 phong cách.</p>
      )}

      {serverError && (
        <p className={styles.serverError}>
          {serverError}
        </p>
      )}

      <div className={styles.actions}>
        <PrimaryButton type="button" onClick={handleContinue} disabled={isSubmitting}>
          {isSubmitting ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
        </PrimaryButton>
        <button
          type="button"
          className={styles.skipButton}
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Bỏ qua
        </button>
      </div>
    </AuthLayout>
  );
}
