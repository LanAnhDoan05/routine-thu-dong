import { fetchApi } from "./api";

const DEFAULT_STYLES = [
  { id: "basic", slug: "basic", name: "Basic", description: "Những món đồ nền tảng, dễ phối với mọi thứ khác.", image: "/images/styles/basic.jpg", imageUrl: "/images/styles/basic.jpg", status: "ACTIVE" },
  { id: "minimal", slug: "minimal", name: "Minimal", description: "Phong cách tối giản, thanh lịch, tinh tế.", image: "/images/styles/minimal.jpg", imageUrl: "/images/styles/minimal.jpg", status: "ACTIVE" },
  { id: "smart-casual", slug: "smart-casual", name: "Smart Casual", description: "Lịch sự vừa đủ, vẫn thoải mái để di chuyển cả ngày.", image: "/images/styles/smart-casual.jpg", imageUrl: "/images/styles/smart-casual.jpg", status: "ACTIVE" },
  { id: "sporty-chic", slug: "sporty-chic", name: "Sporty Chic", description: "Năng động nhưng vẫn tinh tế, dễ mặc đi tập lẫn đi chơi.", image: "/images/styles/sporty-chic.jpg", imageUrl: "/images/styles/sporty-chic.jpg", status: "ACTIVE" },
  { id: "streetstyle", slug: "streetstyle", name: "Streetstyle", description: "Cá tính, phóng khoáng, cảm hứng từ đường phố.", image: "/images/styles/streetstyle.jpg", imageUrl: "/images/styles/streetstyle.jpg", status: "ACTIVE" },
  { id: "vintage", slug: "vintage", name: "Vintage", description: "Hoài cổ, form dáng rộng rãi và chất liệu mộc mạc.", image: "/images/styles/vintage.jpg", imageUrl: "/images/styles/vintage.jpg", status: "ACTIVE" },
];

export async function getStyles() {
  try {
    const res = await fetchApi("/styles");
    if (Array.isArray(res) && res.length > 0) return res;
    if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
  } catch (err) {
    console.warn("[styleService] Backend fetch failed, using default styles:", err.message);
  }
  return DEFAULT_STYLES;
}

export async function getStyleById(id) {
  return await fetchApi(`/styles/${id}`);
}

export async function getStyleProductCounts() {
  return await fetchApi("/styles/counts");
}

export async function createStyle(input) {
  return await fetchApi("/styles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStyle(id, input) {
  return await fetchApi(`/styles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteStyle(id) {
  return await fetchApi(`/styles/${id}`, {
    method: "DELETE",
  });
}
