import Link from "next/link";
import styles from "./Logo.module.css";

export default function Logo({ className = "" }) {
  return (
    <Link
      href="/"
      className={`${styles.logoLink} ${className}`}
      aria-label="Routine — về trang chủ"
    >
      <span className={styles.brandName}>ROUTINE</span>
    </Link>
  );
}
