/** @type {import('next').NextConfig} */
let RAW_BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'https://routine-thu-dong-henna.vercel.app')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/+$/, '');

if (RAW_BACKEND.includes('routine-thu-dong.vercel.app') && !RAW_BACKEND.includes('routine-thu-dong-henna')) {
  RAW_BACKEND = 'https://routine-thu-dong-henna.vercel.app';
}

const shouldProxy = RAW_BACKEND && /^https?:\/\//.test(RAW_BACKEND) && !RAW_BACKEND.includes('localhost') && !RAW_BACKEND.includes('127.0.0.1');

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
      },
    ],
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
