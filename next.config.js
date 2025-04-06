/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3'],
  
  // Disable source maps in production to avoid URL errors
  productionBrowserSourceMaps: false,
  
  // Configure experimental features for Turbopack
  experimental: {
    turbo: {
      resolveAlias: {
        '@': './src'
      }
    }
  },
  
  // Environment variables with fallbacks
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }
};

module.exports = nextConfig; 