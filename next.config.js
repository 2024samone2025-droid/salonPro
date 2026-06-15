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
  async headers() {
    return [
      {
        // Never send the token in a Referer header from the accept-invite page.
        source: "/accept-invite",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};
module.exports = nextConfig;