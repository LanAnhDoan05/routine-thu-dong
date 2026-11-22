"use client";

import { useEffect, useState } from "react";
import { colors as allColors } from "@/data/colors";
import { sizes as allSizes } from "@/data/sizes";
import { getColorById } from "@/data/colors";
import { getSizeById } from "@/data/sizes";
import { buildVariantSku } from "@/lib/sku";
import ColorSelector from "./ColorSelector";
import SizeSelector from "./SizeSelector";
import { IconTrash } from "./icons";
import styles from "./VariantEditor.module.css";

function generateLocalId() {
  return `v-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function formatVnd(val) {
  const n = Number(val);
  if (isNaN(n) || n === 0) return "0₫";
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export default function VariantEditor({
  selectedColorIds = [],
  onChangeSelectedColorIds,
  selectedSizeIds = [],
  onChangeSelectedSizeIds,
  variants = [],
  onChangeVariants,
  skuPrefix,
  basePrice,
  errors = {},
  generalError,
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  function buildVariants(colorIds, sizeIds, currentVariants) {
    const activeColorIds = Array.isArray(colorIds) ? colorIds : [];
    const activeSizeIds = Array.isArray(sizeIds) ? sizeIds : [];
    if (!activeColorIds.length || !activeSizeIds.length) return [];

    const next = [];
    let sequence = 1;
    const seenSkus = new Set();

    for (const colorId of activeColorIds) {
      for (const sizeId of activeSizeIds) {
        const cObj = getColorById(colorId);
        const sObj = getSizeById(sizeId);
        const cCanonicalId = cObj?.id || colorId;
        const sCanonicalId = sObj?.id || sizeId;

        // Tìm biến thể tương ứng nếu đã tồn tại
        const existing = (currentVariants || []).find((v) => {
          const matchColor =
            !colorId ||
            v.colorId === colorId ||
            v.colorId === cCanonicalId ||
            (v.colorName && cObj && v.colorName.toLowerCase() === cObj.name.toLowerCase()) ||
            (v.colorId && cObj && v.colorId.toLowerCase() === cObj.name.toLowerCase());
          const matchSize =
            !sizeId ||
            v.sizeId === sizeId ||
            v.sizeId === sCanonicalId ||
            (v.sizeName && sObj && v.sizeName.toUpperCase() === sObj.name.toUpperCase()) ||
            (v.sizeId && sObj && v.sizeId.toUpperCase() === sObj.name.toUpperCase());
          return matchColor && matchSize;
        });

        const freshSku = buildVariantSku(skuPrefix, sequence, cCanonicalId, sCanonicalId);
        let finalSku = freshSku;
        if (existing && existing.sku && !seenSkus.has(existing.sku.toLowerCase()) && !existing.sku.includes("-CO-")) {
          finalSku = existing.sku;
        }

        // Đảm bảo không trùng lặp SKU giữa các biến thể
        if (seenSkus.has(finalSku.toLowerCase())) {
          let counter = 1;
          let candidate = `${finalSku}-${counter}`;
          while (seenSkus.has(candidate.toLowerCase())) {
            counter += 1;
            candidate = `${finalSku}-${counter}`;
          }
          finalSku = candidate;
        }
        seenSkus.add(finalSku.toLowerCase());

        // Ưu tiên giá đã nhập (> 0), nếu chưa có hoặc bằng 0 thì lấy basePrice
        const resolvedPrice = (existing && existing.price && Number(existing.price) > 0)
          ? Number(existing.price)
          : (basePrice && Number(basePrice) > 0 ? Number(basePrice) : 0);

        next.push({
          id: existing ? existing.id : generateLocalId(),
          colorId: cCanonicalId,
          colorName: cObj ? cObj.name : (existing?.colorName || (colorId ? String(colorId).replace(/^color-/, "") : "Default")),
          sizeId: sCanonicalId,
          sizeName: sObj ? sObj.name : (existing?.sizeName || (sizeId ? String(sizeId).replace(/^size-/, "").toUpperCase() : "Default")),
          sku: finalSku,
          price: resolvedPrice,
          stockQuantity: existing && existing.stockQuantity !== undefined ? existing.stockQuantity : 0,
          status: existing?.status || "ACTIVE",
        });
        sequence += 1;
      }
    }
    return next;
  }

  // Tự động đồng bộ và nhảy bộ đếm biến thể khi người dùng chọn Màu & Kích cỡ
  useEffect(() => {
    if (selectedColorIds.length > 0 && selectedSizeIds.length > 0 && (!variants || variants.length === 0)) {
      const initial = buildVariants(selectedColorIds, selectedSizeIds, []);
      if (initial.length > 0) {
        onChangeVariants(initial);
      }
    }
  }, [selectedColorIds, selectedSizeIds, variants, skuPrefix, basePrice]);

  function handleColorsChange(newColorIds) {
    onChangeSelectedColorIds(newColorIds);
    const updated = buildVariants(newColorIds, selectedSizeIds, variants);
    onChangeVariants(updated);
  }

  function handleSizesChange(newSizeIds) {
    onChangeSelectedSizeIds(newSizeIds);
    const updated = buildVariants(selectedColorIds, newSizeIds, variants);
    onChangeVariants(updated);
  }

  function handleGenerate() {
    const updated = buildVariants(selectedColorIds, selectedSizeIds, variants);
    onChangeVariants(updated);
  }

  function updateVariant(id, field, value) {
    onChangeVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  function removeVariant(id) {
    const next = variants.filter((v) => v.id !== id);
    onChangeVariants(next);
  }

  // Thao tác hàng loạt: Áp dụng giá cho toàn bộ biến thể
  function handleApplyBulkPrice() {
    const pVal = Number(bulkPrice);
    if (isNaN(pVal) || pVal <= 0) return;
    onChangeVariants(variants.map((v) => ({ ...v, price: pVal })));
  }

  // Thao tác hàng loạt: Áp dụng tồn kho cho toàn bộ biến thể
  function handleApplyBulkStock() {
    const sVal = Math.max(0, parseInt(bulkStock, 10) || 0);
    onChangeVariants(variants.map((v) => ({ ...v, stockQuantity: sVal })));
  }

  // Thao tác hàng loạt: Đồng bộ tất cả biến thể theo giá cơ bản của sản phẩm
  function handleSyncBasePrice() {
    const numBase = Number(basePrice);
    if (!numBase || numBase <= 0) return;
    onChangeVariants(variants.map((v) => ({ ...v, price: numBase })));
  }

  // Tổng hợp danh sách màu đầy đủ (bao gồm cả các màu tùy chỉnh hiện có trên sản phẩm)
  const mergedColorOptions = [
    ...allColors,
    ...selectedColorIds
      .map(getColorById)
      .filter(Boolean)
      .filter((c) => !allColors.some((ac) => ac.id === c.id)),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.pickRow}>
        <ColorSelector
          colorOptions={mergedColorOptions}
          value={selectedColorIds}
          onChange={handleColorsChange}
        />
        <SizeSelector
          sizeOptions={allSizes}
          value={selectedSizeIds}
          onChange={handleSizesChange}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
        <button type="button" className={styles.generateBtn} onClick={handleGenerate} title="Tạo lại danh sách biến thể theo kích cỡ và màu đã chọn">
          Tạo lại danh sách biến thể (Generate)
        </button>
        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Đã tạo {variants.length} biến thể ({selectedColorIds.length} màu × {selectedSizeIds.length} size)
        </span>
      </div>

      {generalError ? <p className={styles.generalError}>{generalError}</p> : null}

      {variants.length > 0 ? (
        <>
          {/* THANH THIẾT LẬP NHANH CHO TOÀN BỘ BIẾN THỂ (BULK ACTIONS) */}
          <div className={styles.bulkBar}>
            <span className={styles.bulkTitle}>⚡ Thiết lập nhanh cho toàn bộ biến thể:</span>
            <div className={styles.bulkRow}>
              <div className={styles.bulkField}>
                <label className={styles.bulkLabel}>Giá bán chung (VNĐ):</label>
                <div className={styles.bulkInputWrap}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={basePrice && Number(basePrice) > 0 ? String(basePrice) : "Ví dụ: 299000"}
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    className={styles.bulkInput}
                  />
                  <button type="button" className={styles.bulkApplyBtn} onClick={handleApplyBulkPrice}>
                    Áp dụng giá
                  </button>
                </div>
              </div>

              <div className={styles.bulkField}>
                <label className={styles.bulkLabel}>Tồn kho chung (chiếc):</label>
                <div className={styles.bulkInputWrap}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ví dụ: 20"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value.replace(/[^0-9]/g, ""))}
                    className={styles.bulkInput}
                  />
                  <button type="button" className={styles.bulkApplyBtn} onClick={handleApplyBulkStock}>
                    Áp dụng kho
                  </button>
                </div>
              </div>

              {basePrice && Number(basePrice) > 0 ? (
                <button
                  type="button"
                  className={styles.syncBasePriceBtn}
                  onClick={handleSyncBasePrice}
                  title="Đồng bộ tất cả biến thể theo giá cơ bản của sản phẩm"
                >
                  Đồng bộ giá cơ bản ({formatVnd(basePrice)})
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Size</th>
                  <th className={styles.skuCol}>SKU</th>
                  <th>Price (VNĐ)</th>
                  <th>Stock (Tồn kho)</th>
                  <th>Status</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const color = getColorById(v.colorId || v.colorName);
                  const size = getSizeById(v.sizeId || v.sizeName);
                  const rowErrors = errors[v.id] || {};
                  return (
                    <tr key={v.id}>
                      <td>
                        {color ? (
                          <span className={styles.colorCell}>
                            <span className={styles.dot} style={{ background: color.hexCode }} />
                            {color.name}
                          </span>
                        ) : (
                          v.colorName || v.colorId || "—"
                        )}
                        {rowErrors.color ? <p className={styles.cellError}>{rowErrors.color}</p> : null}
                      </td>
                      <td>
                        {size ? size.name : (v.sizeName || v.sizeId || "—")}
                        {rowErrors.size ? <p className={styles.cellError}>{rowErrors.size}</p> : null}
                      </td>
                      <td className={styles.skuCol}>
                        <input
                          type="text"
                          className={`${styles.input} ${rowErrors.sku ? styles.inputError : ""}`}
                          value={v.sku}
                          onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                          aria-label={`SKU cho ${color?.name || ""} ${size?.name || ""}`}
                        />
                        {rowErrors.sku ? <p className={styles.cellError}>{rowErrors.sku}</p> : null}
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${styles.input} ${styles.numberInput} ${rowErrors.price ? styles.inputError : ""}`}
                          value={v.price === 0 || v.price === "" || v.price == null ? "" : v.price}
                          placeholder={basePrice && Number(basePrice) > 0 ? String(basePrice) : "0"}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^0-9]/g, "");
                            updateVariant(v.id, "price", cleaned === "" ? "" : Number(cleaned));
                          }}
                          onBlur={() => {
                            if (v.price === "" || v.price == null || Number(v.price) === 0) {
                              if (basePrice && Number(basePrice) > 0) {
                                updateVariant(v.id, "price", Number(basePrice));
                              } else {
                                updateVariant(v.id, "price", 0);
                              }
                            }
                          }}
                          aria-label="Giá biến thể"
                        />
                        {rowErrors.price ? <p className={styles.cellError}>{rowErrors.price}</p> : null}
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${styles.input} ${styles.numberInput} ${rowErrors.stock ? styles.inputError : ""}`}
                          value={v.stockQuantity === 0 || v.stockQuantity === "" || v.stockQuantity == null ? "" : v.stockQuantity}
                          placeholder="0"
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^0-9]/g, "");
                            updateVariant(v.id, "stockQuantity", cleaned === "" ? "" : parseInt(cleaned, 10));
                          }}
                          onBlur={() => {
                            if (v.stockQuantity === "" || v.stockQuantity == null) {
                              updateVariant(v.id, "stockQuantity", 0);
                            }
                          }}
                          aria-label="Tồn kho biến thể"
                        />
                        {rowErrors.stock ? <p className={styles.cellError}>{rowErrors.stock}</p> : null}
                      </td>
                      <td>
                        <select
                          className={styles.input}
                          value={v.status}
                          onChange={(e) => updateVariant(v.id, "status", e.target.value)}
                          aria-label="Trạng thái biến thể"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeVariant(v.id)}
                          aria-label="Xoá biến thể"
                          title="Remove variant"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className={styles.emptyHint}>Chọn Colors và Sizes ở trên để tự động tạo bảng biến thể.</p>
      )}
    </div>
  );
}
