import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    banners: [
      {
        id: "img-mu194141772",
        url: "/media/img_1789390850925_czk0k9.webp",
        isPrimary: true,
        title: "ROUTINE THU ĐÔNG - Áo Khoác & Smart Look"
      },
      {
        id: "img-mu1941i8878",
        url: "/media/img_1789390851428_o26e32.webp",
        isPrimary: false,
        title: "ROUTINE THU ĐÔNG - Đầm & Nữ Tính Hiện Đại"
      },
      {
        id: "img-mu1941vy727",
        url: "/media/img_1789390851884_bodmhu.webp",
        isPrimary: false,
        title: "ROUTINE THU ĐÔNG - Áo Len & Tinh Tế"
      },
      {
        id: "img-mu1942d7206",
        url: "/media/img_1789390852476_73wk0p.webp",
        isPrimary: false,
        title: "ROUTINE THU ĐÔNG - Quần Tây & Streetstyle"
      }
    ],
    slideInterval: 3000,
    title: "THU ĐÔNG, ĐỊNH HÌNH PHONG CÁCH",
    subtitle: "Khám phá những thiết kế thời trang hiện đại, tinh tế và linh hoạt cho phong cách mỗi ngày.",
    exploreLink: "/category/new-arrivals",
    outfitLink: "/smart-outfit"
  };

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
