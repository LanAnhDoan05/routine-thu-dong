/** @type {import('next').NextConfig} */
const isVercel = !!process.env.VERCEL;
const isProduction = process.env.NODE_ENV === 'production';
const RAW_BACKEND = (process.env.NEXT_PUBLIC_API_URL || '')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/+$/, '');

const shouldProxy = !isVercel && RAW_BACKEND && /^https?:\/\//.test(RAW_BACKEND) && !RAW_BACKEND.includes('localhost');

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (shouldProxy) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${RAW_BACKEND}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
