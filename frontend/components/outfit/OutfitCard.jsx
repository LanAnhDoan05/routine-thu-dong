import Link from "next/link";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import { getStyleBySlug } from "@/data/styles";
import { formatPrice } from "@/lib/format";

export default function OutfitCard({ outfit }) {
  const outfitProducts = outfit.products || [];
  const total = outfit.total || outfitProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const styleInfo = getStyleBySlug(outfit.style);
  const firstProductImg = outfitProducts[0]?.images?.[0] || outfitProducts[0]?.image;
  const coverImg = outfit.coverImage || outfit.image || firstProductImg || "/images/hero/auth-hero.jpg";
  const displayName = outfit.name || outfit.title || "Routine Thu Đông Outfit";

  return (
    <Link href={`/outfit/${outfit.id}`} style={{ display: "block" }}>
      <div style={{ width: "100%", aspectRatio: "4 / 5", borderRadius: "var(--radius-md)", overflow: "hidden", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImg}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            if (firstProductImg && e.currentTarget.src !== firstProductImg) {
              e.currentTarget.src = firstProductImg;
            } else if (e.currentTarget.src !== "/images/hero/auth-hero.jpg") {
              e.currentTarget.src = "/images/hero/auth-hero.jpg";
            }
          }}
        />
      </div>
      <div style={{ paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ fontSize: 16 }}>{displayName}</h3>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
            {styleInfo?.name || outfit.style}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
          {outfitProducts.length} sản phẩm · {formatPrice(total)}
        </p>
        <span className="text-link" style={{ marginTop: 12 }}>
          View Outfit
        </span>
      </div>
    </Link>
  );
}
