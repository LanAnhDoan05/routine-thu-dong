import { NextResponse } from 'next/server';
import categories from '@/data/categoriesFallback.json';

export async function GET() {
  return NextResponse.json(categories, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
