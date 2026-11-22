"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  loadCart,
  saveCart,
  clearLocalCart,
  makeCartLineId,
  calculateSubtotal,
  fetchCartApi,
  addItemApi,
  addBulkItemsApi,
  updateQuantityApi,
  removeItemApi,
  clearCartApi,
  mergeCartApi,
} from "@/lib/cartService";
import { useUser } from "@/context/UserContext";
import { fetchProductById } from "@/lib/productService";
import { isProductOutOfStock } from "@/data/products";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const { user, isLoggedIn, openAuthPrompt } = useUser();
  const prevUserIdRef = useRef(user?.id || null);

  // Khởi tạo & đồng bộ giỏ hàng cô lập theo từng tài khoản
  useEffect(() => {
    let isCurrent = true;
    const userId = user?.id || null;

    if (!isLoggedIn || !userId) {
      // Khách vãng lai: nạp giỏ hàng guest từ localStorage và đồng bộ backend
      const guestCached = loadCart(null);
      if (guestCached && guestCached.length > 0) {
        setItems(guestCached);
      } else {
        setItems([]);
      }
      prevUserIdRef.current = null;
      setHydrated(true);

      async function syncGuestCart() {
        try {
          const remoteCart = await fetchCartApi();
          if (!isCurrent) return;
          if (remoteCart && Array.isArray(remoteCart.items) && remoteCart.items.length > 0) {
            setItems(remoteCart.items);
            saveCart(remoteCart.items, null);
          }
        } catch (err) {}
      }
      syncGuestCart();
      return;
    }

    // Nếu đổi tài khoản khác: dọn sạch state ngay lập tức để không lưu giữ đồ của tài khoản trước
    if (prevUserIdRef.current !== userId) {
      setItems([]);
      clearLocalCart(prevUserIdRef.current);
    }
    prevUserIdRef.current = userId;

    // Nạp cache của chính tài khoản này (nếu có)
    const userCached = loadCart(userId);
    if (userCached && userCached.length > 0) {
      setItems(userCached);
    }
    setHydrated(true);

    async function syncWithDatabase() {
      try {
        const remoteCart = await fetchCartApi();
        if (!isCurrent) return;

        if (remoteCart && Array.isArray(remoteCart.items)) {
          setItems(remoteCart.items);
          saveCart(remoteCart.items, userId);
        } else {
          setItems([]);
          saveCart([], userId);
        }
      } catch (err) {
        console.warn("Lỗi đồng bộ giỏ hàng với Database:", err.message);
      }
    }

    syncWithDatabase();

    return () => {
      isCurrent = false;
    };
  }, [isLoggedIn, user?.id]);

  // Luôn lưu cache localStorage riêng biệt ứng với tài khoản đang đăng nhập
  useEffect(() => {
    if (hydrated) {
      if (isLoggedIn && user?.id) {
        saveCart(items, user.id);
      } else {
        saveCart(items, null);
      }
    }
  }, [items, hydrated, isLoggedIn, user?.id]);

  const addToCart = useCallback(
    (product, { size, color, quantity = 1 } = {}) => {
      // Cho phép cả khách vãng lai và khách thành viên thêm vào giỏ hàng
      if (isProductOutOfStock(product)) {
        return false;
      }

      let mainImg = "";
      if (Array.isArray(product.images) && product.images.length > 0) {
        mainImg = product.images[0];
      } else if (typeof product.images === "string" && product.images.trim()) {
        try {
          const parsed = JSON.parse(product.images);
          mainImg = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : product.images;
        } catch {
          mainImg = product.images;
        }
      } else if (product.image) {
        mainImg = product.image;
      }

      const selectedSize = size || product.sizes?.[0] || "";
      const selectedColor = color || product.colors?.[0] || "";
      const lineId = makeCartLineId(product.id, selectedSize, selectedColor);

      // Cập nhật State tức thì (Optimistic UI)
      setItems((prev) => {
        const existing = prev.find((item) => item.lineId === lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === lineId
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  image: item.image || mainImg,
                }
              : item
          );
        }
        return [
          ...prev,
          {
            lineId,
            productId: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            image: mainImg,
            images: Array.isArray(product.images) ? product.images : [mainImg].filter(Boolean),
            size: selectedSize,
            color: selectedColor,
            quantity,
          },
        ];
      });

      // Lưu vĩnh viễn vào MySQL Database qua Backend API (kèm cookie/x-session-id cho guest)
      addItemApi({
        productId: product.id,
        size: selectedSize,
        color: selectedColor,
        quantity,
        image: mainImg,
        name: product.name,
        price: product.price,
      }).catch((e) => console.warn("Lỗi lưu vào DB:", e.message));

      // Ghi nhận sự kiện tracking ADD_TO_CART
      try {
        fetchApi("/analytics/track", {
          method: "POST",
          body: JSON.stringify({
            action: "ADD_TO_CART",
            productId: product.id,
            metadata: { quantity, size: selectedSize, color: selectedColor, name: product.name },
          }),
        }).catch(() => {});
      } catch (err) {}

      return true;
    },
    []
  );

  const addOutfitToCart = useCallback(
    (productsList) => {
      if (!Array.isArray(productsList) || productsList.length === 0) return false;
      productsList.forEach((product) => addToCart(product, {}));
      return true;
    },
    [addToCart]
  );

  const removeFromCart = useCallback((lineId) => {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
    removeItemApi(lineId).catch((e) => console.warn("Lỗi xóa khỏi DB:", e.message));
  }, []);

  const updateQuantity = useCallback((lineId, quantity) => {
    const validQty = Math.max(1, quantity);
    setItems((prev) =>
      prev
        .map((item) => (item.lineId === lineId ? { ...item, quantity: validQty } : item))
        .filter((item) => item.quantity > 0)
    );
    updateQuantityApi(lineId, validQty).catch((e) => console.warn("Lỗi cập nhật số lượng DB:", e.message));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user?.id) {
      clearLocalCart(user.id);
    } else {
      clearLocalCart(null);
    }
    clearCartApi().catch((e) => console.warn("Lỗi dọn sạch DB:", e.message));
  }, [user?.id]);

  const getCartTotal = useCallback(() => calculateSubtotal(items), [items]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0), [items]);

  const subtotal = useMemo(() => calculateSubtotal(items), [items]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      hydrated,
      addToCart,
      addOutfitToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
    }),
    [items, itemCount, subtotal, hydrated, addToCart, addOutfitToCart, removeFromCart, updateQuantity, clearCart, getCartTotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
