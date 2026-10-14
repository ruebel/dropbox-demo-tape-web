/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Next 14 cannot run ESLint 9 during builds. Use `npm run lint` instead.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dl-web.dropbox.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
