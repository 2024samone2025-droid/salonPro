/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
};
module.exports = nextConfig;