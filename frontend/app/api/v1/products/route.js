import { NextResponse } from 'next/server';
import products from '@/data/productsFallback.json';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const style = searchParams.get('style');
  const gender = searchParams.get('gender');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  let filtered = [...products];

  if (category) {
    const catLower = category.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.categoryId && p.categoryId.toLowerCase() === catLower) ||
        (p.categorySlug && p.categorySlug.toLowerCase() === catLower) ||
        (p.category && (p.category.slug === catLower || p.category.id === catLower))
    );
  }

  if (style) {
    const styleLower = style.toLowerCase();
    filtered = filtered.filter((p) => {
      const styles = Array.isArray(p.styles) ? p.styles : Array.isArray(p.style) ? p.style : [p.style].filter(Boolean);
      return styles.some((s) => String(s).toLowerCase().includes(styleLower));
    });
  }

  if (gender) {
    const genderLower = gender.toLowerCase();
    filtered = filtered.filter((p) => p.gender && p.gender.toLowerCase() === genderLower);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return NextResponse.json(
    {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
      },
    }
  );
}
