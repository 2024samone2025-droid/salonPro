/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verify builds set NEXT_DIST_DIR=.next-verify so `npm run verify` never
  // clobbers the dev server's `.next`. Dev/prod leave it unset → `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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