"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import SearchBar from "./SearchBar";
import { fetchApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/components/common/Toast";
import { SearchIcon, HeartIcon, BagIcon, UserIcon, MenuIcon, CloseIcon, ChevronDownIcon } from "@/components/common/Icons";
import styles from "./Header.module.css";

const primaryNav = [
  { label: "NEW", href: "/category/new-arrivals", isNew: true },
  { label: "MEN", href: "/category/men" },
  { label: "WOMEN", href: "/category/women" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [megaMenuCats, setMegaMenuCats] = useState([]);
  const [adminSession, setAdminSession] = useState(null);

  useEffect(() => {
    fetchApi('/categories?type=mega')
      .then((data) => {
        if (Array.isArray(data)) setMegaMenuCats(data);
        else if (data?.megaMenuCategories) setMegaMenuCats(data.megaMenuCategories);
      })
      .catch(() => {});
  }, []);

  const router = useRouter();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isLoggedIn, logout } = useUser();
  const { showToast } = useToast();

  // Nhận diện phiên Quản trị viên (Admin) nếu có
  useEffect(() => {
    function readAdminSession() {
      try {
        const rawAdmin = typeof window !== "undefined" ? window.localStorage.getItem("routine_admin_user") : null;
        const adminToken = typeof window !== "undefined" ? window.localStorage.getItem("routine_admin_token") : null;
        if (rawAdmin && adminToken) {
          const parsed = JSON.parse(rawAdmin);
          if (parsed && parsed.role === "ADMIN") {
            setAdminSession(parsed);
            return;
          }
        }
        setAdminSession(null);
      } catch {
        setAdminSession(null);
      }
    }
    readAdminSession();
    window.addEventListener("storage", readAdminSession);
    return () => window.removeEventListener("storage", readAdminSession);
  }, [user, userMenuOpen]);

  // Phân định vai trò hiển thị trên Menu tài khoản:
  // 1. Customer: khi đã đăng nhập tài khoản khách (role !== ADMIN)
  // 2. Admin: khi đăng nhập tài khoản quản trị
  // 3. Guest: khi chưa đăng nhập bất kỳ tài khoản nào
  const isCustomer = isLoggedIn && user && user.role !== "ADMIN";
  const isAdmin = !isCustomer && Boolean(adminSession && adminSession.role === "ADMIN");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [router]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = () => setUserMenuOpen(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [userMenuOpen]);

  function handleSearchSubmit(query) {
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  }

  function handleLogout() {
    logout();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("routine_admin_token");
      window.localStorage.removeItem("routine_admin_user");
    }
    setAdminSession(null);
    setUserMenuOpen(false);
    showToast("Đã đăng xuất thành công.");
    router.push("/login");
  }

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
      <div className={`container ${styles.headerInner}`}>
        <div className={styles.bar}>
          {/* Cột trái: Logo thương hiệu trên Desktop + Nút Menu Hamburger trên Mobile */}
          <div className={styles.left}>
            <button
              className={`${styles.iconBtn} ${styles.menuBtn}`}
              aria-label="Mở menu danh mục"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <div className={styles.desktopLogo}>
              <Logo />
            </div>
          </div>

          {/* Cột giữa: Menu điều hướng chính trên Desktop + Logo căn giữa trên Mobile */}
          <div className={styles.center}>
            <div className={styles.mobileLogo}>
              <Logo />
            </div>
            <nav className={styles.nav} aria-label="Điều hướng chính">
              {primaryNav.map((item) => (
                <Link key={item.href} href={item.href} className={styles.navLink}>
                  <span>{item.label}</span>
                  {item.isNew && <span className={styles.newDot} aria-hidden="true" />}
                </Link>
              ))}
              <div className={styles.navGroup}>
                <button className={`${styles.navLink} ${styles.categoryBtn}`} aria-haspopup="true">
                  <span>CATEGORY</span>
                  <ChevronDownIcon className={styles.chevronIcon} />
                </button>
                <div className={styles.megaMenu} role="menu">
                  {megaMenuCats.map((cat) => (
                    <Link key={cat.slug} href={`/category/${cat.slug}`} className={styles.megaMenuItem} role="menuitem">
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/smart-outfit" className={`${styles.navLink} ${styles.smartOutfitLink}`}>
                <span className={styles.smartSparkle} aria-hidden="true">✨</span>
                <span>SMART OUTFIT</span>
              </Link>
            </nav>
          </div>

          {/* Cột phải: Các biểu tượng hành động (Tìm kiếm, Yêu thích, Giỏ hàng, Tài khoản) */}
          <div className={styles.actions}>
            <button
              className={styles.iconBtn}
              aria-label={searchOpen ? "Đóng tìm kiếm" : "Tìm kiếm"}
              onClick={() => setSearchOpen((v) => !v)}
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>

            <Link href="/wishlist" className={styles.iconBtn} aria-label={`Wishlist, ${wishlistCount} sản phẩm`}>
              <HeartIcon />
              {wishlistCount > 0 && <span className={styles.count}>{wishlistCount}</span>}
            </Link>

            <Link href="/cart" className={styles.iconBtn} aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}>
              <BagIcon />
              {itemCount > 0 && <span className={styles.count}>{itemCount}</span>}
            </Link>

            {/* Menu Dropdown Tài khoản Người dùng */}
            <div className={styles.userMenuWrap} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.iconBtn}
                aria-label={
                  isAdmin
                    ? `Quản trị viên: ${adminSession?.fullName || adminSession?.name || "Admin"}`
                    : isCustomer
                    ? `Tài khoản: ${user?.name || ""}`
                    : "Tài khoản người dùng"
                }
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <UserIcon />
                {(isCustomer || isAdmin) && (
                  <span
                    className={styles.userBadge}
                    style={{ background: isAdmin ? "#d97706" : "var(--color-success)" }}
                  />
                )}
              </button>

              {userMenuOpen && (
                <div className={styles.userDropdown} role="menu">
                  {isAdmin ? (
                    /* 1. TÀI KHOẢN ADMIN */
                    <>
                      <div className={styles.userDropdownHeader}>
                        <p className={styles.userDropdownName}>
                          {adminSession?.fullName || adminSession?.name || "Quản Trị Viên Routine"}
                        </p>
                        <p className={styles.userDropdownSub} style={{ color: "#d97706", fontWeight: "600" }}>
                          Quản trị viên (Admin)
                        </p>
                      </div>
                      <Link
                        href="/admin/products"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                        style={{ color: "#d97706", fontWeight: "600", borderBottom: "1px dashed var(--color-border)" }}
                      >
                        ⚙️ Quản trị hệ thống (Admin)
                      </Link>
                      <Link
                        href="/orders"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        📦 Đơn hàng của tôi
                      </Link>
                      <button
                        type="button"
                        className={`${styles.userDropdownItem} ${styles.userDropdownLogout}`}
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        🚪 Đăng xuất
                      </button>
                    </>
                  ) : isCustomer ? (
                    /* 2. TÀI KHOẢN CUSTOMER (KHÁCH HÀNG) */
                    <>
                      <div className={styles.userDropdownHeader}>
                        <p className={styles.userDropdownName}>{user?.name || user?.fullName || "Khách hàng Routine"}</p>
                        <p className={styles.userDropdownSub}>
                          {user?.phoneNumber || user?.email || "Thành viên Routine"}
                        </p>
                      </div>
                      <Link
                        href="/orders#profile"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        👤 Hồ sơ cá nhân
                      </Link>
                      <Link
                        href="/orders"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        📦 Đơn hàng của tôi
                      </Link>
                      <Link
                        href="/wishlist"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        ❤️ Sản phẩm yêu thích
                      </Link>
                      <button
                        type="button"
                        className={`${styles.userDropdownItem} ${styles.userDropdownLogout}`}
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        🚪 Đăng xuất
                      </button>
                    </>
                  ) : (
                    /* 3. CHƯA ĐĂNG NHẬP (GUEST) */
                    <>
                      <div className={styles.userDropdownHeader}>
                        <p className={styles.userDropdownName}>Tài khoản</p>
                        <p className={styles.userDropdownSub}>Chưa đăng nhập</p>
                      </div>
                      <Link
                        href="/login"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        🔑 Đăng nhập
                      </Link>
                      <Link
                        href="/register"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        ✨ Đăng ký tài khoản
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className={styles.searchDropdown}>
          <div className="container">
            <SearchBar autoFocus onSearch={handleSearchSubmit} />
          </div>
        </div>
      )}

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} categories={megaMenuCats} />
    </header>
  );
}
