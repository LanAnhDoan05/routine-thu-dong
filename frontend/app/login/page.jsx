"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthHeader from "@/components/auth/AuthHeader";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import LoadingButton from "@/components/auth/LoadingButton";
import { validateEmail, validatePhone } from "@/lib/validation";
import { loginWithPassword } from "@/lib/authService";
import { useUser } from "@/context/UserContext";
import { trackLogin } from "@/lib/ga4";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Đang tải...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const identifierCheck = identifier.includes("@")
    ? validateEmail(identifier)
    : validatePhone(identifier);
  const passwordError = !password
    ? "Vui lòng nhập mật khẩu."
    : password.length < 6
      ? "Mật khẩu phải có ít nhất 6 ký tự."
      : "";
  const isFormValid = identifierCheck.valid && !passwordError;

  async function handleSubmit(event) {
    event.preventDefault();
    setIdentifierTouched(true);
    setPasswordTouched(true);
    if (!isFormValid) return;

    setIsLoading(true);
    setServerError("");
    const result = await loginWithPassword(identifier, password);
    setIsLoading(false);

    if (!result.success) {
      setServerError(result.message);
      return;
    }

    if (result.user?.role === "ADMIN") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("routine_admin_token", result.token);
        window.localStorage.setItem("routine_admin_user", JSON.stringify(result.user));
        window.dispatchEvent(new Event("routine:auth_change"));
      }
      const adminDest = redirectTarget.startsWith("/admin") ? redirectTarget : "/admin/products";
      router.push(adminDest);
    } else {
      trackLogin({ method: identifier.includes("@") ? "email" : "phone" });
      login(result.user, result.user?.stylePreference, result.token);
      // Khách hàng không được chuyển hướng vào /admin
      const custDest = redirectTarget.startsWith("/admin") ? "/" : redirectTarget;
      router.push(custDest);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Đăng nhập"
        subtitle="Đăng nhập bằng số điện thoại/email và mật khẩu để tiếp tục."
      />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField
          label="Số điện thoại hoặc email"
          type="text"
          autoComplete="username"
          placeholder="Nhập số điện thoại hoặc email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onBlur={() => setIdentifierTouched(true)}
          error={identifierCheck.message}
          touched={identifierTouched}
        />

        <PasswordField
          label="Mật khẩu"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChange={setPassword}
          onBlur={() => setPasswordTouched(true)}
          error={passwordError}
          touched={passwordTouched}
          autoComplete="current-password"
        />

        {serverError && <p className={styles.serverError}>{serverError}</p>}

        <LoadingButton type="submit" isLoading={isLoading}>
          Đăng nhập
        </LoadingButton>
      </form>

      <div className={styles.footer}>
        <p>
          Bạn chưa có tài khoản?{" "}
          <Link href="/register" className={styles.link}>
            Đăng ký
          </Link>
        </p>
        <Link href="/forgot-password" className={styles.link}>
          Quên mật khẩu?
        </Link>
      </div>
    </AuthLayout>
  );
}
