import { NextResponse } from 'next/server';
import products from '@/data/productsFallback.json';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: 'Missing product ID' }, { status: 400 });
  }

  const cleanId = String(id).toLowerCase();
  const product = products.find(
    (p) => String(p.id).toLowerCase() === cleanId || String(p.slug || '').toLowerCase() === cleanId
  );

  if (!product) {
    return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
